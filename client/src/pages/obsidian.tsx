import { useState } from 'react';
import ObsidianUploader from '@/components/obsidian/obsidian-uploader';
import ObsidianNetwork from '@/components/obsidian/obsidian-network';
import ImportLogs from '@/components/obsidian/import-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Upload, FileText } from 'lucide-react';

export default function ObsidianPage() {
  const [activeTab, setActiveTab] = useState('network');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Obsidian Knowledge Network</h1>
      <p className="text-muted-foreground">
        Import Obsidian files to visualize connections between your notes, create knowledge maps, and explore relationships.
      </p>

      <Tabs defaultValue="network" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span>Visualização</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Importar</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="mt-6">
          <ObsidianNetwork />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <ObsidianUploader />
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <ImportLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}