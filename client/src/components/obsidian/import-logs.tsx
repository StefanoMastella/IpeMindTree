import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  // Busca os logs de importação
  const { data, isLoading, error } = useQuery<ImportLog[]>({
    queryKey: ['/api/obsidian/import-logs'],
    queryFn: async () => {
      const response = await fetch('/api/obsidian/import-logs');
      if (!response.ok) {
        throw new Error('Falha ao carregar logs de importação');
      }
      return response.json();
    }
  });
  
  // Formata a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Carregando logs de importação...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-destructive">
        <p className="font-semibold">Erro ao carregar logs</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </p>
      </div>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Logs de Importação</CardTitle>
        <CardDescription>
          Histórico de importações de arquivos do Obsidian.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {data && data.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Conteúdo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.importSource === 'upload' ? 'Upload Direto' : 
                           log.importSource === 'url_download' ? 'URL de Download' : 
                           log.importSource}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.importedBy}</TableCell>
                      <TableCell className="text-center">
                        {log.success ? (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center" title={log.error}>
                            <XCircle className="h-5 w-5 text-destructive" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.success ? (
                          <span className="text-sm">
                            {log.nodesCount} nós • {log.linksCount} links
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Falha na importação
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 border rounded-md">
            <p className="text-muted-foreground">Nenhum log de importação encontrado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}