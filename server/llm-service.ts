import { storage } from "./storage";
import { getFullContext } from "../client/src/lib/llm-context";
import { Idea } from "@shared/schema";
import fetch from "node-fetch";

// Chave e URL da API Gemini
const API_KEY = "AIzaSyDxRa75OXd4V9pmk-2aWuIbz0t7_nm0ihY";
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

/**
 * Função para obter o contexto atual das ideias armazenadas 
 * Formata todas as ideias em um formato que pode ser facilmente compreendido pelo modelo LLM
 */
async function getIdeasContext(): Promise<string> {
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
 * Função para chamar a API Gemini para responder perguntas
 * Inclui o contexto da aplicação e das ideias armazenadas
 */
export async function callGeminiAPI(userQuestion: string): Promise<string> {
  try {
    // Obter o contexto base da aplicação e o contexto atual das ideias
    const baseContext = getFullContext();
    const ideasContext = await getIdeasContext();
    
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
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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