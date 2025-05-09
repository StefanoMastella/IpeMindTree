import { useState, useRef, useEffect } from "react";
import { type ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, TrashIcon, RefreshCw, MoreHorizontal, MessageSquare } from "lucide-react";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";

// Server response types
interface ChatResponse {
  id: string;
  content: string;
  session_id?: string;
  role?: string;
  timestamp?: string;
}

interface ChatSessionResponse {
  id: number;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessageResponse {
  id: number;
  message_id: string;
  session_id: string;
  content: string;
  role: string;
  created_at: string;
}

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to load an existing chat session or create a new one
  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // First look for a stored session in localStorage
      const storedSessionId = localStorage.getItem('currentChatSessionId');
      
      if (storedSessionId) {
        try {
          // Try to load the session
          const messagesResponse = await fetch(`/api/chat/sessions/${storedSessionId}/messages`);
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json() as ChatMessageResponse[];
            
            // If we got messages, set the current session and messages
            if (messagesData && messagesData.length > 0) {
              setCurrentSessionId(storedSessionId);
              
              const formattedMessages: ChatMessage[] = messagesData.map(msg => ({
                id: msg.message_id,
                content: msg.content,
                role: msg.role as "user" | "assistant",
                timestamp: new Date(msg.created_at)
              }));
              
              setLocalMessages(formattedMessages);
              setIsInitialized(true);
              return;
            }
          }
        } catch (error) {
          console.error("Error loading stored session:", error);
          // Continue to create a new session if loading failed
        }
      }
      
      // If we don't have a valid stored session, create a new one
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.status}`);
      }
      
      const session = await response.json() as ChatSessionResponse;
      setCurrentSessionId(session.session_id);
      
      // Get initial messages (should include the greeting)
      const messagesResponse = await fetch(`/api/chat/sessions/${session.session_id}/messages`);
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json() as ChatMessageResponse[];
        
        const formattedMessages: ChatMessage[] = messagesData.map(msg => ({
          id: msg.message_id,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(msg.created_at)
        }));
        
        setLocalMessages(formattedMessages);
        
        // Store the session ID in localStorage for future visits
        localStorage.setItem('currentChatSessionId', session.session_id);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast({
        title: "Error initializing chat",
        description: "Could not start a new chat session. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to local-only mode
      setLocalMessages([{
        id: nanoid(),
        content: "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?",
        role: "assistant",
        timestamp: new Date()
      }]);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send message
  const sendMessage = async (message: string) => {
    if (!message.trim() || !isInitialized) return;
    
    try {
      setIsLoading(true);

      // Add user message to local list for immediate feedback
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: message.trim(),
        role: "user",
        timestamp: new Date()
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      setInput("");
      
      // Call the chat API with the current session
      const endpoint = currentSessionId 
        ? `/api/chat/sessions/${currentSessionId}/messages`
        : '/api/chat';
      
      const payload = currentSessionId
        ? { content: message }
        : { message: message, session_id: currentSessionId };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get server response: ${response.status}`);
      }
      
      let data: ChatResponse;
      
      if (currentSessionId) {
        // New API returns both user message and AI response
        const responseData = await response.json();
        data = {
          id: responseData.aiResponse.message_id,
          content: responseData.aiResponse.content,
          session_id: currentSessionId
        };
        
        // Update session ID if it changed
        if (responseData.aiResponse.session_id && responseData.aiResponse.session_id !== currentSessionId) {
          setCurrentSessionId(responseData.aiResponse.session_id);
          localStorage.setItem('currentChatSessionId', responseData.aiResponse.session_id);
        }
      } else {
        // Legacy API format
        data = await response.json();
        
        // Update session ID if it was created by the legacy endpoint
        if (data.session_id && data.session_id !== currentSessionId) {
          setCurrentSessionId(data.session_id);
          localStorage.setItem('currentChatSessionId', data.session_id);
        }
      }
      
      // Add assistant response to local state
      const assistantMessage: ChatMessage = {
        id: data.id || nanoid(),
        content: data.content,
        role: "assistant",
        timestamp: new Date()
      };
      
      setLocalMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: "Could not get a response. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start a new chat session
  const startNewChat = async () => {
    try {
      setIsLoading(true);
      
      // Create a new chat session
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.status}`);
      }
      
      const session = await response.json() as ChatSessionResponse;
      setCurrentSessionId(session.session_id);
      
      // Get initial messages (should include the greeting)
      const messagesResponse = await fetch(`/api/chat/sessions/${session.session_id}/messages`);
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json() as ChatMessageResponse[];
        
        const formattedMessages: ChatMessage[] = messagesData.map(msg => ({
          id: msg.message_id,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(msg.created_at)
        }));
        
        setLocalMessages(formattedMessages);
        
        // Store the session ID in localStorage
        localStorage.setItem('currentChatSessionId', session.session_id);
      } else {
        // Fallback to a local greeting message
        setLocalMessages([{
          id: nanoid(),
          content: "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?",
          role: "assistant",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error starting new chat:", error);
      toast({
        title: "Error creating new chat",
        description: "Could not start a new chat session. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to local-only mode
      setLocalMessages([{
        id: nanoid(),
        content: "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?",
        role: "assistant",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear messages (only visually - doesn't delete from database)
  const clearMessages = () => {
    setLocalMessages([]);
  };

  // Function to handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Scroll down when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    initializeChat();
  }, []);

  return (
    <div className="flex flex-col h-[85vh] border border-border rounded-lg shadow-lg bg-card">
      <div className="p-3 border-b border-primary/20 bg-card text-foreground rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ipê Mind</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={startNewChat}
              disabled={isLoading}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto h-[65vh]" ref={scrollAreaRef}>
        <div className="space-y-4">
          {!isInitialized && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading chat history...</span>
            </div>
          )}
          
          {isInitialized && localMessages.length === 0 && (
            <div className="flex flex-col justify-center items-center h-full">
              <Bot className="h-12 w-12 text-primary/30 mb-4" />
              <p className="text-center text-muted-foreground">No messages yet. Start by asking a question!</p>
            </div>
          )}
          
          {isInitialized && localMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </Avatar>
                    )}
                    <div className={message.role === "user" ? "text-right" : ""}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
                        <User className="h-4 w-4" />
                      </Avatar>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] bg-secondary text-secondary-foreground">
                <CardContent className="p-3 flex items-center space-x-2">
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-primary/40 text-primary hover:text-primary-foreground hover:bg-primary/90"
            onClick={startNewChat}
            disabled={isLoading}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            New Chat
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-grow bg-background border-border"
            disabled={isLoading || !isInitialized}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || !isInitialized}
            className="bg-primary hover:bg-primary/80"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}