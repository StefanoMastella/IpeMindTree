import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SearchBar from "@/components/search-bar";
import IdeasGrid from "@/components/ideas-grid";
import MobileNav from "@/components/mobile-nav";
import CreateIdeaModal from "@/components/create-idea-modal";
import IdeaDetailModal from "@/components/idea-detail-modal";
import { useIdeaDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");
  const { selectedIdea, setSelectedIdea } = useIdeaDetail();
  
  // Fetch ideas from the API
  const { data: ideas = [], isLoading, isError } = useQuery({
    queryKey: ["/api/ideas"],
  });
  
  // Filter and sort ideas based on search, tag, and sort order
  const filteredIdeas = ideas.filter((idea: any) => {
    const matchesSearch = searchTerm === "" || 
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = selectedTag === "all" || idea.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });
  
  // Sort ideas
  const sortedIdeas = [...filteredIdeas].sort((a: any, b: any) => {
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
              <h2 className="text-2xl font-bold text-secondary-dark mb-2 font-roboto">Community Brain for Ipê</h2>
              <p className="text-secondary max-w-2xl mx-auto">Share ideas, discover connections, and collaborate with your community to build a collective knowledge base.</p>
            </div>
            
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
      
      <Button
        id="create-idea-btn"
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed right-6 bottom-20 md:bottom-6 z-10 bg-primary hover:bg-primary-dark text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <PlusIcon className="h-6 w-6" />
      </Button>
      
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
