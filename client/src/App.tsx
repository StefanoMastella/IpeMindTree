import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import AuthPage from "@/pages/auth-page";
import Chat from "@/pages/chat";
import Explore from "@/pages/explore";
import IdeaDetail from "@/pages/idea-detail";
import ObsidianPage from "@/pages/obsidian";
import SubpromptAdmin from "@/pages/subprompt-admin";
import DatabaseViewer from "@/pages/database-viewer";
import { IdeaDetailProvider } from "./lib/types";
import { ProtectedRoute } from "./lib/protected-route";
import { AdminRoute } from "./lib/admin-route";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={Home}/>
      <Route path="/about" component={About}/>
      <Route path="/auth" component={AuthPage}/>
      <Route path="/chat" component={Chat}/>
      <Route path="/explore" component={Explore}/>
      <Route path="/idea/:id" component={IdeaDetail}/>
      <Route path="/obsidian" component={ObsidianPage}/>
      <Route path="/admin/subprompts" component={() => (
        <AdminRoute>
          <SubpromptAdmin />
        </AdminRoute>
      )}/>
      <Route path="/admin/database" component={() => (
        <AdminRoute>
          <DatabaseViewer />
        </AdminRoute>
      )}/>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set up state for selected idea
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  
  // Force dark theme on application load
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <IdeaDetailProvider value={{ selectedIdea, setSelectedIdea }}>
            <Toaster />
            <Router />
          </IdeaDetailProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
