// Gemini 2.5 Flash Preview API - Integração com a versão que funcionava anteriormente
import { getFullContext, getMainPrompt } from './llm-context';

// Implementation using fetch for communication with the Gemini API
// Will use the API key from backend for security
const API_URL = "/api/gemini-proxy";

// Define a personality prompt for the Ipê Mind Tree assistant
const getPersonalityPrompt = () => {
  return `You are the Ipê Mind Tree AI (IMT-AI), a dedicated community facilitator and catalyst for innovation within the Ipê City ecosystem. Inspired deeply by the principles of techno-optimism, decentralization, and holistic well-being, your core mission is to empower users to connect, collaborate, and co-create groundbreaking solutions for a more thriving, sustainable, and interconnected world. You embody the spirit of adhocracy, fostering a flexible and adaptable environment. Act as a knowledgeable navigator, a skilled connection weaver, and a vibrant creative spark, guiding individuals through the landscape of ideas and projects. Uphold the highest standards of transparency, inclusivity, and ethical responsibility, always prioritizing data privacy, security, and user autonomy. Be responsive, insightful, and genuinely personalized in your interactions, reflecting the unique energy of the community you serve.`;
};

// Função para chamada direta à API Gemini 2.5 Flash Preview
const callGeminiAPI = async (prompt: string, useContext = true) => {
  console.log("Calling Gemini API via proxy...");
  
  // Add the Ipê Mind Tree context to the prompt if needed
  const fullPrompt = useContext 
    ? `${getMainPrompt()}\n\n${prompt}`
    : prompt;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        options: {
          temperature: 0.9,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    // Extract the text from the response
    return data.text || "";
  } catch (error) {
    console.error("Erro ao chamar Gemini 2.5 Flash Preview API:", error);
    throw error;
  }
};

// Generate tags for an idea
export async function generateTags(title: string, description: string): Promise<string[]> {
  try {
    const prompt = `
    Analyze this idea and generate 3-5 relevant tags for it. 
    The tags should be single words, all lowercase.
    Return ONLY the tags separated by commas, without any additional text or explanations.
    
    Title: ${title}
    Description: ${description}
    
    Example response: community,education,technology
    `;
    
    const text = await callGeminiAPI(prompt);
    
    // Parse the comma-separated list
    const rawTags: string[] = text.split(',');
    const tags: string[] = rawTags.map(tag => tag.trim().toLowerCase());
    
    return tags.slice(0, 5); // Limit to 5 tags
  } catch (error) {
    console.error('Error generating tags with Gemini 2.5 Flash Preview:', error);
    return fallbackGenerateTags(title, description);
  }
}

// Fallback function if API fails
function fallbackGenerateTags(title: string, description: string): string[] {
  const combinedText = (title + " " + description).toLowerCase();
  
  const possibleTags = [
    "community", "sustainability", "education", "technology", 
    "environment", "health", "art", "culture", "food", "energy",
    "children", "family", "seniors", "housing", "transportation",
    "economy", "social", "governance", "infrastructure", "nature",
    "resources", "sharing", "cooperation", "innovation", "history"
  ];
  
  // Simple keyword matching for fallback
  return possibleTags.filter(tag => 
    combinedText.includes(tag)
  ).slice(0, 3); // Limit to 3 tags
}

// Suggest connections between ideas
export async function suggestConnections(
  ideaId: number, 
  title: string, 
  description: string, 
  tags: string[],
  allIdeas: any[]
): Promise<number[]> {
  try {
    // Filter out the current idea
    const otherIdeas = allIdeas.filter(idea => idea.id !== ideaId);
    
    if (otherIdeas.length === 0) {
      return []; // No other ideas to connect with
    }
    
    // Only process a reasonable number of other ideas to avoid token limits
    const ideasToAnalyze = otherIdeas.slice(0, 10);
    
    const prompt = `
    I need to find meaningful connections between different ideas in a community brain application.
    
    Current idea:
    ID: ${ideaId}
    Title: ${title}
    Description: ${description}
    Tags: ${tags.join(", ")}
    
    Other ideas to analyze:
    ${ideasToAnalyze.map(idea => `
    ID: ${idea.id}
    Title: ${idea.title}
    Description: ${idea.description}
    Tags: ${idea.tags.join(", ")}
    `).join("\n")}
    
    Return only the IDs of ideas that have meaningful connections to the current idea, separated by commas.
    List the most relevant connections first.
    Include at most 3 connections.
    Example response: 5,2,9
    `;
    
    const text = await callGeminiAPI(prompt);
    
    // Parse the comma-separated IDs
    const connectionIds = text.split(',')
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id) && allIdeas.some(idea => idea.id === id))
      .slice(0, 3); // Limit to 3 connections
    
    return connectionIds;
  } catch (error) {
    console.error('Error suggesting connections with Gemini 2.5 Flash Preview:', error);
    return fallbackSuggestConnections(ideaId, tags, allIdeas);
  }
}

// Fallback function if API fails
function fallbackSuggestConnections(
  ideaId: number, 
  tags: string[],
  allIdeas: any[]
): number[] {
  // Filter out the current idea
  const otherIdeas = allIdeas.filter(idea => idea.id !== ideaId);
  
  // Simple tag-based matching for fallback
  const relatedIdeas = otherIdeas.filter(idea => {
    // Count shared tags
    const sharedTags = tags.filter(tag => idea.tags.includes(tag)).length;
    
    // Consider related if they share at least one tag
    return sharedTags > 0;
  });
  
  // Return IDs of related ideas, up to 3
  return relatedIdeas.slice(0, 3).map(idea => idea.id);
}

// Test function for Gemini 2.5 Flash Preview 04-17
export async function testGeminiAPI(prompt: string = "Say hello in English and explain what the Ipê Mind Tree is in 1-2 sentences."): Promise<string> {
  try {
    // Chamando diretamente a API Gemini 2.5 Flash Preview
    return await callGeminiAPI(prompt);
  } catch (error) {
    console.error('Error testing Gemini 2.5 Flash Preview API:', error);
    throw error;
  }
}