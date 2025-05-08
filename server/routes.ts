import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
