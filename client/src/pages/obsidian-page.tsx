import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";
import ObsidianUploader from "@/components/obsidian/obsidian-uploader";
import ObsidianNetwork from "@/components/obsidian/obsidian-network";
import ImportLogs from "@/components/obsidian/import-logs";
import { Braces, Upload, BarChart3 } from "lucide-react";

export default function ObsidianPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Obsidian Knowledge Integration
          </h1>
          
          <p className="text-gray-400 max-w-3xl">
            Incorpore seu conhecimento pessoal do Obsidian ao cérebro coletivo do Ipê Mind Tree.
            Faça upload de arquivos markdown, visualize a rede de conexões e enriqueça a base de conhecimento
            para perguntas mais informadas.
          </p>
          
          <Tabs defaultValue="upload" className="mt-6">
            <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">Importar</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Braces className="h-4 w-4" />
                <span className="hidden md:inline">Visualizar</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-4 flex justify-center">
              <ObsidianUploader />
            </TabsContent>
            
            <TabsContent value="network" className="mt-4">
              <ObsidianNetwork />
            </TabsContent>
            
            <TabsContent value="logs" className="mt-4">
              <ImportLogs />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}