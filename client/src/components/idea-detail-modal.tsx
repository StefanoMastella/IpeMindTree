import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/types";
import ConnectionsVisualization from "@/components/connections-visualization";
import { Heart, Share, Link as LinkIcon, X } from "lucide-react";

interface IdeaDetailModalProps {
  ideaId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function IdeaDetailModal({ ideaId, isOpen, onClose }: IdeaDetailModalProps) {
  const [comment, setComment] = useState("");
  
  // Fetch idea details
  const { data: idea, isLoading } = useQuery({
    queryKey: [`/api/ideas/${ideaId}`],
    enabled: isOpen && ideaId !== null
  });
  
  // Fetch comments for this idea
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: [`/api/ideas/${ideaId}/comments`],
    enabled: isOpen && ideaId !== null
  });
  
  // Fetch image data if available
  const { data: images = [] } = useQuery({
    queryKey: [`/api/ideas/${ideaId}/images`],
    enabled: isOpen && ideaId !== null
  });
  
  // Handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    try {
      await apiRequest("POST", `/api/ideas/${ideaId}/comments`, {
        content: comment,
        author: "Current User" // In a real app, this would be the logged-in user
      });
      
      setComment("");
      refetchComments();
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex justify-between items-center p-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-medium text-secondary-dark font-roboto">
            {isLoading ? "Loading..." : idea?.title}
          </DialogTitle>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        {isLoading ? (
          <div className="p-6 flex justify-center items-center">
            <div className="animate-pulse">Loading idea details...</div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-grow p-6">
              {/* Imagem principal, se houver */}
              {images && images.length > 0 && (
                <div className="mb-6 flex justify-center">
                  <img 
                    src={`/api/images/${images[0].id}`} 
                    alt={idea?.title} 
                    className="max-w-full h-auto max-h-[300px] rounded-lg shadow-md"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <h4 className="text-lg font-medium text-foreground mb-2 font-roboto">Description</h4>
                <p className="text-white mb-4">{idea?.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {idea?.tags?.map((tag: string, index: number) => (
                    <span 
                      key={index} 
                      className="bg-primary-light text-primary text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                {idea?.links && idea.links.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-foreground mb-2 font-roboto">Links</h4>
                    <div className="space-y-1">
                      {idea.links.map((link: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <LinkIcon className="h-3 w-3 mr-2 text-blue-400" />
                          <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:text-blue-500 hover:underline text-sm truncate"
                          >
                            {link}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-500 mt-4">
                  <User className="h-4 w-4 mr-1" />
                  <span>{idea?.author}</span>
                  <span className="mx-2">•</span>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDate(idea?.createdAt)}</span>
                </div>
              </div>
              
              {/* Connections Visualization */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-foreground mb-4 font-roboto">Connections</h4>
                <ConnectionsVisualization ideaId={ideaId} />
              </div>
              
              {/* Comments Section */}
              <div>
                <h4 className="text-lg font-medium text-foreground mb-4 font-roboto">Discussion</h4>
                
                <form onSubmit={handleSubmitComment} className="mb-4">
                  <Textarea
                    placeholder="Add your thoughts or questions..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mb-2"
                    rows={2}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" className="bg-primary text-white">
                      Comment
                    </Button>
                  </div>
                </form>
                
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-gray-700">No comments yet. Be the first to start the discussion!</p>
                    </div>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-gray-900">{comment.author}</span>
                          <span className="mx-2 text-xs text-gray-700">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-900 text-sm">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="border-t border-gray-200 p-4 flex justify-between items-center bg-gray-50">
              <div className="flex space-x-2">
                <Button variant="ghost" className="flex items-center text-secondary hover:text-primary">
                  <Heart className="h-4 w-4 mr-1" />
                  <span className="text-sm">Like</span>
                </Button>
                <Button variant="ghost" className="flex items-center text-secondary hover:text-primary">
                  <Share className="h-4 w-4 mr-1" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>
              
              <Button className="bg-primary text-white">
                <LinkIcon className="h-4 w-4 mr-1" />
                <span>Add Connection</span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Importing at the bottom to avoid circular dependencies
import { User, Clock } from "lucide-react";
