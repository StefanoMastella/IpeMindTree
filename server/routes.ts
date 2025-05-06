import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import { insertIdeaSchema, insertCommentSchema } from "@shared/schema";
import * as schema from "@shared/schema";
import { suggestConnections, generateTags } from "../client/src/lib/gemini";
import { callGeminiAPI } from "./llm-service";
import { ragService } from "./services/rag-service";
import { obsidianService } from "./services/obsidian-service";
import { notionService } from "./services/notion-service";
import { subpromptService } from "./services/subprompt-service";
import { log } from "./vite";
import { setupAuthRoutes, requireAuth } from "./auth";
import fileService, { uploadImage } from "./services/file-service";
import subpromptRoutes from "./routes/subprompt-routes";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar rotas de autenticação
  setupAuthRoutes(app);

  // Configuração do multer para uploads de arquivos
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
    },
  });
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
      console.log("Receiving data for idea creation:", req.body);
      
      // Ensure optional fields are present for validation
      const formattedData = {
        ...req.body,
        tags: req.body.tags || [],
        links: req.body.links || [],
        imageId: req.body.imageId,  // Zod schema will handle the conversion to number
      };
      
      // Additional logs for image debugging
      if (req.body.imageId) {
        console.log(`Received imageId: ${req.body.imageId} type: ${typeof req.body.imageId}`);
        console.log(`Formatted data: ${JSON.stringify(formattedData)}`);
      }
      
      console.log("Formatted data for validation:", formattedData);
      
      const parseResult = insertIdeaSchema.safeParse(formattedData);
      if (!parseResult.success) {
        console.log("Validation error:", parseResult.error.errors);
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
      
      // Create the idea in the database
      const idea = await storage.createIdea(ideaData);
      
      // If an image ID was provided, attach it to the idea
      if (ideaData.imageId) {
        try {
          console.log(`Linking image ${ideaData.imageId} to idea ${idea.id}`);
          await storage.linkImageToIdea(idea.id, ideaData.imageId, true); // true = is the main image
        } catch (error) {
          console.error("Error linking image to idea:", error);
          // Don't fail the whole process if linking the image fails
        }
      }
      
      // Generate connections to other ideas
      const allIdeas = await storage.getAllIdeas();
      
      // Simple tag-based matching for now (will use AI in future)
      const otherIdeas = allIdeas.filter(otherIdea => otherIdea.id !== idea.id);
      const relatedIdeas = otherIdeas.filter(otherIdea => {
        // Count shared tags
        const sharedTags = Array.isArray(idea.tags) ? idea.tags.filter((tag: string) => otherIdea.tags.includes(tag)).length : 0;
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
  
  // Get images for an idea
  app.get("/api/ideas/:id/images", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const images = await storage.getImagesByIdeaId(ideaId);
      console.log(`Images found for idea ${ideaId}:`, images);
      res.json(images);
    } catch (err) {
      console.error("Error getting images:", err);
      res.status(500).json({ message: "Failed to retrieve images" });
    }
  });
  
  // Delete an idea
  app.delete("/api/ideas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      // Find the idea to ensure it exists
      const idea = await storage.getIdea(id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      // Delete the idea
      await storage.deleteIdea(id);
      
      res.status(200).json({ message: `Idea ${id} successfully deleted` });
    } catch (err) {
      console.error("Error deleting idea:", err);
      res.status(500).json({ 
        message: "Failed to delete idea", 
        error: err instanceof Error ? err.message : String(err)
      });
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

  // Chat API - Allows conversing with AI about ideas
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Invalid question format. Please provide a text question." });
      }
      
      // Call the LLM service with the user's question
      const response = await callGeminiAPI(question);
      
      res.json({
        question,
        answer: response
      });
    } catch (err) {
      console.error("Error in chat API:", err);
      res.status(500).json({ 
        message: "Failed to process your question",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Telegram API - Endpoints for Telegram bot integration
  
  // Endpoint for Telegram bot RAG query
  app.post("/api/telegram/query", async (req, res) => {
    try {
      // Basic authentication check (improve in production)
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.TELEGRAM_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      const { query, userId } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid query format. Please provide a text query." 
        });
      }
      
      // Query the RAG service
      const response = await ragService.queryRag(query);
      
      res.json({ 
        success: true, 
        response,
        userId
      });
    } catch (err) {
      console.error("Error in Telegram RAG query API:", err);
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Endpoint to list recent ideas with summaries
  app.get("/api/telegram/recent-ideas", async (req, res) => {
    try {
      // Basic authentication check (improve in production)
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.TELEGRAM_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Get recent ideas with AI-generated summaries
      const recentIdeas = await ragService.getRecentIdeasWithSummaries(limit);
      
      res.json({ 
        success: true, 
        ideas: recentIdeas
      });
    } catch (err) {
      console.error("Error getting recent ideas for Telegram:", err);
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Webhook to receive Telegram updates (for future use)
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      // Basic authentication check (improve in production)
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.TELEGRAM_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      // Process the Telegram update
      const update = req.body;
      console.log("Telegram webhook update:", JSON.stringify(update));
      
      // In a future implementation, process different update types here
      
      res.sendStatus(200);
    } catch (err) {
      console.error("Error in Telegram webhook:", err);
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Images API - Endpoints to manage images
  
  // Upload image without linking to an idea
  app.post("/api/images", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Save the image to the database
      const image = await storage.createImage({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: fileService.getFileUrl(req.file.filename),
        uploadedBy: req.body.uploadedBy || 'User'
      });

      // Return the image inside an object with 'image' property
      console.log("Image saved successfully:", image);
      res.status(201).json({ image });
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({ 
        message: "Failed to upload image", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // List all images
  app.get("/api/images", async (req, res) => {
    try {
      // Using DB instance directly
      const images = await db.query.images.findMany();
      res.json(images);
    } catch (err) {
      console.error("Error listing images:", err);
      res.status(500).json({ 
        message: "Failed to list images", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Upload image for an idea
  app.post("/api/ideas/:id/images", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }

      // Check if the idea exists
      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      // Save the image to the database
      const image = await storage.createImage({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: fileService.getFileUrl(req.file.filename),
        uploadedBy: req.body.uploadedBy || 'User'
      });

      // Determine if this image will be the main image
      const isMainImage = req.body.isMainImage === 'true' || req.body.isMainImage === true;
      
      // Link the image to the idea
      const ideaImage = await storage.linkImageToIdea(ideaId, image.id, isMainImage);

      res.status(201).json({
        image,
        ideaImage
      });
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({ 
        message: "Failed to upload image", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // List images for an idea
  app.get("/api/ideas/:id/images", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      if (isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }

      // Check if the idea exists
      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      // Get images linked to this idea
      const images = await storage.getImagesByIdeaId(ideaId);

      res.json(images);
    } catch (err) {
      console.error("Error fetching images:", err);
      res.status(500).json({ 
        message: "Failed to fetch images", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Set main image for an idea
  app.put("/api/ideas/:ideaId/images/:imageId/main", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.ideaId);
      const imageId = parseInt(req.params.imageId);

      if (isNaN(ideaId) || isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      // Set this image as the main one
      await storage.setMainImage(ideaId, imageId);

      res.json({ success: true });
    } catch (err) {
      console.error("Error setting main image:", err);
      res.status(500).json({ 
        message: "Failed to set main image", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Delete an image linked to an idea
  app.delete("/api/ideas/:ideaId/images/:imageId", async (req, res) => {
    try {
      const ideaId = parseInt(req.params.ideaId);
      const imageId = parseInt(req.params.imageId);

      if (isNaN(ideaId) || isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      // Get the image
      const image = await storage.getImage(imageId);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Unlink the image from the idea
      await storage.unlinkImageFromIdea(ideaId, imageId);

      // Check if the image is linked to other ideas
      // If not, delete the physical file too
      const imagePath = image.path;
      await storage.deleteImage(imageId);
      
      // Delete the physical file
      await fileService.deleteFile(imagePath.replace('/uploads/', ''));

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting image:", err);
      res.status(500).json({ 
        message: "Failed to delete image", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Obsidian API - Endpoints to manage Obsidian mind maps
  
  // Get all Obsidian nodes
  app.get("/api/obsidian/nodes", async (req, res) => {
    try {
      const nodes = await obsidianService.getAllNodes();
      res.json(nodes);
    } catch (err) {
      console.error("Error getting Obsidian nodes:", err);
      res.status(500).json({ 
        message: "Failed to retrieve Obsidian nodes",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Get a specific Obsidian node
  app.get("/api/obsidian/nodes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid node ID" });
      }
      
      const node = await obsidianService.getNodeById(id);
      if (!node) {
        return res.status(404).json({ message: "Obsidian node not found" });
      }
      
      res.json(node);
    } catch (err) {
      console.error("Error getting Obsidian node:", err);
      res.status(500).json({ 
        message: "Failed to retrieve Obsidian node",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Get links for a specific Obsidian node
  app.get("/api/obsidian/nodes/:id/links", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid node ID" });
      }
      
      const node = await obsidianService.getNodeById(id);
      if (!node) {
        return res.status(404).json({ message: "Obsidian node not found" });
      }
      
      const links = await obsidianService.getNodeLinks(id);
      res.json(links);
    } catch (err) {
      console.error("Error getting Obsidian node links:", err);
      res.status(500).json({ 
        message: "Failed to retrieve Obsidian node links",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Get network data for visualization
  app.get("/api/obsidian/network", async (req, res) => {
    try {
      const networkData = await obsidianService.getNetworkData();
      res.json(networkData);
    } catch (err) {
      console.error("Error getting Obsidian network data:", err);
      res.status(500).json({ 
        message: "Failed to retrieve Obsidian network data",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Start Obsidian import from a URL
  app.post("/api/obsidian/import-url", async (req, res) => {
    try {
      const { url, username } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          message: "Invalid URL. Please provide a valid download URL."
        });
      }
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ 
          message: "Invalid username. Please provide a username for the import log."
        });
      }
      
      // Start the import process (which may take some time)
      // Return immediately, while the process continues in the background
      res.status(202).json({ 
        message: "Import process started", 
        url 
      });
      
      // Execute the import process in the background
      obsidianService.importFromUrl(url, username)
        .then((success: boolean) => {
          console.log(`Obsidian import from URL ${success ? 'completed successfully' : 'failed'}`);
        })
        .catch((error: Error) => {
          console.error("Error during Obsidian import from URL:", error);
        });
    } catch (err) {
      console.error("Error starting Obsidian import from URL:", err);
      res.status(500).json({ 
        message: "Failed to start Obsidian import from URL",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Import Obsidian files from provided content
  app.post("/api/obsidian/import-files", async (req, res) => {
    try {
      const { files, username } = req.body;
      
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ 
          message: "Invalid files. Please provide an array of markdown files."
        });
      }
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ 
          message: "Invalid username. Please provide a username for the import log."
        });
      }
      
      // Basic validation of files
      const validFiles = files.filter(file => 
        file && 
        typeof file.name === 'string' && 
        typeof file.content === 'string' &&
        file.name.endsWith('.md')
      );
      
      if (validFiles.length === 0) {
        return res.status(400).json({ 
          message: "No valid markdown files provided. Files must have 'name' and 'content' properties."
        });
      }
      
      // Start the import process
      const result = await obsidianService.importFromFiles(validFiles, username);
      
      if (result) {
        res.status(200).json({ 
          message: "Files imported successfully", 
          count: validFiles.length 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to import files"
        });
      }
    } catch (err) {
      console.error("Error importing Obsidian files:", err);
      res.status(500).json({ 
        message: "Error importing Obsidian files",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Get import logs
  app.get("/api/obsidian/import-logs", async (req, res) => {
    try {
      const logs = await obsidianService.getImportLogs();
      res.json(logs);
    } catch (err) {
      console.error("Error getting import logs:", err);
      res.status(500).json({ 
        message: "Failed to retrieve import logs",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Upload Obsidian files
  app.post("/api/obsidian/upload", upload.array('files'), async (req, res) => {
    try {
      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Process the received files
      const files = req.files.map((file: any) => ({
        name: file.originalname,
        content: file.buffer.toString('utf-8')
      }));
      
      // Username for import log
      const username = "user"; // In a version with authentication, use the current user's name
      
      // Import the files
      const success = await obsidianService.importFromFiles(files, username);
      
      if (success) {
        res.status(200).json({ 
          message: "Files imported successfully",
          importedFiles: files.length
        });
      } else {
        res.status(500).json({ message: "Failed to import files" });
      }
    } catch (err) {
      console.error("Error uploading Obsidian files:", err);
      res.status(500).json({ 
        message: "Failed to process uploaded files",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Notion API - Endpoints to import projects from Notion
  
  // Initialize Notion API with the provided token
  app.post("/api/notion/initialize", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid API key. Please provide a valid Notion API key." 
        });
      }
      
      // Initialize the Notion service
      notionService.initialize(apiKey);
      
      res.json({ 
        success: true, 
        message: "Notion API initialized successfully"
      });
    } catch (err) {
      console.error("Error initializing Notion API:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to initialize Notion API",
        error: err instanceof Error ? err.message : String(err) 
      });
    }
  });
  
  // Import projects from a Notion database
  app.post("/api/notion/import", async (req, res) => {
    try {
      const { databaseId, username } = req.body;
      
      if (!databaseId || typeof databaseId !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid database ID. Please provide a valid Notion database ID." 
        });
      }
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid username. Please provide a username for the import log." 
        });
      }
      
      // Execute import in the background
      res.json({ 
        success: true, 
        message: "Import started. The process will continue in the background." 
      });
      
      // Start the import process (which may take some time)
      notionService.importProjectsFromNotion(databaseId, username)
        .then(result => {
          console.log(`Notion import completed: ${result.imported} imported, ${result.skipped} skipped`);
        })
        .catch(error => {
          console.error("Error during Notion import:", error);
        });
    } catch (err) {
      console.error("Error importing from Notion:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to import from Notion",
        error: err instanceof Error ? err.message : String(err) 
      });
    }
  });
  // Rotas da API Subprompt
  app.use("/api/subprompts", subpromptRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
