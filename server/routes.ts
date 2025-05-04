import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import { insertIdeaSchema, insertCommentSchema } from "@shared/schema";
import { suggestConnections, generateTags } from "../client/src/lib/gemini";
import { callGeminiAPI } from "./llm-service";
import { ragService } from "./services/rag-service";
import { obsidianService } from "./services/obsidian-service";
import { log } from "./vite";
import { setupAuthRoutes, requireAuth } from "./auth";

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

  // Chat API - Permite conversar com a IA sobre as ideias
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Invalid question format. Please provide a text question." });
      }
      
      // Chamar o serviço LLM com a pergunta do usuário
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

  // Telegram API - Endpoints para integração com o bot do Telegram
  
  // Endpoint para consulta RAG do bot do Telegram
  app.post("/api/telegram/query", async (req, res) => {
    try {
      // Verificação básica de autenticação (melhorar em produção)
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
      
      // Consultar o serviço RAG
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
  
  // Endpoint para listar ideias recentes com resumos
  app.get("/api/telegram/recent-ideas", async (req, res) => {
    try {
      // Verificação básica de autenticação (melhorar em produção)
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.TELEGRAM_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Obter ideias recentes com resumos gerados pela IA
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
  
  // Webhook para receber atualizações do Telegram (para uso futuro)
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      // Verificação básica de autenticação (melhorar em produção)
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.TELEGRAM_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      // Processar a atualização do Telegram
      const update = req.body;
      console.log("Telegram webhook update:", JSON.stringify(update));
      
      // Em uma implementação futura, processar aqui os diferentes tipos de atualizações
      
      res.sendStatus(200);
    } catch (err) {
      console.error("Error in Telegram webhook:", err);
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  // Obsidian API - Endpoints para gerenciar mapas mentais do Obsidian
  
  // Obter todos os nós do Obsidian
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
  
  // Obter um nó específico do Obsidian
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
  
  // Obter links de um nó específico do Obsidian
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
  
  // Obter dados de rede para visualização
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
  
  // Iniciar importação do Obsidian a partir de uma URL
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
      
      // Inicia o processo de importação (que pode ser demorado)
      // Retorna imediatamente, enquanto o processo continua em background
      res.status(202).json({ 
        message: "Import process started", 
        url 
      });
      
      // Executa o processo de importação em background
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
  
  // Importar arquivos do Obsidian a partir de conteúdo fornecido
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
      
      // Validação básica dos arquivos
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
      
      // Inicia o processo de importação
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
  
  // Obter logs de importação
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
  
  // Upload de arquivos do Obsidian
  app.post("/api/obsidian/upload", upload.array('files'), async (req, res) => {
    try {
      // Verificar se existem arquivos enviados
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Processar os arquivos recebidos
      const files = req.files.map((file: any) => ({
        name: file.originalname,
        content: file.buffer.toString('utf-8')
      }));
      
      // Nome do usuário para o log de importação
      const username = "usuário"; // Em uma versão com autenticação, usar o nome do usuário atual
      
      // Importar os arquivos
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

  const httpServer = createServer(app);
  return httpServer;
}
