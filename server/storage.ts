import { users, type User, type InsertUser, type Idea } from "@shared/schema";
import { pool } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllIdeas(): Promise<Idea[]>;
  getIdea(id: number): Promise<Idea | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Fetch all ideas from the database
  async getAllIdeas(): Promise<Idea[]> {
    try {
      const result = await pool.query("SELECT * FROM ideas ORDER BY created_at DESC");
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.content || "",
        author: "User",
        createdAt: row.created_at,
        tags: [],
        connections: []
      }));
    } catch (error) {
      console.error("Error fetching ideas:", error);
      return [];
    }
  }
  
  // Get a specific idea by ID
  async getIdea(id: number): Promise<Idea | undefined> {
    try {
      const result = await pool.query("SELECT * FROM ideas WHERE id = $1", [id]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return {
        id: result.rows[0].id,
        title: result.rows[0].title,
        description: result.rows[0].content || "",
        author: "User",
        createdAt: result.rows[0].created_at,
        tags: [],
        connections: []
      };
    } catch (error) {
      console.error("Error fetching idea:", error);
      return undefined;
    }
  }
}

export const storage = new MemStorage();
