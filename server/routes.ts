import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertIdeaSchema, insertCommentSchema } from "@shared/schema";
import { suggestConnections, generateTags } from "../client/src/lib/gemini";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Test Endpoint - Usando Google Gemini API em vez da OpenAI
  app.post("/api/test-gemini", async (req, res) => {
    try {
      const { prompt } = req.body;
      // Nota: Como estamos usando a Google Gemini API diretamente no cliente,
      // este endpoint está sendo mantido apenas para referência futura.
      // As chamadas à API são feitas diretamente do cliente para o serviço Gemini.
      
      res.json({ message: "Gemini API is being called directly from the client" });
    } catch (error) {
      console.error("Gemini API test error:", error);
      res.status(500).json({ 
        message: "Failed to test Gemini API", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
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
        // Use simple fallback tags for now (API will be tested separately)
        ideaData.tags = ["community", "idea", "innovation"].filter(tag => 
          (ideaData.title + ideaData.description).toLowerCase().includes(tag)
        );
        
        // In future versions, we'll use the async API call:
        // ideaData.tags = await generateTags(ideaData.title, ideaData.description);
      }
      
      const idea = await storage.createIdea(ideaData);
      
      // Generate connections to other ideas
      const allIdeas = await storage.getAllIdeas();
      
      // Simple tag-based matching for now (will use AI in future)
      const otherIdeas = allIdeas.filter(otherIdea => otherIdea.id !== idea.id);
      const relatedIdeas = otherIdeas.filter(otherIdea => {
        // Count shared tags
        const sharedTags = idea.tags.filter(tag => otherIdea.tags.includes(tag)).length;
        // Consider related if they share at least one tag
        return sharedTags > 0;
      });
      
      // Get IDs of related ideas, up to 3
      const connectionIds = relatedIdeas.slice(0, 3).map(relatedIdea => relatedIdea.id);
      
      // Update idea with connections
      if (connectionIds.length > 0) {
        await storage.updateIdeaConnections(idea.id, connectionIds);
      }
      
      // In future versions, we'll use the async API call:
      // const connectionIds = await suggestConnections(
      //   idea.id, idea.title, idea.description, idea.tags, allIdeas
      // );
      
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
