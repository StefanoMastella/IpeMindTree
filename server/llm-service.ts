// Este arquivo agora apenas re-exporta a funcionalidade do serviço RAG modularizado
import { ragService } from './services/rag-service';

/**
 * Função para chamar a API Gemini para responder perguntas
 * Inclui o contexto da aplicação e das ideias armazenadas
 */
export async function callGeminiAPI(userQuestion: string): Promise<string> {
  return ragService.queryRag(userQuestion);
}