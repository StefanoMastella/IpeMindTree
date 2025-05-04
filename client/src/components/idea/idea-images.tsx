import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, Upload } from 'lucide-react';

interface IdeaImagesProps {
  ideaId: number;
  editable?: boolean;
}

export function IdeaImages({ ideaId, editable = false }: IdeaImagesProps) {
  const [activeTab, setActiveTab] = useState("gallery");
  const { toast } = useToast();

  const handleImageUploaded = (imageData: any) => {
    // Mudar para a aba da galeria após o upload
    setActiveTab("gallery");
    
    toast({
      title: "Imagem adicionada",
      description: "A imagem foi adicionada com sucesso à ideia.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="mr-2 h-5 w-5" />
          Imagens
        </CardTitle>
        <CardDescription>
          Visualize e gerencie as imagens associadas a esta ideia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="gallery">Galeria</TabsTrigger>
              {editable && (
                <TabsTrigger value="upload">Adicionar imagem</TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="gallery">
            <ImageGallery 
              ideaId={ideaId} 
              editable={editable}
            />
          </TabsContent>
          
          {editable && (
            <TabsContent value="upload">
              <ImageUploader 
                endpoint={`/api/ideas/${ideaId}/images`}
                onImageUploaded={handleImageUploaded}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}