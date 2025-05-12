import { storage } from "../storage";
import { getFullContext, getMainPrompt } from "../../client/src/lib/llm-context";
import { subpromptService } from "./subprompt-service";
import { Idea } from "@shared/schema";
import fetch from "node-fetch";

// Interface para a resposta da API Gemini
interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// Gemini API URL - using gemini-1.5-flash which is a simpler model
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

export class RagService {
  private apiKey: string;
  private obsidianContext: string = '';
  private lastContextUpdate: Date = new Date(0);

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Updates the Obsidian context if necessary
   * The context is updated at most once per hour to avoid overload
   */
  private async updateObsidianContextIfNeeded() {
    const now = new Date();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (now.getTime() - this.lastContextUpdate.getTime() > oneHour) {
      try {
        // Import dynamically to avoid circular dependency
        const { obsidianService } = await import('./obsidian-service');
        this.obsidianContext = await obsidianService.getObsidianContext();
        this.lastContextUpdate = now;
        console.log('Obsidian context updated successfully');
      } catch (error) {
        console.error('Error updating Obsidian context:', error);
        // If there's an error, keep the context empty
        this.obsidianContext = '';
      }
    }
  }

  /**
   * Gets the current context of stored ideas
   * Formats all ideas so they can be easily understood by the LLM model
   */
  async getIdeasContext(): Promise<string> {
    try {
      const ideas = await storage.getAllIdeas();
      
      if (!ideas || ideas.length === 0) {
        return "There are no ideas registered in the system yet.";
      }
      
      let context = "Ideas stored in Ipê Mind Tree:\n\n";
      
      ideas.forEach((idea: Idea, index: number) => {
        context += `Idea #${idea.id}: "${idea.title}"\n`;
        context += `Content: ${idea.content || "No content available"}\n`;
        context += `Date: ${idea.created_at ? new Date(idea.created_at).toLocaleDateString("en-US") : "Unknown date"}\n`;
        
        // Add a blank line between ideas, except for the last one
        if (index < ideas.length - 1) {
          context += "\n";
        }
      });
      
      return context;
    } catch (error) {
      console.error("Error getting ideas context:", error);
      return "Could not get the current context of ideas.";
    }
  }

  /**
   * Main method to query the RAG with a user question
   * Includes the application context, stored ideas, Obsidian context, and relevant subprompt
   */
  async queryRag(userQuestion: string): Promise<string> {
    return this.queryRagWithHistory(userQuestion, "");
  }
  
