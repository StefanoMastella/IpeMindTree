import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileUp, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Progress } from '@/components/ui/progress';

export default function ObsidianUploader() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Mutação para enviar os arquivos do Obsidian
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setProgress(0);
      
      // Simular progresso
      const intervalId = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      try {
        const response = await fetch('/api/obsidian/upload', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(intervalId);
        setProgress(100);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error uploading files');
        }
        
        return await response.json();
      } catch (error) {
        clearInterval(intervalId);
        setProgress(0);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      setFiles([]);
      toast({
        title: 'Upload complete',
        description: 'Obsidian files were successfully imported.',
        variant: 'default',
      });
      // Invalidar queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/obsidian/network'] });
      queryClient.invalidateQueries({ queryKey: ['/api/obsidian/import-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Lidar com seleção de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };
  
  // Lidar com drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };
  
  // Remover arquivo da lista
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Iniciar upload
  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one markdown file to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    uploadMutation.mutate(formData);
  };
  
  // Renderizar lista de arquivos
  const renderFileList = () => {
    if (files.length === 0) return null;
    
    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium">Selected files:</div>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
              <div className="flex items-center space-x-2 truncate">
                <FileUp className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(index)}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Importar Arquivos Obsidian</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            ${isUploading ? 'bg-muted/50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'}
            transition-colors duration-200
          `}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={!isUploading ? handleDrop : undefined}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,.zip"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          <Upload className="h-10 w-10 mb-3 mx-auto text-muted-foreground" />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              Drag and drop files here or click to select
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports .md, .markdown, .txt files, or a .zip file containing Obsidian documents
            </p>
          </div>
        </div>
        
        {renderFileList()}
        
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing files...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {files.length > 0 ? (
            <span>
              {files.length} {files.length === 1 ? 'file selected' : 'files selected'}
            </span>
          ) : null}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFiles([]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={files.length === 0 || isUploading}
          >
            Limpar
          </Button>
          
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></span>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Importar</span>
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}