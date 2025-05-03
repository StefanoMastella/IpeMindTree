import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
}

export default function SearchBar({
  searchTerm,
  setSearchTerm,
  selectedTag,
  setSelectedTag,
  sortOrder,
  setSortOrder
}: SearchBarProps) {
  // Debounce search input - this is a simple implementation
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const timeoutId = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Search ideas, tags, or connections..."
            className="w-full pl-10 pr-4 py-2"
            defaultValue={searchTerm}
            onChange={handleSearchChange}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative w-full md:w-auto">
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="bg-gray-50 w-[140px] text-gray-900">
                <SelectValue placeholder="Filter by tag" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative w-full md:w-auto">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-gray-50 w-[140px] text-gray-900">
                <SelectValue placeholder="Sort order" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent first</SelectItem>
                <SelectItem value="popular">Most connections</SelectItem>
                <SelectItem value="az">A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
