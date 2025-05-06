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
import ObsidianPage from "@/pages/obsidian-page";
import AuthPage from "@/pages/auth-page";
import SubpromptAdmin from "@/pages/subprompt-admin";
import { AdminRoute } from "./lib/admin-route";
import { useState } from "react";
import { IdeaDetailProvider } from "./lib/types";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ideas/:id" component={IdeaDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/explore" component={Explore} />
      <Route path="/about" component={About} />
      <Route path="/obsidian" component={ObsidianPage} />
      <Route path="/auth" component={AuthPage} />
      <AdminRoute path="/admin/subprompts" component={SubpromptAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <IdeaDetailProvider value={{ selectedIdea, setSelectedIdea }}>
            <Toaster />
            <Router />
          </IdeaDetailProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
