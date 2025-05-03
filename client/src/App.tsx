import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import IdeaDetail from "@/pages/idea-detail";
import Chat from "@/pages/chat";
import Explore from "@/pages/explore";
import About from "@/pages/about";
import { useState } from "react";
import { IdeaDetailProvider } from "./lib/types";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ideas/:id" component={IdeaDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/explore" component={Explore} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IdeaDetailProvider value={{ selectedIdea, setSelectedIdea }}>
          <Toaster />
          <Router />
        </IdeaDetailProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
