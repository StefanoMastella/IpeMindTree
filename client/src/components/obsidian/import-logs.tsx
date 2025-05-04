import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { queryClient } from '@/lib/queryClient';

interface ImportLog {
  id: number;
  importSource: string;
  nodesCount: number;
  linksCount: number;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
  importedBy: string;
  createdAt: string;
}

export default function ImportLogs() {
  // Busca logs de importação
  const { data: logs, isLoading, error, isError } = useQuery<ImportLog[]>({
    queryKey: ['/api/obsidian/import-logs'],
    queryFn: async () => {
      const response = await fetch('/api/obsidian/import-logs');
      if (!response.ok) {
        throw new Error('Falha ao carregar logs de importação');
      }
      return response.json();
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Carregando logs de importação...</p>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="text-destructive p-4 rounded-md bg-destructive/10">
        <p className="font-medium">Erro ao carregar logs</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
      </div>
    );
  }
  
  const sortedLogs = [...(logs || [])].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Histórico de Importações</CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/obsidian/import-logs'] })}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {sortedLogs.length === 0 ? (
          <div className="text-center p-6 border rounded-md">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Nenhum registro de importação encontrado. Importe arquivos do Obsidian para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map(log => (
              <div 
                key={log.id} 
                className={`border rounded-md p-4 ${
                  log.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <h3 className="text-base font-medium">
                      Importação {log.success ? 'concluída' : 'falhou'}
                    </h3>
                  </div>
                  
                  <Badge variant={log.success ? 'outline' : 'destructive'}>
                    {log.importSource}
                  </Badge>
                </div>
                
                <div className="mt-2 text-sm text-muted-foreground">
                  {formatDate(log.createdAt)} por {log.importedBy}
                </div>
                
                {log.success && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 p-2 rounded-md text-center">
                      <div className="text-lg font-semibold">{log.nodesCount}</div>
                      <div className="text-xs text-muted-foreground">Nós importados</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-md text-center">
                      <div className="text-lg font-semibold">{log.linksCount}</div>
                      <div className="text-xs text-muted-foreground">Conexões importadas</div>
                    </div>
                  </div>
                )}
                
                {log.error && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                    {log.error}
                  </div>
                )}
                
                {/* Metadados adicionais se existir */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {log.metadata.zipFile && (
                      <div>Arquivo: {log.metadata.zipFile}</div>
                    )}
                    {log.metadata.fileCount && (
                      <div>Arquivos processados: {log.metadata.fileCount}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}