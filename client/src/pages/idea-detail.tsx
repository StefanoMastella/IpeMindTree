import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MobileNav from "@/components/mobile-nav";
import ConnectionsVisualization from "@/components/connections-visualization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/types";
import { MessageSquare, Heart, Share, Link } from "lucide-react";

export default function IdeaDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [comment, setComment] = useState("");
  
  // Fetch idea details
  const { data: idea, isLoading, isError } = useQuery({
    queryKey: [`/api/ideas/${id}`],
  });
  
  // Fetch comments for this idea
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: [`/api/ideas/${id}/comments`],
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="p-8 flex justify-center items-center">
              <div className="animate-pulse">Loading idea details...</div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (isError || !idea) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-error mb-4">Error Loading Idea</h2>
              <p>We couldn't find the idea you're looking for.</p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    try {
      await apiRequest("POST", `/api/ideas/${id}/comments`, {
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
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-secondary-dark mb-4">{idea.title}</h1>
            
            <p className="text-secondary mb-6">{idea.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {idea.tags.map((tag: string, index: number) => (
                <span 
                  key={index} 
                  className="bg-primary-light text-primary text-xs px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-medium mr-1">{idea.author}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(idea.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Connections Visualization */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-secondary-dark mb-4">Connections</h2>
          <ConnectionsVisualization ideaId={parseInt(id)} />
        </div>
        
        {/* Comments Section */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-secondary-dark mb-4">Discussion</h2>
          
          <form onSubmit={handleSubmitComment} className="mb-6">
            <Textarea
              placeholder="Add your thoughts or questions..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-2"
            />
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary text-white">
                Comment
              </Button>
            </div>
          </form>
          
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-secondary">No comments yet. Be the first to start the discussion!</p>
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-secondary-dark">{comment.author}</span>
                    <span className="mx-2 text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-secondary text-sm">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <Button variant="ghost" className="flex items-center">
              <Heart className="h-4 w-4 mr-1" />
              <span>Like</span>
            </Button>
            <Button variant="ghost" className="flex items-center">
              <Share className="h-4 w-4 mr-1" />
              <span>Share</span>
            </Button>
          </div>
          
          <Button className="bg-primary text-white">
            <Link className="h-4 w-4 mr-1" />
            <span>Add Connection</span>
          </Button>
        </div>
      </main>
      
      <MobileNav />
      <Footer />
    </div>
  );
}
