import { useQuery } from "@tanstack/react-query";
import { useIdeaDetail } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectionsVisualizationProps {
  ideaId: number;
}

export default function ConnectionsVisualization({ ideaId }: ConnectionsVisualizationProps) {
  const { setSelectedIdea } = useIdeaDetail();
  
  // Fetch the idea details
  const { data: idea, isLoading: isLoadingIdea } = useQuery({
    queryKey: [`/api/ideas/${ideaId}`],
  });
  
  // Fetch connected ideas
  const { data: connectedIdeas = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: [`/api/ideas/${ideaId}/connections`],
    enabled: !!idea,
  });
  
  // Fetch suggested resources (this would normally come from an LLM)
  const { data: suggestedResources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: [`/api/ideas/${ideaId}/resources`],
    enabled: !!idea,
  });
  
  const isLoading = isLoadingIdea || isLoadingConnections || isLoadingResources;
  
  if (isLoading) {
    return (
      <Card className="bg-gray-50 rounded-lg p-6">
        <div className="flex justify-center mb-8">
          <Skeleton className="w-20 h-20 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
          <div>
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  if (!idea) {
    return (
      <Card className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-secondary">Could not load connection data.</p>
      </Card>
    );
  }
  
  const truncateTitle = (title: string) => {
    return title.length > 20 ? title.substring(0, 18) + '...' : title;
  };
  
  return (
    <Card className="bg-gray-50 rounded-lg p-6">
      <div className="flex justify-center mb-8">
        {/* Center Node */}
        <div className="connection-node bg-primary text-white rounded-full w-20 h-20 flex items-center justify-center text-center p-2 shadow-md z-10">
          {truncateTitle(idea.title)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Related Ideas */}
        <div className="connection-group">
          <h5 className="text-sm font-medium text-black mb-3 font-roboto">Related Ideas</h5>
          
          <div className="flex flex-col space-y-3">
            {connectedIdeas.length === 0 ? (
              <div className="p-3 bg-white rounded-lg text-center text-gray-700">
                No connected ideas yet
              </div>
            ) : (
              connectedIdeas.map((connectedIdea: any) => (
                <div 
                  key={connectedIdea.id} 
                  className="connection-node flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedIdea(connectedIdea.id)}
                >
                  <div className="bg-primary-light text-primary rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{connectedIdea.title}</p>
                    <p className="text-xs text-gray-500">{connectedIdea.connectionReason}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Suggested Resources */}
        <div className="connection-group">
          <h5 className="text-sm font-medium text-black mb-3 font-roboto">Suggested Resources</h5>
          
          <div className="flex flex-col space-y-3">
            {suggestedResources.length === 0 ? (
              <div className="p-3 bg-white rounded-lg text-center text-gray-700">
                No suggested resources yet
              </div>
            ) : (
              suggestedResources.map((resource: any) => (
                <div 
                  key={resource.id} 
                  className="connection-node flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="bg-info text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{resource.title}</p>
                    <p className="text-xs text-gray-500">{resource.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
