// This file handles AI integration for tag generation and connection suggestions
// Using OpenAI API for realistic tag generation and connection suggestions

// Shared OpenAI API client setup
const apiCall = async (prompt: string, responseFormat = "text") => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Using a more affordable model
        messages: [
          { 
            role: "system", 
            content: "You analyze ideas and provide tags and connections between them." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        ...(responseFormat === "json" && { response_format: { type: "json_object" } })
      })
    });

    if (!response.ok) {
      // Fallback to simpler tags if API fails
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return null;
  }
};

// Function to generate tags based on idea title and description
export async function generateTags(title: string, description: string): Promise<string[]> {
  const prompt = `
    Please analyze this idea and generate 3-5 relevant tags for it. 
    The tags should be single words, all lowercase.
    Return only an array of tags in JSON format.
    
    Title: ${title}
    Description: ${description}
    
    Example response: {"tags": ["community", "education", "technology"]}
  `;
  
  try {
    const result = await apiCall(prompt, "json");
    
    if (result) {
      const parsedResult = JSON.parse(result);
      return parsedResult.tags.slice(0, 5); // Limit to 5 tags max
    }
  } catch (error) {
    console.error("Error generating tags:", error);
  }
  
  // Fallback tags if API call fails
  return fallbackGenerateTags(title, description);
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

// Function to suggest connections between ideas using AI
export async function suggestConnections(
  ideaId: number, 
  title: string, 
  description: string, 
  tags: string[],
  allIdeas: any[]
): Promise<number[]> {
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
    
    Return a JSON object with an array of connected idea IDs, with the most relevant connections first.
    Include only ideas that have meaningful connections to the current idea.
    Limit to 3 most relevant connections.
    Example response format: {"connections": [5, 2, 9]}
  `;
  
  try {
    const result = await apiCall(prompt, "json");
    
    if (result) {
      const parsedResult = JSON.parse(result);
      return parsedResult.connections.slice(0, 3); // Limit to 3 connections
    }
  } catch (error) {
    console.error("Error suggesting connections:", error);
  }
  
  // Fallback to simple tag matching if API call fails
  return fallbackSuggestConnections(ideaId, tags, allIdeas);
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
