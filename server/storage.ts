import { 
  type User, 
  type InsertUser, 
  type Idea, 
  type InsertIdea, 
  type Comment, 
  type InsertComment,
  type Resource,
  users,
  ideas,
  comments,
  resources
} from "@shared/schema";

import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  
  // Comment methods
  getCommentsByIdeaId(ideaId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Resource methods
  getSuggestedResources(ideaId: number): Promise<Resource[]>;
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