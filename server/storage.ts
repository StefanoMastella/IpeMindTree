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

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      if (result.rows.length === 0) {
        return undefined;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (result.rows.length === 0) {
        return undefined;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await pool.query(
        "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING *",
        [insertUser.username, insertUser.password, insertUser.email || null]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
  
  // Fetch all ideas from the database
  async getAllIdeas(): Promise<Idea[]> {
    try {
      const result = await pool.query("SELECT * FROM ideas ORDER BY created_at DESC");
      return result.rows;
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
      
      return result.rows[0];
    } catch (error) {
      console.error("Error fetching idea:", error);
      return undefined;
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
