// This file now only re-exports the functionality of the modularized RAG service
import { ragService } from './services/rag-service';

/**
 * Function to call the Gemini API to answer questions
 * Includes the application context and stored ideas
 */
export async function callGeminiAPI(userQuestion: string): Promise<string> {
  return ragService.queryRag(userQuestion);
}