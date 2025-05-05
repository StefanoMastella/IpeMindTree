import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Upload, NetworkIcon, FileText } from "lucide-react";
import Header from "@/components/header";
import ObsidianUploader from "@/components/obsidian/obsidian-uploader";
import ObsidianNetwork from "@/components/obsidian/obsidian-network";
import ImportLogs from "@/components/obsidian/import-logs";

export default function ObsidianPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container py-6 space-y-8 max-w-7xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Obsidian Integration</h1>
          <p className="text-muted-foreground">
            Import your knowledge from Obsidian to enrich the AI context and discover new connections between ideas.
          </p>
        </div>
        
        <div className="bg-muted/50 border rounded-lg p-4 flex items-start space-x-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-medium">About Obsidian Integration</h3>
            <p className="text-sm text-muted-foreground">
              Obsidian is a powerful tool for managing your personal knowledge base through interconnected notes. 
              By importing your Obsidian markdown files, Ipê Mind Tree can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4 mt-2">
              <li>Analyze the knowledge network and identify patterns</li>
              <li>Enrich the context of AI queries to generate more relevant responses</li>
              <li>Create suggested connections between your Obsidian notes and Ipê Mind Tree ideas</li>
              <li>Facilitate insight discovery through knowledge network visualization</li>
            </ul>
          </div>
        </div>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <NetworkIcon className="h-4 w-4" />
              <span>Visualize</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-6">
            <ObsidianUploader />
          </TabsContent>
          
          <TabsContent value="network" className="mt-6">
            <ObsidianNetwork />
          </TabsContent>
          
          <TabsContent value="logs" className="mt-6">
            <ImportLogs />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}