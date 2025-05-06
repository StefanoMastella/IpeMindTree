import { Router } from "express";
import { subpromptService } from "../services/subprompt-service";
import { storage } from "../storage";
import { insertSubpromptSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Recupera todos os subprompts
router.get("/", async (req, res) => {
  try {
    const subprompts = await storage.getAllSubprompts();
    res.json(subprompts);
  } catch (error) {
    console.error("Error getting subprompts:", error);
    res.status(500).json({ error: "Failed to get subprompts" });
  }
});

// Recupera um subprompt específico por ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const subprompt = await storage.getSubprompt(id);
    if (!subprompt) {
      return res.status(404).json({ error: "Subprompt not found" });
    }
    
    res.json(subprompt);
  } catch (error) {
    console.error(`Error getting subprompt with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to get subprompt" });
  }
});

// Cria um novo subprompt
router.post("/", async (req, res) => {
  try {
    const validatedData = insertSubpromptSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        error: "Invalid subprompt data", 
        details: validatedData.error.format() 
      });
    }
    
    const subprompt = await storage.createSubprompt(validatedData.data);
    res.status(201).json(subprompt);
  } catch (error) {
    console.error("Error creating subprompt:", error);
    res.status(500).json({ error: "Failed to create subprompt" });
  }
});

// Atualiza um subprompt existente
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const existingSubprompt = await storage.getSubprompt(id);
    if (!existingSubprompt) {
      return res.status(404).json({ error: "Subprompt not found" });
    }
    
    // Para atualizações parciais, validamos apenas os campos fornecidos
    const updateSchema = insertSubpromptSchema.partial();
    const validatedData = updateSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        error: "Invalid subprompt data", 
        details: validatedData.error.format() 
      });
    }
    
    const updatedSubprompt = await storage.updateSubprompt(id, validatedData.data);
    res.json(updatedSubprompt);
  } catch (error) {
    console.error(`Error updating subprompt with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update subprompt" });
  }
});

// Remove um subprompt
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const existingSubprompt = await storage.getSubprompt(id);
    if (!existingSubprompt) {
      return res.status(404).json({ error: "Subprompt not found" });
    }
    
    await storage.deleteSubprompt(id);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting subprompt with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete subprompt" });
  }
});

// Seleciona o subprompt mais adequado para uma consulta
router.post("/select", async (req, res) => {
  try {
    const schema = z.object({
      query: z.string().min(1)
    });
    
    const validatedData = schema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        error: "Invalid query data", 
        details: validatedData.error.format() 
      });
    }
    
    const selectedContent = await subpromptService.selectSubprompt(validatedData.data.query);
    res.json({ content: selectedContent });
  } catch (error) {
    console.error("Error selecting subprompt:", error);
    res.status(500).json({ error: "Failed to select subprompt" });
  }
});

// Inicializa subprompts a partir de documento
router.post("/seed", async (req, res) => {
  try {
    const schema = z.object({
      document: z.string().min(10)
    });
    
    const validatedData = schema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        error: "Invalid document data", 
        details: validatedData.error.format() 
      });
    }
    
    const createdCount = await subpromptService.seedSubpromptsFromDocument(validatedData.data.document);
    res.json({ created: createdCount });
  } catch (error) {
    console.error("Error seeding subprompts:", error);
    res.status(500).json({ error: "Failed to seed subprompts" });
  }
});

export default router;