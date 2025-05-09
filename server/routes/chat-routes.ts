import { Express, Request, Response } from 'express';
import { chatService } from '../services/chat-service';
import { z } from 'zod';

/**
 * Register routes for chat functionality
 * @param app Express application
 */
export function registerChatRoutes(app: Express) {
  // Create new chat session
  app.post('/api/chat/sessions', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        title: z.string().optional(),
        user_id: z.number().optional()
      });
      
      const { title, user_id } = schema.parse(req.body);
      const session = await chatService.createSession(user_id, title);
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(400).json({ message: 'Failed to create chat session' });
    }
  });
  
  // Get all chat sessions (optionally filtered by user_id)
  app.get('/api/chat/sessions', async (req: Request, res: Response) => {
    try {
      const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
      const sessions = await chatService.getAllSessions(userId);
      
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      res.status(500).json({ message: 'Failed to fetch chat sessions' });
    }
  });
  
  // Get a specific chat session
  app.get('/api/chat/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await chatService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching chat session:', error);
      res.status(500).json({ message: 'Failed to fetch chat session' });
    }
  });
  
  // Update chat session title
  app.patch('/api/chat/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const schema = z.object({
        title: z.string().min(1)
      });
      
      const { title } = schema.parse(req.body);
      const success = await chatService.updateSessionTitle(sessionId, title);
      
      if (!success) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      res.json({ message: 'Chat session updated successfully' });
    } catch (error) {
      console.error('Error updating chat session:', error);
      res.status(400).json({ message: 'Failed to update chat session' });
    }
  });
  
  // Delete a chat session
  app.delete('/api/chat/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const success = await chatService.deleteSession(sessionId);
      
      if (!success) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      res.status(500).json({ message: 'Failed to delete chat session' });
    }
  });
  
  // Get all messages for a chat session
  app.get('/api/chat/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const messages = await chatService.getMessages(sessionId);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });
  
  // Add a message to a chat session and get AI response
  app.post('/api/chat/sessions/:sessionId/messages', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const schema = z.object({
        content: z.string().min(1)
      });
      
      const { content } = schema.parse(req.body);
      
      // Ensure session exists
      const session = await chatService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      
      // Process user message and get AI response
      const result = await chatService.processUserMessage(sessionId, content);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(400).json({ message: 'Failed to process chat message' });
    }
  });
  
  // Legacy endpoint for backward compatibility with existing chat UI
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string().min(1),
        session_id: z.string().optional()
      });
      
      const { message, session_id } = schema.parse(req.body);
      
      let sessionId = session_id;
      let result;
      
      // If no session ID provided, create a new session
      if (!sessionId) {
        const session = await chatService.createSession();
        sessionId = session.session_id;
        
        // Process the message with the new session
        result = await chatService.processUserMessage(sessionId, message);
      } else {
        // Use existing session
        const session = await chatService.getSession(sessionId);
        
        // If session doesn't exist, create a new one
        if (!session) {
          const newSession = await chatService.createSession();
          sessionId = newSession.session_id;
        }
        
        // Process the message
        result = await chatService.processUserMessage(sessionId, message);
      }
      
      // Return just the AI response for backward compatibility
      res.json({
        id: result.aiResponse.message_id,
        content: result.aiResponse.content,
        session_id: sessionId
      });
    } catch (error) {
      console.error('Error in legacy chat endpoint:', error);
      res.status(400).json({ message: 'Failed to process chat message' });
    }
  });
}