import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Node {
  id: number;
  title: string;
  group: string;
  tags?: string[];
}

interface Link {
  source: number;
  target: number;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export default function ObsidianNetwork() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Busca os dados da rede do Obsidian
  const { data, isLoading, error } = useQuery<GraphData>({
    queryKey: ['/api/obsidian/network'],
    queryFn: async () => {
      const response = await fetch('/api/obsidian/network');
      if (!response.ok) {
        throw new Error('Failed to load Obsidian network data');
      }
      return response.json();
    }
  });
  
  // Update graph dimensions when window is resized
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('graph-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(500, window.innerHeight * 0.6)
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Obsidian network...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-destructive">
        <p className="font-semibold">Error loading Obsidian network</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
  
  const hasData = data && data.nodes && data.nodes.length > 0;
  
  // Function to get a color based on the node group
  const getGroupColor = (group: string) => {
    const colorMap: Record<string, string> = {
      uncategorized: '#6c757d',
      project: '#0d6efd',
      idea: '#198754',
      note: '#ffc107',
      task: '#dc3545',
      article: '#6610f2',
      person: '#20c997',
      concept: '#fd7e14'
    };
    
    return colorMap[group] || '#6c757d';
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Obsidian Knowledge Network</CardTitle>
        <CardDescription>
          Visualize connections between concepts imported from Obsidian.
          {hasData ? ` ${data.nodes.length} nodes and ${data.links.length} connections.` : ''}
        </CardDescription>
      </CardHeader>
      
      <CardContent id="graph-container" className="p-6">
        {hasData ? (
          <div className="space-y-6">
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">
                We found <span className="font-medium">{data.nodes.length}</span> nodes and{' '}
                <span className="font-medium">{data.links.length}</span> connections in your knowledge base.
              </p>
              
              {/* Group listing */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Concept groups:</h4>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(data.nodes.map(node => node.group))].map(group => (
                    <div 
                      key={group} 
                      className="px-3 py-1 rounded-full text-xs flex items-center gap-2"
                      style={{ backgroundColor: `${getGroupColor(group)}20`, color: getGroupColor(group) }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getGroupColor(group) }}></div>
                      {group || 'no group'}
                      <span className="text-foreground opacity-70">
                        ({data.nodes.filter(node => node.group === group).length})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Main nodes list */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Main Nodes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.nodes
                  .sort((a, b) => {
                    // Sort by number of connections (nodes with more links are more important)
                    const aConnections = data.links.filter(
                      link => link.source === a.id || link.target === a.id
                    ).length;
                    const bConnections = data.links.filter(
                      link => link.source === b.id || link.target === b.id
                    ).length;
                    return bConnections - aConnections;
                  })
                  .slice(0, 9) // Get only the top 9 nodes
                  .map(node => {
                    // Calculate number of connections
                    const connections = data.links.filter(
                      link => link.source === node.id || link.target === node.id
                    ).length;
                    
                    return (
                      <div 
                        key={node.id}
                        className="border rounded-md p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getGroupColor(node.group) }}
                          ></div>
                          <h4 className="font-medium text-sm truncate">{node.title}</h4>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{connections} connections</span>
                          
                          {node.tags && node.tags.length > 0 && (
                            <div className="flex-1 flex flex-wrap gap-1">
                              {node.tags.slice(0, 3).map(tag => (
                                <span 
                                  key={tag} 
                                  className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {node.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{node.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Note: An interactive graph visualization will be available soon. Currently, 
              we are presenting a summary of the data imported from Obsidian.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-muted-foreground">
              No data available. Import Obsidian files to visualize the network.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}