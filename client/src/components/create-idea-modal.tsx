import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Mic, MessageSquare, LinkIcon, ImageIcon, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateTags } from "@/lib/llm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/ui/image-uploader";

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
  
  // Novo estado para abas, links e imagens
  const [activeTab, setActiveTab] = useState<string>("form");
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [uploadedImageId, setUploadedImageId] = useState<number | null>(null);
  
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
      const response = await apiRequest("POST", "/api/ideas", {
        title: title.trim(),
        description: description.trim(),
        tags: ideaTags,
        links: links,
        imageId: uploadedImageId, // ID da imagem carregada (se houver)
        author: "Current User" // Em um app real, seria o usuário logado
      });
      
      // Obter a ideia criada
      const ideaData = await response.json();
      
      // Limpar o localStorage após sucesso
      localStorage.removeItem('tempUploadedImageId');
      
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
  
  // Método para adicionar um link
  const handleAddLink = () => {
    if (linkInput.trim() && !links.includes(linkInput.trim())) {
      try {
        // Verificar se é uma URL válida
        new URL(linkInput.trim());
        setLinks([...links, linkInput.trim()]);
        setLinkInput("");
      } catch (e) {
        toast({
          title: "URL inválida",
          description: "Por favor, insira uma URL válida (ex: https://example.com)",
          variant: "destructive",
        });
      }
    }
  };
  
  // Método para remover um link
  const handleRemoveLink = (linkToRemove: string) => {
    setLinks(links.filter(link => link !== linkToRemove));
  };
  
  // Método para lidar com a tecla Enter no campo de link
  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };
  
  // Método para lidar com o upload de imagem
  const handleImageUploaded = (data: any) => {
    if (data && data.image && data.image.id) {
      const imageId = data.image.id;
      setUploadedImageId(imageId);
      
      // Salvar a imagem no localStorage para persistir entre mudanças de aba
      localStorage.setItem('tempUploadedImageId', imageId.toString());
      
      toast({
        title: "Imagem adicionada",
        description: "A imagem foi carregada com sucesso e será associada à sua ideia.",
      });
      
      // Voltar para a aba principal
      setActiveTab("form");
    }
  };
  
  // Efeito para restaurar informações da imagem carregada, caso o usuário mude de aba
  useEffect(() => {
    // Verificar se há uma imagem carregada temporariamente no localStorage
    const savedImageId = localStorage.getItem('tempUploadedImageId');
    if (savedImageId && !uploadedImageId) {
      setUploadedImageId(parseInt(savedImageId));
    }
    
    // Limpar localStorage quando o modal é fechado
    return () => {
      if (!isOpen) {
        localStorage.removeItem('tempUploadedImageId');
      }
    };
  }, [isOpen, uploadedImageId]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col">
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
        
        <div className="overflow-y-auto flex-grow p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="form" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                Detalhes da Ideia
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center">
                <LinkIcon className="mr-2 h-4 w-4" />
                Links <span className="ml-1 text-xs">(opcional)</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center">
                <ImageIcon className="mr-2 h-4 w-4" />
                Imagens <span className="ml-1 text-xs">(opcional)</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="form">
              <form id="create-idea-form" onSubmit={handleSubmit}>
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
                
                {/* Informações adicionais */}
                <div className="mt-4 mb-2">
                  <div className="flex gap-2 items-center text-sm text-gray-500">
                    {uploadedImageId && (
                      <div className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        <span>1 imagem adicionada</span>
                      </div>
                    )}
                    
                    {links.length > 0 && (
                      <div className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        <span>{links.length} link{links.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botão de envio grande dentro do formulário para garantir que ele apareça */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <Button 
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-lg flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    <span className="text-lg font-medium">{isSubmitting ? "Compartilhando..." : "Compartilhar Ideia"}</span>
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="links">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Adicionar Links</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Compartilhe links relevantes para sua ideia, como artigos, projetos semelhantes, inspirações, ou qualquer outro recurso útil.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[50px] border border-border rounded-md p-3">
                    {links.length === 0 ? (
                      <div className="w-full text-center text-gray-400 py-2">
                        Nenhum link adicionado ainda
                      </div>
                    ) : (
                      links.map((link, index) => (
                        <div 
                          key={index} 
                          className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center break-all"
                        >
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm truncate max-w-[200px]">
                            {link}
                          </a>
                          <button 
                            type="button" 
                            className="ml-2 focus:outline-none" 
                            onClick={() => handleRemoveLink(link)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="flex">
                    <Input
                      type="url"
                      placeholder="Adicionar URL (ex: https://example.com)"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={handleLinkKeyDown}
                      className="rounded-r-none"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddLink}
                      className="bg-primary text-white rounded-l-none"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("form")}
                  >
                    Voltar para Detalhes
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("images")}
                  >
                    Adicionar Imagens
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="images">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Adicionar Imagem</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Adicione uma imagem para ilustrar sua ideia. Ela será exibida junto com a descrição.
                  </p>
                  
                  <ImageUploader 
                    endpoint="/api/images"
                    onImageUploaded={handleImageUploaded}
                  />
                  
                  {uploadedImageId && (
                    <div className="mt-3 p-2 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Imagem adicionada com sucesso! Ela será associada à sua ideia quando você compartilhar.
                    </div>
                  )}
                </div>
                
                <div className="pt-4 flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("links")}
                  >
                    Adicionar Links
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("form")}
                  >
                    Voltar para Detalhes
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
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
            type="button"
            className="bg-primary text-white"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{isSubmitting ? "Sharing..." : "Share Idea"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
