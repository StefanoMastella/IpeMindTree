import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Star, StarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Image {
  id: number;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

interface IdeaImage {
  id: number;
  ideaId: number;
  imageId: number;
  isMainImage: boolean;
  orderIndex: number;
  createdAt: string;
}

interface ImageGalleryProps {
  ideaId?: number;
  editable?: boolean;
  onImageDeleted?: () => void;
  onMainImageChanged?: (imageId: number) => void;
}

export function ImageGallery({
  ideaId,
  editable = false,
  onImageDeleted,
  onMainImageChanged,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Query para obter imagens
  const imagesQuery = useQuery({
    queryKey: ideaId ? [`/api/ideas/${ideaId}/images`] : ['/api/images'],
    queryFn: async () => {
      const response = await fetch(ideaId ? `/api/ideas/${ideaId}/images` : '/api/images');
      if (!response.ok) {
        throw new Error('Erro ao carregar imagens');
      }
      return response.json();
    },
  });

  const handleDeleteImage = async (imageId: number) => {
    if (!ideaId) return;
    
    try {
      const response = await fetch(`/api/ideas/${ideaId}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir imagem');
      }

      toast({
        title: "Imagem excluída",
        description: "A imagem foi removida com sucesso.",
      });

      // Fechar o modal se a imagem excluída for a selecionada
      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(null);
      }
      
      // Atualizar a lista de imagens
      imagesQuery.refetch();
      
      if (onImageDeleted) {
        onImageDeleted();
      }
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a imagem.",
        variant: "destructive",
      });
    }
  };

  const handleSetMainImage = async (imageId: number) => {
    if (!ideaId) return;
    
    try {
      const response = await fetch(`/api/ideas/${ideaId}/images/${imageId}/main`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Erro ao definir imagem principal');
      }

      toast({
        title: "Imagem principal definida",
        description: "A imagem foi definida como principal com sucesso.",
      });
      
      // Atualizar a lista de imagens
      imagesQuery.refetch();
      
      if (onMainImageChanged) {
        onMainImageChanged(imageId);
      }
    } catch (error) {
      console.error('Erro ao definir imagem principal:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao definir a imagem principal.",
        variant: "destructive",
      });
    }
  };

  if (imagesQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-2 flex items-center justify-center">
            <Skeleton className="h-32 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (imagesQuery.isError) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>Erro ao carregar imagens. Por favor, tente novamente.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => imagesQuery.refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  const images: Image[] = imagesQuery.data;

  if (images.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>Nenhuma imagem disponível</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => {
          const ideaImage = (image as any).ideaImage as IdeaImage | undefined;
          const isMainImage = ideaImage?.isMainImage;
          
          return (
            <Card key={image.id} className="group relative overflow-hidden">
              <Dialog>
                <DialogTrigger asChild>
                  <div 
                    className="relative cursor-pointer w-full aspect-square"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img 
                      src={image.path} 
                      alt={image.originalName} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                    {isMainImage && (
                      <div className="absolute top-2 right-2 z-10">
                        <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 transition-opacity" />
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <div className="relative">
                    <img 
                      src={selectedImage?.path} 
                      alt={selectedImage?.originalName} 
                      className="w-full h-auto max-h-[70vh] object-contain rounded-md"
                    />
                    {editable && (
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 bg-white/80 hover:bg-yellow-400/80"
                          onClick={() => selectedImage && handleSetMainImage(selectedImage.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 bg-white/80 hover:bg-red-500/80"
                          onClick={() => selectedImage && handleDeleteImage(selectedImage.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              {editable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-white/80 hover:bg-yellow-400/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetMainImage(image.id);
                    }}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-white/80 hover:bg-red-500/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}