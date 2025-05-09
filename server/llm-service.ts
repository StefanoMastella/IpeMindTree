// This file now uses OpenAI instead of Gemini
import { openaiService } from './services/openai-service';

/**
 * Function to call the LLM API to answer questions
 * Includes the application context and stored ideas
 * Now using OpenAI instead of Gemini
 */
export async function callGeminiAPI(userQuestion: string): Promise<string> {
  // Note: we keep the function name for backward compatibility
  return openaiService.queryRag(userQuestion);
}