  /**
   * Performs semantic search on Obsidian nodes to find relevant documents
   * @param query The user's query
   * @param limit Maximum number of results to return
   */
  async semanticSearchObsidian(query: string, limit: number = 5): Promise<string> {
    try {
      // Import obsidianService dynamically to avoid circular dependency
      const { obsidianService } = await import('./obsidian-service');
      
      // Use obsidianService's searchObsidianNodes method
      const relevantNodes = await obsidianService.searchObsidianNodes(query, limit);
      
      if (!relevantNodes || relevantNodes.length === 0) {
        return "No relevant Obsidian documents found for this query.";
      }
      
      // Format the results as context for the model
      let searchContext = `## RELEVANT OBSIDIAN DOCUMENTS FOR THIS QUERY:\n\n`;
      
      relevantNodes.forEach((node, index) => {
        searchContext += `DOCUMENT-${index + 1}: ${node.title}\n`;
        searchContext += `ID: ${node.id}, Path: ${node.path || 'N/A'}\n`;
        searchContext += `Tags: ${node.tags ? node.tags.join(', ') : 'none'}\n`;
        
        // Extract a relevant snippet (up to 300 chars)
        let content = node.content || '';
        if (content.length > 300) {
          // Find a window of text that contains the query terms when possible
          const normalizedQuery = query.toLowerCase();
          const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 3);
          
          // Try to find a position where any of the query terms appear
          let startPos = 0;
          for (const term of queryTerms) {
            const pos = content.toLowerCase().indexOf(term);
            if (pos !== -1) {
              // Start a bit before the term, but not less than 0
              startPos = Math.max(0, pos - 50);
              break;
            }
          }
          
          // Extract a snippet centered around that position
          content = (startPos > 0 ? '...' : '') + 
                    content.substring(startPos, startPos + 300) + 
                    (content.length > startPos + 300 ? '...' : '');
        }
        
        searchContext += `Content: ${content.replace(/\n/g, ' ').replace(/\s+/g, ' ')}\n\n`;
      });
      
      return searchContext;
    } catch (error) {
      console.error("Error in semantic search:", error);
      return "Error performing semantic search on Obsidian documents.";
    }
  }

  /**
   * Query the RAG with a user question and conversation history
   * @param userQuestion The current user question
   * @param chatHistory Optional formatted chat history for context
   */
  async queryRagWithHistory(userQuestion: string, chatHistory: string = ""): Promise<string> {
    try {
      // Update Obsidian context if needed
      await this.updateObsidianContextIfNeeded();
      
      // Select the most relevant subprompt for the user's question
      console.log("Selecting relevant subprompt for query...");
      const selectedSubprompt = await subpromptService.selectSubprompt(userQuestion);
      
      // Get the name of the selected branch (or empty string if none was selected)
      const selectedBranchName = selectedSubprompt 
        ? selectedSubprompt.match(/You are now providing assistance in the (.+?) domain\./)?.[1] || ""
        : "";

      // Get the base application context and current ideas context
      const baseMainPrompt = getMainPrompt();
      const ideasContext = await this.getIdeasContext();
      
      // Perform semantic search to find the most relevant Obsidian documents
      console.log("Performing semantic search on Obsidian documents...");
      const semanticSearchResults = await this.semanticSearchObsidian(userQuestion, 5);
      
      // Create the complete prompt for the model with more explicit instructions
      const fullPrompt = `
${baseMainPrompt}

${selectedSubprompt ? `## IMPORTANT: You are currently operating in the ${selectedBranchName} mode.
${selectedSubprompt}

You do not need to mention the selected branch again in your response. If the question is not related to any specific branch, you can ignore the selected branch and respond based on the general context, even outside the IMT knowledge base. But try to keep the response aligned with the IMT values and the general context of the IMT ecosystem.` : '## IMPORTANT: No specific branch is activated. Use the main prompt as your guide.'}

${ideasContext}

${semanticSearchResults}

${this.obsidianContext}

${chatHistory ? `## Previous conversation history:
${chatHistory}

` : ''}

User question: ${userQuestion}

Answer concisely and helpfully. Important:
1. For this specific question, focus on the RELEVANT OBSIDIAN DOCUMENTS section above, which contains documents semantically related to the user's query.
2. If the question relates to any Obsidian documents, mention them by ID and title (e.g., "According to DOCUMENT-2: [Title]...")
3. Use both the specifically retrieved documents AND the general Obsidian knowledge to enrich your answers.
4. When referring to people like "Rafa Castaneda" or specific documents like "ÁgorafromCanvas.md", look for this information FIRST in the RELEVANT OBSIDIAN DOCUMENTS section where semantically similar content has been retrieved.
5. If multiple documents contain relevant information, explicitly mention each one.
6. If the question relates to the previous conversation, use that context to provide a more relevant answer.
7. Prioritize the specific semantic search results first, then the general Obsidian context, then ideas, and finally previous conversation history.
`;
      
      console.log("Calling Gemini API with" + (selectedSubprompt ? " selected subprompt..." : "out subprompt..."));
      
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
      
      const data = await response.json() as GeminiResponse;
      
      // Extract the generated text from the response
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      return "I couldn't generate a proper response. Please try again with a different question.";
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      
      // Análise contextual do erro para fornecer sugestões mais úteis
      let errorMessage = "Desculpe, não consegui processar sua pergunta no momento.";
      
      // Classificar o tipo de erro
      if (error instanceof Error) {
        if (error.message.includes("status: 429")) {
          errorMessage = "O serviço de IA está temporariamente sobrecarregado. Sugestões:\n" +
            "1. Aguarde alguns segundos e tente novamente\n" +
            "2. Faça perguntas mais curtas e específicas\n" +
            "3. Tente abordar seu tema de uma maneira diferente";
        } else if (error.message.includes("status: 404")) {
          errorMessage = "O modelo de IA solicitado não está disponível neste momento. Sugestões:\n" +
            "1. Tente novamente mais tarde\n" +
            "2. Entre em contato com o administrador para verificar a configuração do modelo";
        } else if (error.message.includes("status: 400")) {
          errorMessage = "Sua pergunta pode ser muito complexa ou conter elementos que o sistema não consegue processar. Sugestões:\n" +
            "1. Simplifique sua pergunta\n" +
            "2. Divida em perguntas menores\n" +
            "3. Evite referências muito específicas que o sistema possa não conhecer";
        } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
          errorMessage = "Não foi possível conectar ao serviço de IA. Sugestões:\n" +
            "1. Verifique sua conexão com a internet\n" +
            "2. Tente novamente em alguns minutos\n" +
            "3. Se o problema persistir, o serviço pode estar temporariamente indisponível";
        }
      }
      
      // Dados do contexto atual para sugerir tópicos que funcionam
      const fallbackSuggestion = "\n\nEnquanto isso, você pode perguntar sobre:\n" +
        "- Ideias registradas na plataforma Ipê Mind Tree\n" +
        "- Como as diferentes Branches (Governança, Finanças, Educação) funcionam\n" +
        "- Sugestões para conectar ideias existentes";
        
      return `${errorMessage}${fallbackSuggestion}`;
    }
  }

  /**
   * Get a summary of a specific idea
   */
  async getIdeaSummary(ideaId: number): Promise<string> {
    try {
      const idea = await storage.getIdea(ideaId);
      
      if (!idea) {
        return "Idea not found.";
      }
      
      const prompt = `
Summarize the following idea concisely:

Idea #${idea.id}: "${idea.title}"
Content: ${idea.content || "No content available"}
Date: ${idea.created_at ? new Date(idea.created_at).toLocaleDateString("en-US") : "Unknown date"}

Provide a short and engaging summary of this idea in 2-3 sentences.
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
      
      const data = await response.json() as GeminiResponse;
      
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      return "Could not generate a summary for this idea.";
    } catch (error) {
      console.error("Error generating idea summary:", error);
      return "Could not generate a summary for this idea.";
    }
  }

  /**
   * List recent ideas with AI-generated summaries
   */
  async getRecentIdeasWithSummaries(limit: number = 5): Promise<any[]> {
    try {
      const ideas = await storage.getAllIdeas();
      
      // Sort by creation date (newest first) and limit
      const recentIdeas = [...ideas]
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);
      
      // For each idea, generate a short summary
      const ideasWithSummaries = await Promise.all(
        recentIdeas.map(async (idea) => {
          const summary = await this.getIdeaSummary(idea.id);
          return {
            id: idea.id,
            title: idea.title,
            summary
          };
        })
      );
      
      return ideasWithSummaries;
    } catch (error) {
      console.error("Error getting recent ideas with summaries:", error);
      return [];
    }
  }
}

// Singleton for use throughout the application
const API_KEY = process.env.GEMINI_API_KEY || "";
export const ragService = new RagService(API_KEY);