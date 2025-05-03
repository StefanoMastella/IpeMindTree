import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type Idea } from "@/lib/types";
import Header from "@/components/header";
import { getQueryFn } from "@/lib/queryClient";

export default function Explore() {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  // Fetch ideas
  const { data: ideas, isLoading } = useQuery({
    queryKey: ['/api/ideas'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Get color based on tags
  const getColorFromTags = (tags: string[] = []) => {
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
          <div className="relative rounded-lg border border-border overflow-hidden bg-card/20">
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(ideas) && ideas.map((idea: Idea) => (
                  <Card 
                    key={idea.id}
                    className="bg-card hover:bg-card/90 transition-colors cursor-pointer border-primary/20 hover:border-primary/40"
                    style={{ 
                      borderLeftColor: getColorFromTags(idea.tags), 
                      borderLeftWidth: "4px"
                    }}
                    onClick={() => setSelectedIdea(idea)}
                  >
                    <CardContent className="p-4">
                      <h3 className="text-lg font-medium text-foreground">{idea.title}</h3>
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                        {idea.description}
                      </p>
                      
                      {/* Display tags */}
                      {idea.tags && idea.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {idea.tags.slice(0, 3).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {idea.tags.length > 3 && (
                            <span className="text-xs px-2 py-1 text-muted-foreground">
                              +{idea.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Display connections count if any */}
                      {idea.connections && idea.connections.length > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {idea.connections.length} connection{idea.connections.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {selectedIdea && (
              <Card className="absolute bottom-4 right-4 w-80 bg-card text-card-foreground shadow-xl border-primary/30 max-h-[80vh] overflow-y-auto">
                <CardContent className="p-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setSelectedIdea(null)}
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </Button>
                
                  <h3 className="text-lg font-bold text-primary pr-6">{selectedIdea.title}</h3>
                  <p className="text-sm mt-2 text-foreground/80">{selectedIdea.description}</p>
                  
                  {selectedIdea.tags && selectedIdea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedIdea.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Created by {selectedIdea.author} on {new Date(selectedIdea.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full border-primary/30 text-primary"
                    onClick={() => window.location.href = `/ideas/${selectedIdea.id}`}
                  >
                    View Full Details
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