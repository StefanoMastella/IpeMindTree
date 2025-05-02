import { 
  type User, 
  type InsertUser, 
  type Idea, 
  type InsertIdea, 
  type Comment, 
  type InsertComment,
  type Resource
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ideas: Map<number, Idea>;
  private comments: Map<number, Comment>;
  private resources: Map<number, Resource>;
  private currentUserId: number;
  private currentIdeaId: number;
  private currentCommentId: number;
  private currentResourceId: number;

  constructor() {
    this.users = new Map();
    this.ideas = new Map();
    this.comments = new Map();
    this.resources = new Map();
    this.currentUserId = 1;
    this.currentIdeaId = 1;
    this.currentCommentId = 1;
    this.currentResourceId = 1;
    
    // Seed some initial data for demonstration
    this.seedInitialData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Idea methods
  async getAllIdeas(): Promise<Idea[]> {
    return Array.from(this.ideas.values());
  }
  
  async getIdea(id: number): Promise<Idea | undefined> {
    return this.ideas.get(id);
  }
  
  async createIdea(insertIdea: InsertIdea): Promise<Idea> {
    const id = this.currentIdeaId++;
    const now = new Date().toISOString();
    
    const idea: Idea = {
      ...insertIdea,
      id,
      createdAt: now,
      connections: []
    };
    
    this.ideas.set(id, idea);
    return idea;
  }
  
  async updateIdeaConnections(id: number, connectionIds: number[]): Promise<Idea> {
    const idea = this.ideas.get(id);
    if (!idea) {
      throw new Error(`Idea with ID ${id} not found`);
    }
    
    // Filter out any invalid connection IDs
    const validConnectionIds = connectionIds.filter(connId => 
      connId !== id && this.ideas.has(connId)
    );
    
    // Update the idea's connections
    idea.connections = Array.from(new Set([...idea.connections, ...validConnectionIds]));
    this.ideas.set(id, idea);
    
    // Update the connected ideas to also reference this idea (bi-directional)
    validConnectionIds.forEach(connId => {
      const connectedIdea = this.ideas.get(connId);
      if (connectedIdea && !connectedIdea.connections.includes(id)) {
        connectedIdea.connections.push(id);
        this.ideas.set(connId, connectedIdea);
      }
    });
    
    return idea;
  }
  
  async getConnectedIdeas(id: number): Promise<any[]> {
    const idea = this.ideas.get(id);
    if (!idea) {
      throw new Error(`Idea with ID ${id} not found`);
    }
    
    // Get all connected ideas and add a connection reason
    return Promise.all(idea.connections.map(async (connId) => {
      const connectedIdea = await this.getIdea(connId);
      if (!connectedIdea) return null;
      
      // Simple algorithm to determine connection reason based on shared tags
      const sharedTags = idea.tags.filter(tag => connectedIdea.tags.includes(tag));
      let connectionReason = "Related idea";
      
      if (sharedTags.length > 0) {
        connectionReason = `Shares tags: ${sharedTags.join(", ")}`;
      }
      
      return {
        ...connectedIdea,
        connectionReason
      };
    })).then(results => results.filter(Boolean));
  }
  
  // Comment methods
  async getCommentsByIdeaId(ideaId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.ideaId === ideaId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date().toISOString();
    
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: now
    };
    
    this.comments.set(id, comment);
    return comment;
  }
  
  // Resource methods
  async getSuggestedResources(ideaId: number): Promise<Resource[]> {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      throw new Error(`Idea with ID ${ideaId} not found`);
    }
    
    // Generate mock resources based on the idea's tags
    const mockResources: Resource[] = [];
    
    // Simple resource mapping based on tags
    const resourceMappings: Record<string, any[]> = {
      "community": [
        { title: "Community Building Handbook", description: "Guide to strengthening community bonds" },
        { title: "Local Volunteer Groups", description: "List of active volunteer organizations" }
      ],
      "sustainability": [
        { title: "Sustainable Living Guide", description: "Practical tips for environmentally-friendly living" },
        { title: "Local Recycling Centers", description: "Map of recycling facilities in the area" }
      ],
      "education": [
        { title: "Free Online Courses", description: "Collection of educational resources" },
        { title: "Teaching Methodologies", description: "Effective approaches to knowledge sharing" }
      ],
      "food": [
        { title: "Urban Garden Planning", description: "How to start a productive garden in limited space" },
        { title: "Local Seed Suppliers", description: "Where to get native and adapted plant varieties" }
      ],
      "technology": [
        { title: "Open Source Tools", description: "Free software for community projects" },
        { title: "Digital Literacy Resources", description: "Help community members develop tech skills" }
      ]
    };
    
    // Generate resources based on idea tags
    idea.tags.forEach(tag => {
      if (resourceMappings[tag]) {
        resourceMappings[tag].forEach(resource => {
          const id = this.currentResourceId++;
          mockResources.push({
            id,
            title: resource.title,
            description: resource.description,
            url: `https://example.com/resources/${id}`,
            type: "article"
          });
        });
      }
    });
    
    // Return up to 3 resources
    return mockResources.slice(0, 3);
  }
  
  private seedInitialData() {
    // Seed users
    this.createUser({ username: "maria", password: "password123" });
    this.createUser({ username: "joao", password: "password123" });
    
    // Seed some initial ideas
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
    
    seedIdeas.forEach(async (ideaData) => {
      await this.createIdea(ideaData as InsertIdea);
    });
    
    // Add some connections
    this.updateIdeaConnections(1, [2]);
    this.updateIdeaConnections(2, [3]);
    this.updateIdeaConnections(3, [1]);
    
    // Seed some comments
    this.createComment({
      ideaId: 1,
      author: "João Pereira",
      content: "I love this idea! I have some experience with urban gardening and would be happy to help get this started."
    });
    
    this.createComment({
      ideaId: 1,
      author: "Lucia Martins",
      content: "Has anyone checked if there's vacant land available in the community for this purpose? I think we should start mapping potential locations."
    });
  }
}

export const storage = new MemStorage();
