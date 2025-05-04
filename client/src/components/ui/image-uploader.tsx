import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  onImageUploaded?: (imageData: any) => void;
  endpoint?: string;
  acceptedTypes?: string;
  maxSize?: number; // em bytes
  className?: string;
}

export function ImageUploader({
  onImageUploaded,
  endpoint = '/api/images',
  acceptedTypes = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB por padrão
  className = '',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Verificar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, envie apenas imagens.",
        variant: "destructive",
      });
      return;
    }

    // Verificar tamanho do arquivo
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: `O tamanho máximo é ${Math.round(maxSize / (1024 * 1024))}MB.`,
        variant: "destructive",
      });
      return;
    }

    // Mostrar prévia
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Fazer upload
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('image', file);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Falha no upload da imagem');
      }

      const imageData = await response.json();
      console.log('Imagem enviada com sucesso. Dados da imagem:', imageData);
      setUploadProgress(100);

      toast({
        title: "Imagem enviada com sucesso",
        description: "Sua imagem foi enviada e está pronta para uso.",
      });

      if (onImageUploaded) {
        console.log('Chamando callback onImageUploaded com:', imageData);
        onImageUploaded(imageData);
      }

      // Resetar após 1 segundo
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar a imagem.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border'
        } transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="relative w-full">
            <button
              type="button"
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full"
              onClick={clearPreview}
            >
              <X size={16} />
            </button>
            <img 
              src={previewUrl} 
              alt="Prévia da imagem" 
              className="mx-auto max-h-48 object-contain rounded-md" 
            />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="mb-2 text-sm text-muted-foreground">
              Arraste e solte uma imagem aqui, ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </div>

      {isUploading && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Enviando... {Math.round(uploadProgress)}%
          </p>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {!previewUrl && !isUploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Selecionar imagem
        </Button>
      )}
    </Card>
  );
}