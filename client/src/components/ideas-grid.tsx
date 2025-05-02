import IdeaCard from "@/components/idea-card";
import { Idea } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface IdeasGridProps {
  ideas: Idea[];
  isLoading: boolean;
  isError: boolean;
  onIdeaClick: (id: number) => void;
}

export default function IdeasGrid({ ideas, isLoading, isError, onIdeaClick }: IdeasGridProps) {
  if (isLoading) {
    return (
      <section>
        <h3 className="text-lg font-medium text-secondary-dark mb-4 font-roboto">Community Ideas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-3" />
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  
  if (isError) {
    return (
      <section>
        <h3 className="text-lg font-medium text-secondary-dark mb-4 font-roboto">Community Ideas</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            There was an error loading ideas. Please try again later.
          </AlertDescription>
        </Alert>
      </section>
    );
  }
  
  if (ideas.length === 0) {
    return (
      <section>
        <h3 className="text-lg font-medium text-secondary-dark mb-4 font-roboto">Community Ideas</h3>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h4 className="text-lg font-medium text-secondary-dark mb-2">No ideas found</h4>
          <p className="text-secondary">Be the first to share an idea with the community!</p>
        </div>
      </section>
    );
  }
  
  return (
    <section>
      <h3 className="text-lg font-medium text-secondary-dark mb-4 font-roboto">Community Ideas</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea) => (
          <IdeaCard 
            key={idea.id} 
            idea={idea} 
            onClick={onIdeaClick}
          />
        ))}
      </div>
    </section>
  );
}
