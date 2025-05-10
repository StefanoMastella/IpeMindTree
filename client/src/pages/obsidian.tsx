import { useState } from 'react';
import ObsidianUploader from '@/components/obsidian/obsidian-uploader';
import ObsidianNetwork from '@/components/obsidian/obsidian-network';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ObsidianPage() {
  const [activeTab, setActiveTab] = useState('network');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Obsidian Knowledge Network</h1>
      <p className="text-muted-foreground">
        Import Obsidian files to visualize connections between your notes, create knowledge maps, and explore relationships.
      </p>

      <Tabs defaultValue="network" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="network">Network Visualization</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="mt-6">
          <ObsidianNetwork />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <ObsidianUploader />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}