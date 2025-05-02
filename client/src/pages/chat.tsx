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
              <p className="text-gray-600 mt-2">
                Converse com a IA da Ipê Mind Tree e descubra conexões entre ideias
              </p>
            </div>
            
            <ChatInterface />
          </div>
          
          <div className="lg:col-span-1">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">Sobre</TabsTrigger>
                <TabsTrigger value="ideas">Ideias</TabsTrigger>
                <TabsTrigger value="tips">Dicas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      O que é a Ipê Mind?
                    </CardTitle>
                    <CardDescription>
                      Conheça nossa assistente virtual
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      A Ipê Mind é uma assistente virtual que conhece todas as ideias compartilhadas
                      na plataforma Ipê Mind Tree. Ela pode ajudar você a:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Descobrir ideias relacionadas a um tema específico</li>
                      <li>Entender as conexões entre diferentes ideias</li>
                      <li>Obter sugestões de colaboração entre projetos</li>
                      <li>Explorar o conhecimento coletivo da comunidade</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="ideas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                      Ideias Populares
                    </CardTitle>
                    <CardDescription>
                      Tente perguntar sobre estas ideias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <h4 className="font-medium">Horta Comunitária</h4>
                      <p className="text-xs text-gray-500">
                        Projeto de agricultura urbana colaborativa
                      </p>
                    </div>
                    <div className="border p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <h4 className="font-medium">Festival de Artes</h4>
                      <p className="text-xs text-gray-500">
                        Evento cultural para apresentações artísticas
                      </p>
                    </div>
                    <div className="border p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <h4 className="font-medium">Oficinas de Capacitação</h4>
                      <p className="text-xs text-gray-500">
                        Compartilhamento de habilidades entre moradores
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