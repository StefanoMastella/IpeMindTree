import { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Proxy route for OpenAI API
 * This prevents exposing the API key to the client
 * @param app Express application
 */
export function registerOpenAIProxyRoutes(app: Express) {
  app.post('/api/openai-proxy', async (req: Request, res: Response) => {
    try {
      const { prompt, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxOutputTokens || 2048,
      });
      
      // Extract the response text
      const responseText = completion.choices[0].message.content;
      
      return res.json({ text: responseText });
    } catch (error) {
      console.error('Error in OpenAI proxy route:', error);
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}