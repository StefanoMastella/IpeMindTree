import { useState, useRef, useEffect } from "react";
import { type ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, TrashIcon, RefreshCw } from "lucide-react";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to send message
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsLoading(true);

      // Add user message to local list
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: message.trim(),
        role: "user",
        timestamp: new Date()
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      setInput("");
      
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get server response: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.id || nanoid(),
        content: data.content,
        role: "assistant",
        timestamp: new Date(data.timestamp) || new Date()
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
  
  // Clear messages
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

  // Initial assistant message
  useEffect(() => {
    if (localMessages.length === 0) {
      setLocalMessages([
        {
          id: nanoid(),
          content: "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?",
          role: "assistant",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  return (
    <div className="flex flex-col h-[70vh] border border-border rounded-lg shadow-lg bg-card">
      <div className="p-4 border-b border-primary/20 bg-card text-foreground rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ipê Mind</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with our AI and explore community ideas
        </p>
      </div>

      <div className="flex-grow p-4 overflow-y-auto h-[40vh]" ref={scrollAreaRef}>
        <div className="space-y-4">
          {localMessages.map((message) => (
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
        <div className="flex justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-primary/40 text-primary hover:text-primary-foreground hover:bg-primary/90"
            onClick={clearMessages}
          >
            <TrashIcon className="h-3 w-3 mr-1" />
            Clear
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-primary/40 text-primary hover:text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setLocalMessages([
                {
                  id: nanoid(),
                  content: "Hello! I'm Ipê Mind, assistant of the Ipê Mind Tree. How can I help you explore our community's ideas today?",
                  role: "assistant",
                  timestamp: new Date()
                }
              ]);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Restart
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-grow bg-background border-border"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
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