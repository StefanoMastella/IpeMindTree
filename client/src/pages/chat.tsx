import { useState } from "react";
import ChatInterface from "@/components/chat-interface";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, Lightbulb, Network, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateIdeaModal from "@/components/create-idea-modal";

export default function Chat() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary-dark bg-clip-text text-transparent">
                Ipê Mind Chat
              </h1>
              <p className="text-foreground/80 font-medium mt-2">
                Chat with Ipê Mind AI and discover connections between ideas
              </p>
            </div>
            
            <ChatInterface />
          </div>
          
          <div className="lg:col-span-1">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="ideas">Ideas</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      What is Ipê Mind?
                    </CardTitle>
                    <CardDescription>
                      Meet our virtual assistant
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">
                      Ipê Mind is a virtual assistant that knows all the ideas shared
                      in the Ipê Mind Tree platform. It can help you to:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1 text-foreground">
                      <li>Discover ideas related to a specific theme</li>
                      <li>Understand connections between different ideas</li>
                      <li>Get suggestions for collaboration between projects</li>
                      <li>Explore the collective knowledge of the community</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="ideas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                      Popular Ideas
                    </CardTitle>
                    <CardDescription>
                      Try asking about these ideas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border border-primary/20 p-2 rounded-md hover:bg-card/80 cursor-pointer">
                      <h4 className="font-medium text-foreground">Community Garden</h4>
                      <p className="text-xs text-foreground/70">
                        Urban agricultural collaborative project
                      </p>
                    </div>
                    <div className="border border-primary/20 p-2 rounded-md hover:bg-card/80 cursor-pointer">
                      <h4 className="font-medium text-foreground">Arts Festival</h4>
                      <p className="text-xs text-foreground/70">
                        Cultural event for artistic presentations
                      </p>
                    </div>
                    <div className="border border-primary/20 p-2 rounded-md hover:bg-card/80 cursor-pointer">
                      <h4 className="font-medium text-foreground">Skills Workshops</h4>
                      <p className="text-xs text-foreground/70">
                        Knowledge sharing between community members
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="tips" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      Dicas de Uso
                    </CardTitle>
                    <CardDescription>
                      Como aproveitar melhor a Ipê Mind
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex">
                        <span className="font-medium mr-2">1.</span>
                        <span>Seja específico em suas perguntas para obter respostas mais precisas</span>
                      </li>
                      <li className="flex">
                        <span className="font-medium mr-2">2.</span>
                        <span>Pergunte sobre conexões entre ideias para descobrir padrões interessantes</span>
                      </li>
                      <li className="flex">
                        <span className="font-medium mr-2">3.</span>
                        <span>Utilize referências a temas ou categorias para explorar grupos de ideias</span>
                      </li>
                      <li className="flex">
                        <span className="font-medium mr-2">4.</span>
                        <span>Peça sugestões de como sua ideia pode se conectar com outras já existentes</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Network className="h-5 w-5 mr-2 text-purple-500" />
                  Explorando Conexões
                </CardTitle>
                <CardDescription>
                  Descubra como as ideias se conectam
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  A Ipê Mind identifica conexões entre ideias com base em temas, objetivos e potenciais 
                  colaborações. Quanto mais ideias são adicionadas à plataforma, mais rica se torna
                  a rede de conhecimento coletivo.
                </p>
                <p className="mt-2">
                  Experimente perguntar: "Quais ideias estão relacionadas à sustentabilidade?"
                  ou "Como a ideia de horta comunitária se conecta com outras iniciativas?"
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <div className="fixed right-6 bottom-20 md:bottom-6 z-10">
        <Button
          id="create-idea-btn"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors border-4 border-white"
          aria-label="Add new idea"
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>
      
      <Footer />
      
      {/* Modal de criação de ideia */}
      <CreateIdeaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}