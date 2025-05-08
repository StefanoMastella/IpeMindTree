import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import AuthPage from "@/pages/auth-page";
import Chat from "@/pages/chat";
import Explore from "@/pages/explore";
import IdeaDetail from "@/pages/idea-detail";
import ObsidianPage from "@/pages/obsidian-page";
import SubpromptAdmin from "@/pages/subprompt-admin";
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
      <Route path="/admin/subprompts">
        {() => (
          <AdminRoute>
            <SubpromptAdmin />
          </AdminRoute>
        )}
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set up state for selected idea
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
