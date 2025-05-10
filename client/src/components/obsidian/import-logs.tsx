import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImportLog {
  id: number;
  source: string;
  success: boolean;
  details: string;
  created_at: string;
  user_id: number | null;
}

export default function ImportLogs() {
  // Buscar logs de importação
  const { 
    data: logs, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/obsidian/import-logs'],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando logs de importação...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-destructive">
        <p className="font-semibold">Erro ao carregar logs</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </p>
      </div>
    );
  }
  
  const hasLogs = logs && logs.length > 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Logs de Importação</CardTitle>
        <CardDescription>
          Histórico de importações do Obsidian.
          {hasLogs ? ` ${logs.length} importações realizadas.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasLogs ? (
          <div className="space-y-4">
            {logs.map((log: ImportLog) => {
              const date = new Date(log.created_at);
              const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
              const formattedDate = format(date, 'dd/MM/yyyy HH:mm');
              
              return (
                <div 
                  key={log.id} 
                  className="p-4 border rounded-md hover:bg-accent hover:border-accent transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{formattedDate}</p>
                      <p className="text-sm text-muted-foreground">{timeAgo}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="px-2 py-1 text-xs rounded-md bg-primary/20 text-primary">
                        {log.file_count} arquivos
                      </span>
                      <span className="px-2 py-1 text-xs rounded-md bg-green-500/20 text-green-500">
                        {log.success_count} sucessos
                      </span>
                      {log.error_count > 0 && (
                        <span className="px-2 py-1 text-xs rounded-md bg-destructive/20 text-destructive">
                          {log.error_count} falhas
                        </span>
                      )}
                    </div>
                  </div>
                  {log.details && (
                    <p className="text-sm mt-2 text-muted-foreground whitespace-pre-line">
                      {log.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-muted-foreground">
              Nenhum log de importação disponível.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}