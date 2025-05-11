import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ForceGraph2D from 'react-force-graph-2d';

interface NetworkNode {
  id: number;
  title: string;
  tags?: string[];
  group: string;
}

interface NetworkLink {
  source: number;
  target: number;
  value: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export default function ObsidianNetwork() {
  const graphRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<NetworkData | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<number>>(new Set());
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  // Fetch network data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/obsidian/network']
  });

  // Filter data based on search term
  useEffect(() => {
    if (!data) return;
    
    if (!searchTerm.trim()) {
      setFilteredData(data);
      setHighlightNodes(new Set());
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchingNodeIds = new Set<number>();
    
    // Find matching nodes
    const matchingNodes = data.nodes.filter(node => {
      const matches = 
        node.title.toLowerCase().includes(term) || 
        (node.tags && node.tags.some(tag => tag.toLowerCase().includes(term)));
      
      if (matches) matchingNodeIds.add(node.id);
      return matches;
    });
    
    // Find links that connect to matching nodes
    const relevantLinks = data.links.filter(link => 
      matchingNodeIds.has(link.source as number) || matchingNodeIds.has(link.target as number)
    );
    
    // Add nodes that are connected to matching nodes
    const connectedNodeIds = new Set<number>([...matchingNodeIds]);
    relevantLinks.forEach(link => {
      connectedNodeIds.add(link.source as number);
      connectedNodeIds.add(link.target as number);
    });
    
    const connectedNodes = data.nodes.filter(node => connectedNodeIds.has(node.id));
    
    setFilteredData({
      nodes: connectedNodes,
      links: relevantLinks
    });
    
    setHighlightNodes(matchingNodeIds);
  }, [data, searchTerm]);

  // Reset zoom to fit all nodes
  const handleResetZoom = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  // Zoom in
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5);
    }
  };
  
  // Zoom out
  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5);
    }
  };

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
      concept: '#fd7e14',
      finance: '#e83e8c', // Nova categoria finance com cor rosa
      sphere: '#17a2b8' // Nova categoria sphere com cor turquesa
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
      <CardContent>
        {hasData ? (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search nodes by title or tag..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomIn} 
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomOut} 
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleResetZoom} 
                  title="Reset view"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Node details panel */}
            {selectedNode && (
              <div className="mb-4 p-4 border rounded-md bg-muted/30">
                <h3 className="font-semibold text-lg mb-2">{selectedNode.title}</h3>
                {selectedNode.tags && selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNode.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedNode(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {/* Graph visualization */}
            <div className="h-[600px] border rounded-md overflow-hidden bg-background">
              {filteredData && (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={filteredData}
                  nodeId="id"
                  nodeLabel="title"
                  nodeColor={(node: any) => {
                    const n = node as NetworkNode;
                    if (highlightNodes.size > 0) {
                      return highlightNodes.has(n.id) ? '#ff6b6b' : getGroupColor(n.group);
                    }
                    return getGroupColor(n.group);
                  }}
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const n = node as NetworkNode & { x: number, y: number };
                    const fontSize = 12 / globalScale;
                    const label = n.title;
                    const isHighlighted = highlightNodes.has(n.id);
                    
                    // Node circle
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, isHighlighted ? 6 : 4, 0, 2 * Math.PI, false);
                    ctx.fillStyle = isHighlighted ? '#ff6b6b' : getGroupColor(n.group);
                    ctx.fill();
                    
                    // Only render labels for highlighted nodes or when zoomed in
                    if (isHighlighted || globalScale > 0.8) {
                      ctx.font = `${fontSize}px Sans-Serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = 'white';
                      
                      // Background for text
                      const textWidth = ctx.measureText(label).width;
                      ctx.fillStyle = 'rgba(0,0,0,0.6)';
                      ctx.fillRect(
                        n.x - textWidth / 2 - 2,
                        n.y + 6,
                        textWidth + 4,
                        fontSize + 2
                      );
                      
                      // Text
                      ctx.fillStyle = 'white';
                      ctx.fillText(label, n.x, n.y + 6 + fontSize / 2);
                    }
                  }}
                  linkWidth={1}
                  linkColor={() => '#999999'}
                  onNodeClick={(node: any) => {
                    setSelectedNode(node as NetworkNode);
                  }}
                  cooldownTicks={100}
                  onEngineStop={() => handleResetZoom()}
                />
              )}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('uncategorized')}}></div>
                <span>Uncategorized</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('project')}}></div>
                <span>Project</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('idea')}}></div>
                <span>Idea</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('note')}}></div>
                <span>Note</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('concept')}}></div>
                <span>Concept</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('finance')}}></div>
                <span>Finance</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getGroupColor('sphere')}}></div>
                <span>Sphere</span>
              </div>
            </div>
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