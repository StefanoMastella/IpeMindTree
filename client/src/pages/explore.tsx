import { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type Idea } from "@/lib/types";
import Header from "@/components/header";
import { getQueryFn } from "@/lib/queryClient";

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    val: number;
    color: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
  }>;
}

export default function Explore() {
  const graphRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<any>(null);

  // Fetch ideas
  const { data: ideas, isLoading } = useQuery({
    queryKey: ['/api/ideas'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Generate graph data when ideas are loaded
  useEffect(() => {
    if (!ideas) return;

    const nodes = ideas.map((idea: Idea) => ({
      id: idea.id.toString(),
      name: idea.title,
      val: 1 + (idea.connections?.length || 0) * 0.5,
      description: idea.description,
      color: getColorFromTags(idea.tags),
      tags: idea.tags
    }));

    const links: any[] = [];

    // Create links between connected ideas
    ideas.forEach((idea: Idea) => {
      if (idea.connections && idea.connections.length > 0) {
        idea.connections.forEach(connId => {
          links.push({
            source: idea.id.toString(),
            target: connId.toString(),
            value: 1
          });
        });
      }
    });

    setGraphData({ nodes, links });
  }, [ideas]);

  // Get color based on tags
  const getColorFromTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return "#666";
    
    // Predefined color mapping for common tag themes
    const tagColors: {[key: string]: string} = {
      "technology": "#3498db",
      "community": "#2ecc71",
      "sustainability": "#27ae60",
      "food": "#e67e22", 
      "social": "#9b59b6",
      "art": "#e74c3c",
      "education": "#f1c40f",
      "health": "#1abc9c",
      "environment": "#16a085",
      "music": "#d35400",
    };
    
    // Find if any tags match our predefined categories
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      for (const [category, color] of Object.entries(tagColors)) {
        if (lowerTag.includes(category)) {
          return color;
        }
      }
    }
    
    // Default color if no matches
    return "#3182CE";
  };

  const handleNodeHover = (node: any) => {
    setHoveredNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node?.x, node?.y, 1000);
      if (node) graphRef.current.zoom(2.5, 1000);
    }
  };

  const handleBackgroundClick = () => {
    setHoveredNode(null);
    if (graphRef.current) {
      graphRef.current.zoom(1, 800);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Explore Idea Connections
        </h1>
        
        <p className="text-foreground/80 mb-8">
          Visualize how ideas connect with each other. Hover over nodes to see details, and click to focus on specific connections.
        </p>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="relative rounded-lg border border-border overflow-hidden bg-black/20">
            <div 
              className="h-[60vh]"
              style={{ 
                background: "linear-gradient(180deg, rgba(13,12,34,0.8) 0%, rgba(5,6,20,0.9) 100%)",
              }}
            >
              {graphData.nodes.length > 0 && (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeRelSize={6}
                  nodeLabel={(node: any) => `${node.name}`}
                  nodeColor={(node: any) => node.color}
                  linkWidth={1}
                  linkColor={() => "rgba(100, 130, 200, 0.2)"}
                  backgroundColor="rgba(0,0,0,0)"
                  onNodeHover={handleNodeHover}
                  onBackgroundClick={handleBackgroundClick}
                  width={800}
                  height={600}
                />
              )}
            </div>
            
            {hoveredNode && (
              <Card className="absolute bottom-4 right-4 w-72 bg-card text-card-foreground shadow-xl border-primary/30">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-primary">{hoveredNode.name}</h3>
                  <p className="text-sm mt-2 text-foreground/80">{hoveredNode.description?.substring(0, 120)}...</p>
                  
                  {hoveredNode.tags && hoveredNode.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {hoveredNode.tags.map((tag: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full border-primary/30 text-primary"
                    onClick={() => window.location.href = `/idea/${hoveredNode.id}`}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}