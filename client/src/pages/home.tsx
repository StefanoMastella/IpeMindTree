import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SearchBar from "@/components/search-bar";
import IdeasGrid from "@/components/ideas-grid";
import MobileNav from "@/components/mobile-nav";
import CreateIdeaModal from "@/components/create-idea-modal";
import IdeaDetailModal from "@/components/idea-detail-modal";
import ApiTest from "@/components/api-test";
import { useIdeaDetail, type Idea } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusIcon, MessageSquareText } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");
  const { selectedIdea, setSelectedIdea } = useIdeaDetail();
  
  // Fetch ideas from the API
  const { data: ideas = [], isLoading, isError } = useQuery<Idea[]>({
    queryKey: ["/api/ideas"],
  });
  
  // Filter and sort ideas based on search, tag, and sort order
  const filteredIdeas = ideas.filter((idea: Idea) => {
    const matchesSearch = searchTerm === "" || 
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = selectedTag === "all" || idea.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });
  
  // Sort ideas
  const sortedIdeas = [...filteredIdeas].sort((a: Idea, b: Idea) => {
    if (sortOrder === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortOrder === "popular") {
      return b.connections.length - a.connections.length;
    } else if (sortOrder === "az") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div>
          {/* Hero Section */}
          <section className="mb-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 font-roboto bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ipê Mind Tree</h2>
              <p className="text-foreground font-medium max-w-2xl mx-auto mb-2">Share any idea, big or small, and let our AI help find surprising connections with other community ideas.</p>
              <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-6 mt-4">
                <p className="text-sm text-primary font-medium flex items-center justify-center">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  <span>Tap the <span className="font-semibold">+ button</span> to share your ideas</span>
                </p>
                <p className="text-sm text-foreground font-medium flex items-center justify-center">
                  <MessageSquareText className="h-4 w-4 mr-1 text-primary" />
                  <span>Use the <span className="font-semibold text-primary">chat</span> to ask questions about ideas</span>
                </p>
              </div>
            </div>
            
            {/* API Test Component - For Development Only */}
            <ApiTest />
            
            {/* Search and Filter Bar */}
            <SearchBar 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          </section>
          
          {/* Ideas Grid */}
          <IdeasGrid 
            ideas={sortedIdeas}
            isLoading={isLoading}
            isError={isError}
            onIdeaClick={(id) => setSelectedIdea(id)}
          />
        </div>
      </main>
      
      <div className="fixed right-6 bottom-20 md:bottom-6 z-10 flex flex-col items-end gap-2">
        <div className="bg-card/90 backdrop-blur-sm border border-primary/40 text-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          Use these buttons to interact!
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/chat">
            <Button
              className="bg-secondary hover:bg-secondary-dark text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors border-2 border-primary/40"
              aria-label="Chat with AI"
            >
              <MessageSquareText className="h-6 w-6" />
            </Button>
          </Link>
          
          <Button
            id="create-idea-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors border-2 border-primary/40"
            aria-label="Add new idea"
          >
            <PlusIcon className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      <MobileNav />
      <Footer />
      
      {/* Modals */}
      <CreateIdeaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      
      {selectedIdea !== null && (
        <IdeaDetailModal
          ideaId={selectedIdea}
          isOpen={selectedIdea !== null}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </div>
  );
}
