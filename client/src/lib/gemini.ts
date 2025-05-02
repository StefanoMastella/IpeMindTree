// Flash API 2.0 - Uma alternativa para integração com APIs de IA

// Abordagem alternativa em vez de usar o SDK do Google Generative AI
// Esta implementação usa fetch diretamente para maior controle
const API_KEY = "AIzaSyDxRa75OXd4V9pmk-2aWuIbz0t7_nm0ihY";
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

// Função alternativa para chamada direta à API
const callGeminiFlashAPI = async (prompt: string) => {
  console.log("Chamando Gemini Flash API 2.0...");
  
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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
          temperature: 0.9,
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
    console.error("Erro ao chamar Gemini Flash API:", error);
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
    
    const text = await callGeminiFlashAPI(prompt);
    
    // Parse the comma-separated list
    const tags = text.split(',').map(tag => tag.trim().toLowerCase());
    
    return tags.slice(0, 5); // Limit to 5 tags
  } catch (error) {
    console.error('Error generating tags with Gemini Flash:', error);
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
    
    const text = await callGeminiFlashAPI(prompt);
    
    // Parse the comma-separated IDs
    const connectionIds = text.split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id) && allIdeas.some(idea => idea.id === id))
      .slice(0, 3); // Limit to 3 connections
    
    return connectionIds;
  } catch (error) {
    console.error('Error suggesting connections with Gemini Flash:', error);
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

// Test function
export async function testGeminiAPI(prompt: string = "Say hello in Portuguese and explain what the IMT (Ipê Mind Totem) is in 1-2 sentences."): Promise<string> {
  try {
    // Chamando diretamente a API Flash 2.0
    return await callGeminiFlashAPI(prompt);
  } catch (error) {
    console.error('Error testing Gemini Flash API:', error);
    throw error;
  }
}