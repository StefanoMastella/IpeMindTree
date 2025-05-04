import { storage } from "../storage";
import { getFullContext } from "../../client/src/lib/llm-context";
import { Idea } from "@shared/schema";
import fetch from "node-fetch";

// URL da API Gemini
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

export class RagService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Obtém o contexto atual das ideias armazenadas
   * Formata todas as ideias para que sejam facilmente compreendidas pelo modelo LLM
   */
  async getIdeasContext(): Promise<string> {
    try {
      const ideas = await storage.getAllIdeas();
      
      if (!ideas || ideas.length === 0) {
        return "Não há ideias cadastradas no sistema ainda.";
      }
      
      let context = "Ideias armazenadas na Ipê Mind Tree:\n\n";
      
      ideas.forEach((idea: Idea, index: number) => {
        context += `Ideia #${idea.id}: "${idea.title}"\n`;
        context += `Descrição: ${idea.description}\n`;
        context += `Tags: ${Array.isArray(idea.tags) ? idea.tags.join(", ") : idea.tags}\n`;
        context += `Autor: ${idea.author}\n`;
        context += `Data: ${new Date(idea.createdAt).toLocaleDateString("pt-BR")}\n`;
        
        // Adiciona uma linha em branco entre as ideias, exceto a última
        if (index < ideas.length - 1) {
          context += "\n";
        }
      });
      
      return context;
    } catch (error) {
      console.error("Erro ao obter contexto das ideias:", error);
      return "Não foi possível obter o contexto atual das ideias.";
    }
  }

  /**
   * Método principal para consultar o RAG com uma pergunta do usuário
   * Inclui o contexto da aplicação e das ideias armazenadas
   */
  async queryRag(userQuestion: string): Promise<string> {
    try {
      // Obter o contexto base da aplicação e o contexto atual das ideias
      const baseContext = getFullContext();
      const ideasContext = await this.getIdeasContext();
      
      // Criar o prompt completo para o modelo
      const fullPrompt = `
${baseContext}

${ideasContext}

Pergunta do usuário: ${userQuestion}

Responda de forma concisa e útil. Se a pergunta envolver ideias específicas, mencione-as pelo nome/número.
Se a pergunta não estiver relacionada às ideias ou à Ipê Mind Tree, explique gentilmente que você está 
focado em ajudar com questões relacionadas às ideias e ao projeto Ipê Mind Tree.
`;
      
      console.log("Chamando Gemini API...");
      
      const response = await fetch(`${API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extrair o texto gerado da resposta
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Erro ao chamar API Gemini:", error);
      return "Desculpe, não consegui processar sua pergunta no momento. Por favor, tente novamente mais tarde.";
    }
  }

  /**
   * Obter um resumo de uma ideia específica
   */
  async getIdeaSummary(ideaId: number): Promise<string> {
    try {
      const idea = await storage.getIdea(ideaId);
      
      if (!idea) {
        return "Ideia não encontrada.";
      }
      
      const prompt = `
Resuma a seguinte ideia de forma concisa:

Ideia #${idea.id}: "${idea.title}"
Descrição: ${idea.description}
Tags: ${Array.isArray(idea.tags) ? idea.tags.join(", ") : idea.tags}
Autor: ${idea.author}
Data: ${new Date(idea.createdAt).toLocaleDateString("pt-BR")}

Forneça um resumo curto e atraente desta ideia em 2-3 frases.
`;
      
      const response = await fetch(`${API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Erro ao gerar resumo da ideia:", error);
      return "Não foi possível gerar um resumo para esta ideia.";
    }
  }

  /**
   * Listar ideias recentes com resumos gerados por IA
   */
  async getRecentIdeasWithSummaries(limit: number = 5): Promise<any[]> {
    try {
      const ideas = await storage.getAllIdeas();
      
      // Ordenar por data de criação (mais recentes primeiro) e limitar
      const recentIdeas = [...ideas]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      // Para cada ideia, gerar um resumo curto
      const ideasWithSummaries = await Promise.all(
        recentIdeas.map(async (idea) => {
          const summary = await this.getIdeaSummary(idea.id);
          return {
            id: idea.id,
            title: idea.title,
            summary,
            tags: idea.tags
          };
        })
      );
      
      return ideasWithSummaries;
    } catch (error) {
      console.error("Erro ao obter ideias recentes com resumos:", error);
      return [];
    }
  }
}

// Singleton para uso em toda a aplicação
const API_KEY = process.env.GEMINI_API_KEY || "";
export const ragService = new RagService(API_KEY);