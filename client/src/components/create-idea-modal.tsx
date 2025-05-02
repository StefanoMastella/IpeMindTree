import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Mic, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateTags } from "@/lib/llm";

interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateIdeaModal({ isOpen, onClose }: CreateIdeaModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleGenerateTags = async () => {
    if (title || description) {
      try {
        const generatedTags = await generateTags(title, description);
        if (generatedTags && Array.isArray(generatedTags)) {
          setTags(prevTags => [...new Set([...prevTags, ...generatedTags])]);
        }
      } catch (error) {
        console.error("Error generating tags:", error);
        toast({
          title: "Error Generating Tags",
          description: "Could not generate tags automatically. You can add them manually.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Cannot Generate Tags",
        description: "Please add a title or description first.",
        variant: "destructive",
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and description for your idea.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Se não houver tags, gerar automaticamente
      let ideaTags = tags;
      if (tags.length === 0) {
        try {
          // Tentar gerar tags automaticamente
          const generatedTags = await generateTags(title, description);
          if (generatedTags && Array.isArray(generatedTags)) {
            ideaTags = generatedTags;
          } else {
            ideaTags = []; // Fallback para array vazio se a geração falhar
          }
        } catch (error) {
          console.error("Error generating tags:", error);
          ideaTags = []; // Fallback para array vazio se ocorrer erro
        }
      }
      
      // Enviar a ideia para o servidor
      await apiRequest("POST", "/api/ideas", {
        title: title.trim(),
        description: description.trim(),
        tags: ideaTags,
        author: "Current User" // Em um app real, seria o usuário logado
      });
      
      // Resetar formulário e fechar modal
      setTitle("");
      setDescription("");
      setTags([]);
      setTagInput("");
      onClose();
      
      // Invalidar query de ideias para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      
      toast({
        title: "Ideia Compartilhada com Sucesso",
        description: "Sua ideia foi adicionada à Ipê Mind Tree!",
      });
    } catch (error) {
      console.error("Failed to submit idea:", error);
      toast({
        title: "Falha ao Compartilhar Ideia",
        description: "Houve um erro ao compartilhar sua ideia. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVoiceInput = () => {
    // For MVP, we'll show a message that this feature is coming soon
    toast({
      title: "Voice Input Coming Soon",
      description: "This feature will be available in a future update.",
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <DialogTitle className="text-xl font-medium text-secondary-dark font-roboto">Add to Ipê Mind Tree</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Share your idea with the community - any kind of idea is welcome!</p>
          </div>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <form id="create-idea-form" onSubmit={handleSubmit} className="overflow-y-auto flex-grow p-6">
          <div className="mb-4">
            <label htmlFor="idea-title" className="block text-secondary-dark font-medium mb-2">Title</label>
            <Input
              id="idea-title"
              placeholder="Give your idea a clear, concise title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="idea-description" className="block text-secondary-dark font-medium mb-2">Description</label>
            <Textarea
              id="idea-description"
              placeholder="Describe your idea in detail. What is it about? Why is it important? How could it be implemented?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-secondary-dark font-medium">Tags <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary h-7"
                onClick={handleGenerateTags}
              >
                Generate tags automatically
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2 empty:hidden min-h-8">
              {tags.map((tag, index) => (
                <div 
                  key={index} 
                  className="bg-primary-light text-primary text-sm px-3 py-1 rounded-full flex items-center"
                >
                  {tag}
                  <button 
                    type="button" 
                    className="ml-2 focus:outline-none" 
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex">
              <Input
                type="text"
                placeholder="Add tags (press Enter after each tag)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="rounded-r-none"
              />
              <Button 
                type="button" 
                onClick={handleAddTag}
                className="bg-primary text-white rounded-l-none"
              >
                Add
              </Button>
            </div>
            <div className="mt-1">
              <p className="text-xs text-gray-500">Tags help connect your idea with others, but they're not required. Our AI can suggest tags or generate them for you.</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-secondary-dark font-medium mb-2">Voice Input</label>
            <Button 
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 p-3"
              onClick={handleVoiceInput}
            >
              <Mic className="h-4 w-4" />
              <span>Click to speak your idea</span>
            </Button>
          </div>
        </form>
        
        <DialogFooter className="border-t border-gray-200 p-4 flex justify-end items-center bg-gray-50">
          <Button 
            type="button"
            variant="ghost"
            onClick={onClose}
            className="mr-2"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit"
            form="create-idea-form"
            className="bg-primary text-white"
            disabled={isSubmitting}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{isSubmitting ? "Sharing..." : "Share Idea"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
