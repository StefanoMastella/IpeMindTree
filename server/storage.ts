import { users, type User, type InsertUser, type Idea, type ObsidianNode, type ObsidianLink, type ImportLog, type ChatSession, type ChatMessage, type InsertChatSession, type InsertChatMessage } from "@shared/schema";
import { pool } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Idea methods
  getAllIdeas(): Promise<Idea[]>;
  getIdea(id: number): Promise<Idea | undefined>;
  
  // Obsidian methods
  getAllObsidianNodes(): Promise<ObsidianNode[]>;
  getObsidianNode(id: number): Promise<ObsidianNode | undefined>;
  getObsidianNodeByPath(path: string): Promise<ObsidianNode | undefined>;
  getObsidianLinks(nodeId: number): Promise<ObsidianLink[]>;
  getImportLogs(): Promise<ImportLog[]>;
  
  // Chat methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  getAllChatSessions(userId?: number): Promise<ChatSession[]>;
  updateChatSessionTitle(sessionId: string, title: string): Promise<boolean>;
  addMessageToChat(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  deleteChatSession(sessionId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
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
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
        [insertUser.username, insertUser.password]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
  
  // Idea methods
  async getAllIdeas(): Promise<Idea[]> {
    try {
      const result = await pool.query("SELECT * FROM ideas ORDER BY created_at DESC");
      return result.rows;
    } catch (error) {
      console.error("Error fetching ideas:", error);
      return [];
    }
  }
  
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
  
  // Obsidian methods
  async getAllObsidianNodes(): Promise<ObsidianNode[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM obsidian_nodes 
        ORDER BY updated_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error("Error fetching obsidian nodes:", error);
      return [];
    }
  }
  
  async getObsidianNode(id: number): Promise<ObsidianNode | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM obsidian_nodes 
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error("Error fetching obsidian node:", error);
      return undefined;
    }
  }
  
  async getObsidianNodeByPath(path: string): Promise<ObsidianNode | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM obsidian_nodes 
        WHERE path = $1
      `, [path]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error("Error fetching obsidian node by path:", error);
      return undefined;
    }
  }
  
  async getObsidianLinks(nodeId: number): Promise<ObsidianLink[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM obsidian_links 
        WHERE source_id = $1 OR target_id = $1
      `, [nodeId]);
      
      return result.rows;
    } catch (error) {
      console.error("Error fetching obsidian links:", error);
      return [];
    }
  }
  
  async getImportLogs(): Promise<ImportLog[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM import_logs 
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error("Error fetching import logs:", error);
      return [];
    }
  }
  
  // Chat methods
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    try {
      const result = await pool.query(`
        INSERT INTO chat_sessions (session_id, title, user_id, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        session.session_id,
        session.title || 'New Chat',
        session.user_id || null,
        JSON.stringify({})
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error("Error creating chat session:", error);
      throw new Error("Failed to create chat session");
    }
  }
  
  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    try {
      const result = await pool.query(`
        SELECT * FROM chat_sessions
        WHERE session_id = $1
      `, [sessionId]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error("Error fetching chat session:", error);
      return undefined;
    }
  }
  
  async getAllChatSessions(userId?: number): Promise<ChatSession[]> {
    try {
      let query = `
        SELECT * FROM chat_sessions
        WHERE is_active = true
      `;
      
      const params: any[] = [];
      
      if (userId) {
        query += ` AND (user_id = $1 OR user_id IS NULL)`;
        params.push(userId);
      }
      
      query += ` ORDER BY updated_at DESC`;
      
      const result = await pool.query(query, params);
      
      return result.rows;
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      return [];
    }
  }
  
  async updateChatSessionTitle(sessionId: string, title: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE chat_sessions
        SET title = $1, updated_at = NOW()
        WHERE session_id = $2
      `, [title, sessionId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error updating chat session title:", error);
      return false;
    }
  }
  
  async addMessageToChat(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      // First update the session's updated_at timestamp
      await pool.query(`
        UPDATE chat_sessions
        SET updated_at = NOW()
        WHERE session_id = $1
      `, [message.session_id]);
      
      // Then insert the message
      const result = await pool.query(`
        INSERT INTO chat_messages (message_id, session_id, content, role, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        message.message_id,
        message.session_id,
        message.content,
        message.role,
        JSON.stringify({})
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error("Error adding message to chat:", error);
      throw new Error("Failed to add message to chat");
    }
  }
  
  async getChatMessages(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      let query = `
        SELECT * FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `;
      
      const params: any[] = [sessionId];
      
      if (limit) {
        query += ` LIMIT $2`;
        params.push(limit);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows;
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      return [];
    }
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    try {
      // Mark the session as inactive rather than deleting it
      const result = await pool.query(`
        UPDATE chat_sessions
        SET is_active = false
        WHERE session_id = $1
      `, [sessionId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return false;
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
