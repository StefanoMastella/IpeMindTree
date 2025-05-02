import { useState, useRef, useEffect } from "react";
import { type ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, TrashIcon, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Função para enviar mensagem
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsLoading(true);

      // Adiciona a mensagem do usuário à lista local
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: message.trim(),
        role: "user",
        timestamp: new Date()
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      setInput("");
      
      // Chama a API de chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: message })
      });
      
      if (!response.ok) {
        throw new Error(`Falha ao obter resposta do servidor: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Adiciona a resposta do assistente
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        content: data.answer,
        role: "assistant",
        timestamp: new Date()
      };
      
      setLocalMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível obter uma resposta. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Limpar mensagens
  const clearMessages = () => {
    setLocalMessages([]);
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Rolar para baixo quando novas mensagens são adicionadas
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Focar no input quando o componente é montado
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Mensagem inicial do assistente
  useEffect(() => {
    if (localMessages.length === 0) {
      setLocalMessages([
        {
          id: nanoid(),
          content: "Olá! Sou a Ipê Mind, assistente da Ipê Mind Tree. Como posso ajudar você a explorar as ideias da nossa comunidade hoje?",
          role: "assistant",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[80vh] border rounded-lg shadow-lg bg-white">
      <div className="p-4 border-b bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Ipê Mind</h2>
        </div>
        <p className="text-sm opacity-90">
          Converse com nossa IA e explore ideias da comunidade
        </p>
      </div>

      <ScrollArea className="flex-grow p-4 max-h-[60vh] overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-4">
          {localMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 bg-primary/80 text-white">
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
                      <Avatar className="h-8 w-8 bg-white text-primary">
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
              <Card className="max-w-[80%] bg-gray-100">
                <CardContent className="p-3 flex items-center space-x-2">
                  <Avatar className="h-8 w-8 bg-primary/80 text-white">
                    <Bot className="h-4 w-4" />
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">Processando...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={clearMessages}
          >
            <TrashIcon className="h-3 w-3 mr-1" />
            Limpar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setLocalMessages([
                {
                  id: nanoid(),
                  content: "Olá! Sou a Ipê Mind, assistente da Ipê Mind Tree. Como posso ajudar você a explorar as ideias da nossa comunidade hoje?",
                  role: "assistant",
                  timestamp: new Date()
                }
              ]);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reiniciar
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
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