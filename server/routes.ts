import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertIdeaSchema, insertCommentSchema } from "@shared/schema";
import { suggestConnections, generateTags } from "../client/src/lib/llm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ideas API
  
  // Get all ideas
  app.get("/api/ideas", async (req, res) => {
    try {
      const ideas = await storage.getAllIdeas();
      res.json(ideas);
    } catch (err) {
      console.error("Error getting ideas:", err);
      res.status(500).json({ message: "Failed to retrieve ideas" });
    }
  });
  
  // Get a specific idea
  app.get("/api/ideas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const idea = await storage.getIdea(id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      res.json(idea);
    } catch (err) {
      console.error("Error getting idea:", err);
      res.status(500).json({ message: "Failed to retrieve idea" });
    }
  });
  
  // Create a new idea
  app.post("/api/ideas", async (req, res) => {
    try {
      const parseResult = insertIdeaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid idea data", errors: parseResult.error.errors });
      }
      
      const ideaData = parseResult.data;
      
      // Generate tags if not provided
      if (!ideaData.tags || ideaData.tags.length === 0) {
        ideaData.tags = generateTags(ideaData.title, ideaData.description);
      }
      
      const idea = await storage.createIdea(ideaData);
      
      // Generate connections to other ideas (async)
      const allIdeas = await storage.getAllIdeas();
      const connectionIds = suggestConnections(
        idea.id, 
        idea.title, 
        idea.description, 
        idea.tags, 
        allIdeas
      );
      
      // Update idea with connections
      if (connectionIds.length > 0) {
        await storage.updateIdeaConnections(idea.id, connectionIds);
      }
      
      res.status(201).json(idea);
    } catch (err) {
      console.error("Error creating idea:", err);
      res.status(500).json({ message: "Failed to create idea" });
    }
  });
  
  // Get connections for an idea
  app.get("/api/ideas/:id/connections", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const idea = await storage.getIdea(id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      const connectedIdeas = await storage.getConnectedIdeas(id);
      res.json(connectedIdeas);
    } catch (err) {
      console.error("Error getting connections:", err);
      res.status(500).json({ message: "Failed to retrieve connections" });
    }
  });
  
  // Get suggested resources for an idea
  app.get("/api/ideas/:id/resources", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const idea = await storage.getIdea(id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      // For MVP, return some mock resources based on idea tags
      const resources = await storage.getSuggestedResources(id);
      res.json(resources);
    } catch (err) {
      console.error("Error getting resources:", err);
      res.status(500).json({ message: "Failed to retrieve resources" });
    }
  });
  
  // Comments API
  
  // Get comments for an idea
  app.get("/api/ideas/:id/comments", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const comments = await storage.getCommentsByIdeaId(ideaId);
      res.json(comments);
    } catch (err) {
      console.error("Error getting comments:", err);
      res.status(500).json({ message: "Failed to retrieve comments" });
    }
  });
  
  // Create a new comment for an idea
  app.post("/api/ideas/:id/comments", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      const parseResult = insertCommentSchema.safeParse({
        ...req.body,
        ideaId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid comment data", errors: parseResult.error.errors });
      }
      
      const comment = await storage.createComment(parseResult.data);
      res.status(201).json(comment);
    } catch (err) {
      console.error("Error creating comment:", err);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
