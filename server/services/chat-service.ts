import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { ragService } from './rag-service';
import { ChatMessage, ChatSession, InsertChatMessage, InsertChatSession } from '@shared/schema';

/**
 * Service to manage chat sessions and messages
 */
export class ChatService {
  // Default initial message for new chat sessions
  private readonly DEFAULT_GREETING = "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?";
  
  /**
   * Creates a new chat session
   * @param userId optional user ID to associate with the session
   * @param title optional title for the session
   */
  async createSession(userId?: number, title?: string): Promise<ChatSession> {
    const sessionId = nanoid();
    
    const session: InsertChatSession = {
      session_id: sessionId,
      title: title || 'New Chat',
      user_id: userId
    };
    
    const createdSession = await storage.createChatSession(session);
    
    // Add initial greeting message
    await this.addAssistantMessage(sessionId, this.DEFAULT_GREETING);
    
    return createdSession;
  }
  
  /**
   * Gets an existing chat session by ID
   * @param sessionId the session ID
   */
  async getSession(sessionId: string): Promise<ChatSession | undefined> {
    return await storage.getChatSession(sessionId);
  }
  
  /**
   * Gets all chat sessions for a user
   * If userId is not provided, returns all sessions without a user
   * @param userId optional user ID
   */
  async getAllSessions(userId?: number): Promise<ChatSession[]> {
    return await storage.getAllChatSessions(userId);
  }
  
  /**
   * Updates the title of a chat session
   * @param sessionId the session ID
   * @param title the new title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    return await storage.updateChatSessionTitle(sessionId, title);
  }
  
  /**
   * Adds a user message to a chat session and generates an AI response
   * @param sessionId the session ID
   * @param userMessage the user's message
   */
  async processUserMessage(sessionId: string, userMessage: string): Promise<{ userMessage: ChatMessage, aiResponse: ChatMessage }> {
    // Add user message to the session
    const savedUserMessage = await this.addUserMessage(sessionId, userMessage);
    
    // Get chat history for context
    const chatHistory = await storage.getChatMessages(sessionId);
    
    // Process with LLM service and include chat history
    const assistantResponse = await this.generateAssistantResponse(sessionId, userMessage, chatHistory);
    
    return {
      userMessage: savedUserMessage,
      aiResponse: assistantResponse
    };
  }
  
  /**
   * Adds a user message to the chat history
   * @param sessionId the session ID
   * @param content the message content
   */
  private async addUserMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const message: InsertChatMessage = {
      message_id: nanoid(),
      session_id: sessionId,
      content,
      role: 'user'
    };
    
    return await storage.addMessageToChat(message);
  }
  
  /**
   * Adds an assistant (AI) message to the chat history
   * @param sessionId the session ID
   * @param content the message content
   */
  private async addAssistantMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const message: InsertChatMessage = {
      message_id: nanoid(),
      session_id: sessionId,
      content,
      role: 'assistant'
    };
    
    return await storage.addMessageToChat(message);
  }
  
  /**
   * Generates an AI response using the RAG service and saves it to the chat history
   * @param sessionId the session ID
   * @param userMessage the user's message
   * @param chatHistory previous messages in the conversation
   */
  private async generateAssistantResponse(
    sessionId: string, 
    userMessage: string, 
    chatHistory: ChatMessage[]
  ): Promise<ChatMessage> {
    try {
      // Create a formatted chat history for context
      const formattedHistory = this.formatChatHistoryForLLM(chatHistory);
      
      // Get response from RAG service with context
      const aiResponse = await ragService.queryRagWithHistory(userMessage, formattedHistory);
      
      // Save response to chat history
      return await this.addAssistantMessage(sessionId, aiResponse);
    } catch (error) {
      console.error("Error generating assistant response:", error);
      
      // If there's an error, save a fallback response
      const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
      return await this.addAssistantMessage(sessionId, errorMessage);
    }
  }
  
  /**
   * Formats the chat history for use with the LLM
   * @param messages the chat messages to format
   */
  private formatChatHistoryForLLM(messages: ChatMessage[]): string {
    if (!messages || messages.length === 0) {
      return "";
    }
    
    let formattedHistory = "Chat History:\n";
    
    // Format each message
    messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      formattedHistory += `${role}: ${message.content}\n`;
    });
    
    return formattedHistory;
  }
  
  /**
   * Gets all messages for a chat session
   * @param sessionId the session ID
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return await storage.getChatMessages(sessionId);
  }
  
  /**
   * Deletes (soft-deletes) a chat session
   * @param sessionId the session ID
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return await storage.deleteChatSession(sessionId);
  }
}

// Singleton instance
export const chatService = new ChatService();