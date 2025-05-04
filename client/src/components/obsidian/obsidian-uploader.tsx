import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

export default function ObsidianUploader() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [username, setUsername] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>("");
  
  // Manipula a seleção de arquivos
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files);
      const markdownFiles = fileList.filter(file => file.name.endsWith('.md'));
      
      if (markdownFiles.length === 0) {
        toast({
          title: "Arquivos inválidos",
          description: "Por favor, selecione apenas arquivos markdown (.md)",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(markdownFiles);
    }
  };
  
  // Manipula o envio de arquivos
  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo markdown para importar",
        variant: "destructive"
      });
      return;
    }
    
    if (!username.trim()) {
      toast({
        title: "Nome de usuário necessário",
        description: "Por favor, insira seu nome para associar à importação",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadStatus('idle');
    setUploadMessage("");
    
    try {
      // Prepara os arquivos para envio
      const fileContents = await Promise.all(
        files.map(async (file) => {
          return {
            name: file.name,
            content: await file.text()
          };
        })
      );
      
      // Envia os arquivos para a API
      const response = await fetch('/api/obsidian/import-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: fileContents,
          username
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(`${data.count} arquivos importados com sucesso!`);
        
        // Limpa os arquivos selecionados
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Atualiza os dados no cliente
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/nodes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/network'] });
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/import-logs'] });
        
        toast({
          title: "Importação concluída",
          description: `${data.count} arquivos foram importados com sucesso.`,
          variant: "default"
        });
      } else {
        setUploadStatus('error');
        setUploadMessage(data.message || "Erro desconhecido durante a importação");
        
        toast({
          title: "Falha na importação",
          description: data.message || "Ocorreu um erro ao importar os arquivos.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      setUploadStatus('error');
      setUploadMessage("Ocorreu um erro durante o upload. Verifique o console para mais detalhes.");
      
      toast({
        title: "Erro no upload",
        description: "Não foi possível completar o upload dos arquivos.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Manipula o clique no botão de selecionar arquivos
  const handleSelectFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Importar mapas mentais do Obsidian</CardTitle>
        <CardDescription>
          Faça upload dos seus arquivos markdown (.md) do Obsidian para incorporar
          seu conhecimento ao Ipê Mind Tree.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Seu nome</Label>
          <Input
            id="username"
            placeholder="Digite seu nome"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="files">Arquivos Markdown (.md)</Label>
          <Input
            ref={fileInputRef}
            id="files"
            type="file"
            accept=".md"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          
          <div 
            className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={handleSelectFiles}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Clique para selecionar arquivos ou arraste e solte aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas arquivos markdown (.md) são suportados
                </p>
              </div>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">Arquivos selecionados ({files.length}):</p>
              <ul className="text-sm text-muted-foreground mt-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center space-x-2 py-1">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {uploadStatus === 'success' && (
          <Alert variant="default" className="bg-green-500/10 border-green-500">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Sucesso</AlertTitle>
            <AlertDescription>{uploadMessage}</AlertDescription>
          </Alert>
        )}
        
        {uploadStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{uploadMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full"
          onClick={handleUpload}
          disabled={isUploading || files.length === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : "Importar Arquivos"}
        </Button>
      </CardFooter>
    </Card>
  );
}