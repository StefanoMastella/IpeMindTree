import { createContext, useContext } from "react";

export interface Idea {
  id: number;
  title: string;
  description: string;
  tags: string[];
  author: string;
  createdAt: string;
  connections: number[];
}

export interface IdeaInput {
  title: string;
  description: string;
  tags: string[];
  author: string;
}

export interface Comment {
  id: number;
  ideaId: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface IdeaDetailContextType {
  selectedIdea: number | null;
  setSelectedIdea: (id: number | null) => void;
}

const IdeaDetailContext = createContext<IdeaDetailContextType>({
  selectedIdea: null,
  setSelectedIdea: () => {}
});

export const IdeaDetailProvider = IdeaDetailContext.Provider;

export const useIdeaDetail = () => useContext(IdeaDetailContext);

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};
