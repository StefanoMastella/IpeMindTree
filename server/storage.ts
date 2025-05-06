import { 
  type User, 
  type InsertUser, 
  type Idea, 
  type InsertIdea, 
  type Comment, 
  type InsertComment,
  type Resource,
  type ObsidianNode, 
  type InsertObsidianNode,
  type ObsidianLink, 
  type InsertObsidianLink,
  type ImportLog, 
  type InsertImportLog,
  type Image,
  type InsertImage,
  type IdeaImage,
  type InsertIdeaImage,
  type Subprompt,
  type InsertSubprompt,
  users,
  ideas,
  comments,
  resources,
  obsidianNodes,
  obsidianLinks,
  importLogs,
  images,
  ideaImages,
  subprompts
} from "@shared/schema";

import { db } from "./db";
import { eq, and, sql, desc, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Idea methods
  getAllIdeas(): Promise<Idea[]>;
  getIdea(id: number): Promise<Idea | undefined>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  updateIdeaConnections(id: number, connectionIds: number[]): Promise<Idea>;
  getConnectedIdeas(id: number): Promise<any[]>;  // Returns ideas with connection reason
  deleteIdea(id: number): Promise<void>; // Novo método para excluir ideias
  
  // Comment methods
  getCommentsByIdeaId(ideaId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Resource methods
  getSuggestedResources(ideaId: number): Promise<Resource[]>;
  
  // Image methods
  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: number): Promise<void>;
  getImagesByIdeaId(ideaId: number): Promise<Image[]>;
  
  // Idea Image methods
  linkImageToIdea(ideaId: number, imageId: number, isMainImage?: boolean): Promise<IdeaImage>;
  unlinkImageFromIdea(ideaId: number, imageId: number): Promise<void>;
  setMainImage(ideaId: number, imageId: number): Promise<void>;
  reorderIdeaImages(ideaId: number, imageIds: number[]): Promise<void>;
  
  // Obsidian methods
  getAllObsidianNodes(): Promise<ObsidianNode[]>;
  getObsidianNode(id: number): Promise<ObsidianNode | undefined>;
  getObsidianNodeByPath(path: string): Promise<ObsidianNode | undefined>;
  createObsidianNode(node: InsertObsidianNode): Promise<ObsidianNode>;
  updateObsidianNode(id: number, node: Partial<InsertObsidianNode>): Promise<ObsidianNode>;
  deleteObsidianNode(id: number): Promise<void>;
  
  // Obsidian links methods
  getObsidianLinks(nodeId: number): Promise<ObsidianLink[]>;
  createObsidianLink(link: InsertObsidianLink): Promise<ObsidianLink>;
  deleteObsidianLink(id: number): Promise<void>;
  
  // Import logs methods
  getImportLogs(): Promise<ImportLog[]>;
  createImportLog(log: InsertImportLog): Promise<ImportLog>;
  
  // Bulk import methods
  bulkCreateObsidianNodes(nodes: InsertObsidianNode[]): Promise<ObsidianNode[]>;
  bulkCreateObsidianLinks(links: InsertObsidianLink[]): Promise<ObsidianLink[]>;
  
  // Subprompt methods
  getAllSubprompts(): Promise<Subprompt[]>;
  getSubprompt(id: number): Promise<Subprompt | undefined>;
  createSubprompt(subprompt: InsertSubprompt): Promise<Subprompt>;
  updateSubprompt(id: number, subprompt: Partial<InsertSubprompt>): Promise<Subprompt>;
  deleteSubprompt(id: number): Promise<void>;
}

