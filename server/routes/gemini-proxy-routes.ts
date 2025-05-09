import { Express, Request, Response } from "express";
import fetch from "node-fetch";

// Gemini API URL - using Gemini 1.0 Pro which is stable and generally available
const API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent";
const API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Proxy route for Gemini API
 * This prevents exposing the API key to the client
 * @param app Express application
 */
export function registerGeminiProxyRoutes(app: Express) {
  app.post('/api/gemini-proxy', async (req: Request, res: Response) => {
    try {
      const { prompt, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      // Configure request to Gemini API
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
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxOutputTokens || 2048,
          }
        })
      });
      
      if (!response.ok) {
        console.error(`Gemini API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: `Error from Gemini API: ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      
      // Extract the text from the response
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.json({ text: data.candidates[0].content.parts[0].text });
      }
      
      res.status(500).json({ error: 'Invalid response format from Gemini API' });
    } catch (error) {
      console.error('Error in Gemini proxy route:', error);
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}