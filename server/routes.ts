import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { setupAuthRoutes } from "./auth";
import { callGeminiAPI } from "./llm-service";
import { registerDatabaseRoutes } from "./routes/database-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuthRoutes(app);
  
  // Set up database viewer routes
  registerDatabaseRoutes(app);
  
  // API routes
  // Prefix all routes with /api
  
  // Get all ideas
  app.get("/api/ideas", async (req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT * FROM ideas ORDER BY created_at DESC");
      const ideas = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.content || "",
        author: "User",
        createdAt: row.created_at,
        tags: [],
        connections: []
      }));
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ message: "Failed to fetch ideas" });
    }
  });

  // Create a new idea
  app.post("/api/ideas", async (req: Request, res: Response) => {
    try {
      const { title, description, tags, author } = req.body;
      
      const result = await pool.query(
        "INSERT INTO ideas (title, content, created_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *",
        [title, description]
      );
      
      res.status(201).json({
        id: result.rows[0].id,
        title: result.rows[0].title,
        description: result.rows[0].content,
        author: author || "Anonymous",
        createdAt: result.rows[0].created_at,
        tags: tags || []
      });
    } catch (error) {
      console.error("Error creating idea:", error);
      res.status(500).json({ message: "Failed to create idea" });
    }
  });

  // Get idea by ID
  app.get("/api/ideas/:id", async (req: Request, res: Response) => {
    try {
      const ideaId = parseInt(req.params.id);
      const result = await pool.query("SELECT * FROM ideas WHERE id = $1", [ideaId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      const idea = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        description: result.rows[0].content || "",
        author: "User",
        createdAt: result.rows[0].created_at,
        tags: [],
        connections: []
      };
      
      res.json(idea);
    } catch (error) {
      console.error("Error fetching idea:", error);
      res.status(500).json({ message: "Failed to fetch idea" });
    }
  });

  // Get comments for an idea
  app.get("/api/ideas/:id/comments", async (req: Request, res: Response) => {
    try {
      const ideaId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM comments WHERE idea_id = $1 ORDER BY created_at DESC",
        [ideaId]
      );
      
      const comments = result.rows.map(row => ({
        id: row.id,
        ideaId: row.idea_id,
        content: row.content,
        author: "User",
        createdAt: row.created_at
      }));
      
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add a comment to an idea
  app.post("/api/ideas/:id/comments", async (req: Request, res: Response) => {
    try {
      const ideaId = parseInt(req.params.id);
      const { content, author } = req.body;
      
      const result = await pool.query(
        "INSERT INTO comments (idea_id, content, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *",
        [ideaId, content]
      );
      
      res.status(201).json({
        id: result.rows[0].id,
        ideaId: result.rows[0].idea_id,
        content: result.rows[0].content,
        author: author || "Anonymous",
        createdAt: result.rows[0].created_at
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Create User API (simplified, authentication handled in auth.ts)
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser({ username, password });
      
      // Don't return password
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Chat API endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      console.log("Received chat message:", message);
      
      const response = await callGeminiAPI(message);
      console.log("Generated chat response");
      
      res.json({ 
        id: Date.now().toString(),
        content: response, 
        role: "assistant",
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error in chat API:", error);
      res.status(500).json({ 
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