// Implementação de armazenamento em banco de dados
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Idea methods
  async getAllIdeas(): Promise<Idea[]> {
    const result = await db.select().from(ideas);
    
    // Transforma os campos JSON (tags e connections) de string para array
    return result.map(idea => ({
      ...idea,
      tags: JSON.parse(idea.tags),
      connections: JSON.parse(idea.connections),
    }));
  }
  
  async getIdea(id: number): Promise<Idea | undefined> {
    const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
    
    if (!idea) return undefined;
    
    // Transforma os campos JSON (tags e connections) de string para array
    return {
      ...idea,
      tags: JSON.parse(idea.tags),
      connections: JSON.parse(idea.connections),
    };
  }
  
  async createIdea(insertIdea: InsertIdea): Promise<Idea> {
    // Transforma os arrays em strings JSON para armazenamento
    const ideaToInsert = {
      ...insertIdea,
      tags: JSON.stringify(insertIdea.tags),
      connections: '[]'
    };
    
    const [idea] = await db.insert(ideas).values(ideaToInsert).returning();
    
    // Retorna o objeto completo com os campos transformados de volta para arrays
    return {
      ...idea,
      tags: JSON.parse(idea.tags),
      connections: JSON.parse(idea.connections),
    };
  }
  
  async updateIdeaConnections(id: number, connectionIds: number[]): Promise<Idea> {
    const idea = await this.getIdea(id);
    if (!idea) {
      throw new Error(`Idea with ID ${id} not found`);
    }
    
    // Filtra IDs de conexão inválidas
    const validConnectionIds = [];
    
    for(const connId of connectionIds) {
      if (connId === id) continue;
      const connectedIdea = await this.getIdea(connId);
      if (connectedIdea) validConnectionIds.push(connId);
    }
    
    // Atualiza as conexões da ideia
    const allConnections = Array.from(new Set([...idea.connections, ...validConnectionIds]));
    const [updatedIdea] = await db
      .update(ideas)
      .set({ connections: JSON.stringify(allConnections) })
      .where(eq(ideas.id, id))
      .returning();
    
    // Adiciona a ideia atual como conexão para as ideias conectadas (bidirecional)
    for (const connId of validConnectionIds) {
      const connectedIdea = await this.getIdea(connId);
      if (connectedIdea) {
        const connections = connectedIdea.connections;
        if (!connections.includes(id)) {
          const newConnections = [...connections, id];
          await db
            .update(ideas)
            .set({ connections: JSON.stringify(newConnections) })
            .where(eq(ideas.id, connId));
        }
      }
    }
    
    // Retorna o objeto completo com os campos transformados de volta para arrays
    return {
      ...updatedIdea,
      tags: JSON.parse(updatedIdea.tags),
      connections: JSON.parse(updatedIdea.connections),
    };
  }
  
  async getConnectedIdeas(id: number): Promise<any[]> {
    const idea = await this.getIdea(id);
    if (!idea) {
      throw new Error(`Idea with ID ${id} not found`);
    }
    
    const connectedIdeas = [];
    
    // Busca todas as ideias conectadas e adiciona um motivo para a conexão
    for (const connId of idea.connections) {
      const connectedIdea = await this.getIdea(connId);
      if (!connectedIdea) continue;
      
      // Algoritmo simples para determinar o motivo da conexão com base em tags compartilhadas
      const ideaTags = idea.tags;
      const connectedTags = connectedIdea.tags;
      const sharedTags = ideaTags.filter(tag => connectedTags.includes(tag));
      
      let connectionReason = "Related idea";
      if (sharedTags.length > 0) {
        connectionReason = `Shares tags: ${sharedTags.join(", ")}`;
      }
      
      connectedIdeas.push({
        ...connectedIdea,
        connectionReason
      });
    }
    
    return connectedIdeas;
  }
  
  // Comment methods
  async getCommentsByIdeaId(ideaId: number): Promise<Comment[]> {
    const result = await db
      .select()
      .from(comments)
      .where(eq(comments.ideaId, ideaId))
      .orderBy(comments.createdAt);
    
    return result;
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
      .returning();
    
    return comment;
  }
  
  // Resource methods
  async getSuggestedResources(ideaId: number): Promise<Resource[]> {
    const idea = await this.getIdea(ideaId);
    if (!idea) {
      throw new Error(`Idea with ID ${ideaId} not found`);
    }
    
    // Gera recursos baseados nas tags da ideia
    // Implementação provisória: um conjunto de recursos predefinidos
    const mockResources = [
      {
        title: "Community Building Handbook",
        description: "Guide to strengthening community bonds", 
        url: "https://example.com/community-handbook",
        type: "article"
      },
      {
        title: "Sustainable Living Guide",
        description: "Practical tips for environmentally-friendly living",
        url: "https://example.com/sustainability-guide",
        type: "article"
      },
      {
        title: "Educational Resources Directory",
        description: "Collection of learning materials and courses",
        url: "https://example.com/education-resources",
        type: "directory"
      }
    ];
    
    // Em uma implementação futura, seria ideal armazenar recursos reais no banco de dados
    // e fazer uma consulta com base nas tags
    
    const resourcesData = mockResources.slice(0, 3);
    const resourceRecords = [];
    
    for (const resourceData of resourcesData) {
      // Verifica se o recurso já existe no banco de dados
      let [resource] = await db
        .select()
        .from(resources)
        .where(and(
          eq(resources.title, resourceData.title),
          eq(resources.url, resourceData.url)
        ));
      
      // Se não existir, cria um novo recurso
      if (!resource) {
        [resource] = await db
          .insert(resources)
          .values(resourceData)
          .returning();
      }
      
      resourceRecords.push(resource);
    }
    
    return resourceRecords;
  }
  
  // Obsidian methods
  async getAllObsidianNodes(): Promise<ObsidianNode[]> {
    return await db.select().from(obsidianNodes).orderBy(obsidianNodes.title);
  }
  
  async getObsidianNode(id: number): Promise<ObsidianNode | undefined> {
    const [node] = await db.select().from(obsidianNodes).where(eq(obsidianNodes.id, id));
    return node;
  }
  
  async getObsidianNodeByPath(path: string): Promise<ObsidianNode | undefined> {
    const [node] = await db.select().from(obsidianNodes).where(eq(obsidianNodes.path, path));
    return node;
  }
  
  async createObsidianNode(node: InsertObsidianNode): Promise<ObsidianNode> {
    const [createdNode] = await db.insert(obsidianNodes).values(node).returning();
    return createdNode;
  }
  
  async updateObsidianNode(id: number, node: Partial<InsertObsidianNode>): Promise<ObsidianNode> {
    const [updatedNode] = await db
      .update(obsidianNodes)
      .set({ ...node, updatedAt: new Date() })
      .where(eq(obsidianNodes.id, id))
      .returning();
    return updatedNode;
  }
  
  async deleteObsidianNode(id: number): Promise<void> {
    // Primeiro, remover todos os links associados a este nó
    await db
      .delete(obsidianLinks)
      .where(
        or(
          eq(obsidianLinks.sourceId, id),
          eq(obsidianLinks.targetId, id)
        )
      );
    
    // Depois, remover o nó
    await db.delete(obsidianNodes).where(eq(obsidianNodes.id, id));
  }
  
  // Obsidian links methods
  async getObsidianLinks(nodeId: number): Promise<ObsidianLink[]> {
    return await db
      .select()
      .from(obsidianLinks)
      .where(
        or(
          eq(obsidianLinks.sourceId, nodeId),
          eq(obsidianLinks.targetId, nodeId)
        )
      );
  }
  
  async createObsidianLink(link: InsertObsidianLink): Promise<ObsidianLink> {
    const [createdLink] = await db.insert(obsidianLinks).values(link).returning();
    return createdLink;
  }
  
  async deleteObsidianLink(id: number): Promise<void> {
    await db.delete(obsidianLinks).where(eq(obsidianLinks.id, id));
  }
  
  // Image methods
  async getImage(id: number): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }
  
  async createImage(insertImage: InsertImage): Promise<Image> {
    const [image] = await db.insert(images).values(insertImage).returning();
    return image;
  }
  
  async deleteImage(id: number): Promise<void> {
    // Primeiro, remover todas as associações com ideias
    await db.delete(ideaImages).where(eq(ideaImages.imageId, id));
    
    // Depois, remover a imagem
    await db.delete(images).where(eq(images.id, id));
  }
  
  async getImagesByIdeaId(ideaId: number): Promise<Image[]> {
    // Busca as relações entre ideias e imagens ordenadas pelo campo "order"
    const ideaImageRelations = await db
      .select()
      .from(ideaImages)
      .where(eq(ideaImages.ideaId, ideaId))
      .orderBy(ideaImages.order);
    
    // Se não houver relações, retorna uma lista vazia
    if (ideaImageRelations.length === 0) {
      return [];
    }
    
    // Busca as imagens baseadas nos IDs encontrados
    const imageIds = ideaImageRelations.map(relation => relation.imageId);
    const imageRecords = await Promise.all(
      imageIds.map(id => this.getImage(id))
    );
    
    // Filtra possíveis valores undefined e mantém a ordem original
    return imageRecords.filter(Boolean) as Image[];
  }
  
  // Implementação do método para excluir uma ideia
  async deleteIdea(id: number): Promise<void> {
    // 1. Primeiro, verificar se a ideia existe
    const idea = await this.getIdea(id);
    if (!idea) {
      throw new Error(`Idea with ID ${id} not found`);
    }
    
    // 2. Remover todas as relações de imagens com esta ideia
    await db.delete(ideaImages).where(eq(ideaImages.ideaId, id));
    
    // 3. Remover todos os comentários associados a esta ideia
    await db.delete(comments).where(eq(comments.ideaId, id));
    
    // 4. Remover a ideia como conexão de outras ideias
    // Obter todas as ideias que têm esta como conexão
    const allIdeas = await this.getAllIdeas();
    for (const otherIdea of allIdeas) {
      if (otherIdea.connections.includes(id)) {
        // Remover esta ideia das conexões
        const updatedConnections = otherIdea.connections.filter(connId => connId !== id);
        await db
          .update(ideas)
          .set({ connections: JSON.stringify(updatedConnections) })
          .where(eq(ideas.id, otherIdea.id));
      }
    }
    
    // 5. Finalmente, excluir a ideia
    await db.delete(ideas).where(eq(ideas.id, id));
    
    console.log(`Ideia ${id} excluída com sucesso`);
  }
  
  // Idea Image methods
  async linkImageToIdea(ideaId: number, imageId: number, isMainImage: boolean = false): Promise<IdeaImage> {
    // Verifica se a ideia existe
    const idea = await this.getIdea(ideaId);
    if (!idea) {
      throw new Error(`Idea with ID ${ideaId} not found`);
    }
    
    // Verifica se a imagem existe
    const image = await this.getImage(imageId);
    if (!image) {
      throw new Error(`Image with ID ${imageId} not found`);
    }
    
    // Verifica se a relação já existe
    const [existingRelation] = await db
      .select()
      .from(ideaImages)
      .where(and(
        eq(ideaImages.ideaId, ideaId),
        eq(ideaImages.imageId, imageId)
      ));
    
    // Se a relação já existe, apenas atualiza a flag isMainImage se necessário
    if (existingRelation) {
      if (existingRelation.isMainImage !== isMainImage) {
        // Se estamos definindo esta imagem como principal, precisamos garantir que não haja outras imagens principais
        if (isMainImage) {
          await db
            .update(ideaImages)
            .set({ isMainImage: false })
            .where(eq(ideaImages.ideaId, ideaId));
        }
        
        const [updatedRelation] = await db
          .update(ideaImages)
          .set({ isMainImage })
          .where(eq(ideaImages.id, existingRelation.id))
          .returning();
        
        return updatedRelation;
      }
      
      return existingRelation;
    }
    
    // Se estamos definindo esta nova imagem como principal, precisamos garantir que não haja outras imagens principais
    if (isMainImage) {
      await db
        .update(ideaImages)
        .set({ isMainImage: false })
        .where(eq(ideaImages.ideaId, ideaId));
    }
    
    // Obtém a maior ordem atual para a ideia
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql`COALESCE(MAX(${ideaImages.order}), -1)` })
      .from(ideaImages)
      .where(eq(ideaImages.ideaId, ideaId));
    
    // Cria a nova relação
    const [newRelation] = await db
      .insert(ideaImages)
      .values({
        ideaId,
        imageId,
        isMainImage,
        order: maxOrder + 1
      })
      .returning();
    
    return newRelation;
  }
  
  async unlinkImageFromIdea(ideaId: number, imageId: number): Promise<void> {
    // Remove a relação entre a ideia e a imagem
    await db
      .delete(ideaImages)
      .where(and(
        eq(ideaImages.ideaId, ideaId),
        eq(ideaImages.imageId, imageId)
      ));
    
    // Se a imagem que foi removida era a principal, definir outra imagem como principal
    const relations = await db
      .select()
      .from(ideaImages)
      .where(eq(ideaImages.ideaId, ideaId))
      .orderBy(ideaImages.order);
    
    if (relations.length > 0 && !relations.some(r => r.isMainImage)) {
      await db
        .update(ideaImages)
        .set({ isMainImage: true })
        .where(eq(ideaImages.id, relations[0].id));
    }
  }
  
  async setMainImage(ideaId: number, imageId: number): Promise<void> {
    // Verifica se a relação entre ideia e imagem existe
    const [relation] = await db
      .select()
      .from(ideaImages)
      .where(and(
        eq(ideaImages.ideaId, ideaId),
        eq(ideaImages.imageId, imageId)
      ));
    
    if (!relation) {
      throw new Error(`No relation found between idea ${ideaId} and image ${imageId}`);
    }
    
    // Define todas as imagens da ideia como não principais
    await db
      .update(ideaImages)
      .set({ isMainImage: false })
      .where(eq(ideaImages.ideaId, ideaId));
    
    // Define a imagem selecionada como principal
    await db
      .update(ideaImages)
      .set({ isMainImage: true })
      .where(eq(ideaImages.id, relation.id));
  }
  
  async reorderIdeaImages(ideaId: number, imageIds: number[]): Promise<void> {
    // Verifica se as relações existem
    const relations = await db
      .select()
      .from(ideaImages)
      .where(eq(ideaImages.ideaId, ideaId));
    
    const relationMap = new Map(relations.map(r => [r.imageId, r]));
    
    // Atualiza a ordem de cada imagem
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const relation = relationMap.get(imageId);
      
      if (relation) {
        await db
          .update(ideaImages)
          .set({ order: i })
          .where(eq(ideaImages.id, relation.id));
      }
    }
  }
  
  // Import logs methods
  async getImportLogs(): Promise<ImportLog[]> {
    return await db.select().from(importLogs).orderBy(desc(importLogs.importedAt));
  }
  
  async createImportLog(log: InsertImportLog): Promise<ImportLog> {
    const [createdLog] = await db.insert(importLogs).values(log).returning();
    return createdLog;
  }
  
  // Bulk import methods
  async bulkCreateObsidianNodes(nodes: InsertObsidianNode[]): Promise<ObsidianNode[]> {
    if (nodes.length === 0) return [];
    const createdNodes = await db.insert(obsidianNodes).values(nodes).returning();
    return createdNodes;
  }
  
  async bulkCreateObsidianLinks(links: InsertObsidianLink[]): Promise<ObsidianLink[]> {
    if (links.length === 0) return [];
    const createdLinks = await db.insert(obsidianLinks).values(links).returning();
    return createdLinks;
  }
  
  // Subprompt methods
  async getAllSubprompts(): Promise<Subprompt[]> {
    try {
      return await db.select().from(subprompts).orderBy(subprompts.name);
    } catch (error) {
      console.error("Error getting all subprompts:", error);
      return [];
    }
  }
  
  async getSubprompt(id: number): Promise<Subprompt | undefined> {
    try {
      const [subprompt] = await db.select().from(subprompts).where(eq(subprompts.id, id));
      return subprompt;
    } catch (error) {
      console.error(`Error getting subprompt with ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createSubprompt(insertSubprompt: InsertSubprompt): Promise<Subprompt> {
    try {
      const [subprompt] = await db.insert(subprompts).values(insertSubprompt).returning();
      return subprompt;
    } catch (error) {
      console.error("Error creating subprompt:", error);
      throw error;
    }
  }
  
  async updateSubprompt(id: number, data: Partial<InsertSubprompt>): Promise<Subprompt> {
    try {
      const [updatedSubprompt] = await db
        .update(subprompts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subprompts.id, id))
        .returning();
      
      return updatedSubprompt;
    } catch (error) {
      console.error(`Error updating subprompt with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteSubprompt(id: number): Promise<void> {
    try {
      await db.delete(subprompts).where(eq(subprompts.id, id));
    } catch (error) {
      console.error(`Error deleting subprompt with ID ${id}:`, error);
      throw error;
    }
  }
  
  // Método para inicialização de dados (usado apenas para desenvolvimento)
  async seedInitialData() {
    // Verificar se já existem usuários
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already seeded, skipping initialization");
      return;
    }
    
    console.log("Seeding initial data to database...");
    
    // Criar usuários
    await this.createUser({ username: "maria", password: "password123" });
    await this.createUser({ username: "joao", password: "password123" });
    
    // Criar ideias iniciais
    const seedIdeas = [
      {
        title: "Community Garden Project",
        description: "Creating a shared garden space where community members can grow vegetables and herbs together. This could promote sustainable food practices and strengthen community bonds.",
        tags: ["community", "sustainability", "food"],
        author: "Maria Silva"
      },
      {
        title: "Skill-sharing Workshops",
        description: "Monthly workshops where community members can teach skills to others. From basic carpentry to digital marketing, everyone has something valuable to share.",
        tags: ["education", "community", "workshop"],
        author: "Carlos Mendes"
      },
      {
        title: "Solar Power Collective",
        description: "Organizing a group purchase of solar panels to reduce costs and help community members transition to renewable energy together.",
        tags: ["energy", "sustainability", "technology"],
        author: "Paulo Freitas"
      }
    ];
    
    let idea1, idea2, idea3;
    
    for (let i = 0; i < seedIdeas.length; i++) {
      const idea = await this.createIdea(seedIdeas[i] as InsertIdea);
      if (i === 0) idea1 = idea;
      if (i === 1) idea2 = idea;
      if (i === 2) idea3 = idea;
    }
    
    // Adicionar conexões entre as ideias
    if (idea1 && idea2 && idea3) {
      await this.updateIdeaConnections(idea1.id, [idea2.id]);
      await this.updateIdeaConnections(idea2.id, [idea3.id]);
      await this.updateIdeaConnections(idea3.id, [idea1.id]);
      
      // Adicionar comentários
      await this.createComment({
        ideaId: idea1.id,
        author: "João Pereira",
        content: "I love this idea! I have some experience with urban gardening and would be happy to help get this started."
      });
      
      await this.createComment({
        ideaId: idea1.id,
        author: "Lucia Martins",
        content: "Has anyone checked if there's vacant land available in the community for this purpose? I think we should start mapping potential locations."
      });
    }
    
    console.log("Database seeded successfully");
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();