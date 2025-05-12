import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { UploadIcon, LinkIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ObsidianUploader() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [forceNew, setForceNew] = useState(true); // Por padrão, força criação de novos nós
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!files || files.length === 0) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione pelo menos um arquivo para upload.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    // Adiciona o parâmetro forceNew para controlar se novos nós devem ser criados
    formData.append('forceNew', forceNew.toString());
    
    try {
      const response = await fetch('/api/obsidian/import', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Upload realizado com sucesso',
          description: `${files.length} arquivo(s) importado(s) com sucesso.`
        });
        
        // Invalida as consultas para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/nodes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/network'] });
        
        // Limpa o campo de arquivo
        setFiles(null);
      } else {
        toast({
          title: 'Erro no upload',
          description: result.error || 'Ocorreu um erro ao fazer upload dos arquivos.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUrlImport = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!url) {
      toast({
        title: 'URL não fornecida',
        description: 'Por favor, informe uma URL válida para importação.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/obsidian/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Importação realizada com sucesso',
          description: 'Arquivos da URL importados com sucesso.'
        });
        
        // Invalida as consultas para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/nodes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/obsidian/network'] });
        
        // Limpa o campo de URL
        setUrl('');
      } else {
        toast({
          title: 'Erro na importação',
          description: result.error || 'Ocorreu um erro ao importar os arquivos da URL.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Importar Obsidian</CardTitle>
        <CardDescription>
          Importe arquivos do Obsidian (.md, .canvas ou .txt) para visualizar relações e conectar a base de conhecimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload de Arquivos</TabsTrigger>
            <TabsTrigger value="url">Importar por URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <form onSubmit={handleFileUpload} className="space-y-4 pt-4">
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="files"
                    type="file"
                    multiple
                    accept=".md,.canvas,.txt"
                    onChange={(e) => setFiles(e.target.files)}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Selecione arquivos .md, .canvas ou .txt do Obsidian
                  </p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="forceNew" 
                    checked={forceNew}
                    onCheckedChange={(checked) => setForceNew(checked as boolean)}
                  />
                  <Label htmlFor="forceNew" className="cursor-pointer">
                    Forçar criação como novos nós (evita atualizações)
                  </Label>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isUploading || !files} 
                className="w-full"
              >
                {isUploading ? 'Enviando...' : 'Enviar Arquivos'}
                <UploadIcon className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="url">
            <form onSubmit={handleUrlImport} className="space-y-4 pt-4">
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://exemplo.com/arquivos-obsidian.zip"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isImporting}
                  />
                  <p className="text-sm text-muted-foreground">
                    Informe a URL para um arquivo ZIP contendo arquivos do Obsidian
                  </p>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isImporting || !url} 
                className="w-full"
              >
                {isImporting ? 'Importando...' : 'Importar por URL'}
                <LinkIcon className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col">
        <p className="text-sm text-muted-foreground mt-2">
          Serão importados arquivos markdown (.md), canvas (.canvas) e texto (.txt) do Obsidian.
          Links wiki [[link]] e tags #tag serão processados automaticamente.
        </p>
      </CardFooter>
    </Card>
  );
}