import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Idea, formatDate } from "@/lib/types";
import { Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface IdeaCardProps {
  idea: Idea;
  onClick: (id: number) => void;
}

export default function IdeaCard({ idea, onClick }: IdeaCardProps) {
  const [, navigate] = useLocation();
  
  return (
    <Card 
      className="idea-card cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={() => onClick(idea.id)}
    >
      <CardContent className="p-4">
        <h4 className="text-lg font-medium text-secondary-dark font-roboto mb-2">{idea.title}</h4>
        <p className="text-secondary text-sm mb-3 line-clamp-3">{idea.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {idea.tags.map((tag, index) => (
            <span 
              key={index} 
              className="bg-primary-light text-primary text-xs px-2 py-1 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                // Tag filtering functionality could be added here
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{idea.author}</span>
          <span>{formatDate(idea.createdAt)}</span>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <LinkIcon className="h-4 w-4 text-primary mr-1" />
          <span className="text-sm text-secondary">
            {idea.connections.length} connection{idea.connections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary-dark">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              navigate(`/ideas/${idea.id}`);
            }}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              Share Idea
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              Add Connection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
