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
      
      // Create the complete prompt for the model with more explicit instructions
      const fullPrompt = `
${baseMainPrompt}

${selectedSubprompt ? `## IMPORTANT: You are currently operating in the ${selectedBranchName} mode.
${selectedSubprompt}

You MUST acknowledge your current sphere at the beginning of your response with: "I'm activating the ${selectedBranchName} perspective." This should be the first line of your response.
Always apply the perspective and focus areas from this sphere when responding.` : '## IMPORTANT: No specific sphere is activated. Use the main prompt as your guide.'}

${ideasContext}

${this.obsidianContext}

${chatHistory ? `## Previous conversation history:
${chatHistory}

` : ''}

User question: ${userQuestion}

Answer concisely and helpfully. If the question involves specific ideas or Obsidian documents, mention them by the name.
Use Obsidian knowledge when relevant to enrich your answers.
If the question relates to the previous conversation, use that context to provide a more relevant answer.
Prioritize the ideias, Obsidian context, and previous conversation history when answering the question. If the question is not related to these, be open to other sources of information. But avoid diverging too much from the main prompt and the selected branch.
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
      return "Sorry, I couldn't process your question at the moment. Please try again later.";
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