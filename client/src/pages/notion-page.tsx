import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function NotionPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [username, setUsername] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleInitialize = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Notion API key",
        variant: "destructive",
      });
      return;
    }

    setIsInitializing(true);
    try {
      const response = await apiRequest("POST", "/api/notion/initialize", {
        apiKey: apiKey.trim(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Notion API initialized successfully",
        });
        setInitialized(true);
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Failed to initialize Notion API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error initializing Notion:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleImport = async () => {
    if (!initialized) {
      toast({
        title: "Not Connected",
        description: "Please connect to Notion API first",
        variant: "destructive",
      });
      return;
    }

    if (!databaseId.trim()) {
      toast({
        title: "Database ID Required",
        description: "Please enter the Notion database ID",
        variant: "destructive",
      });
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your username for import tracking",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiRequest("POST", "/api/notion/import", {
        databaseId: databaseId.trim(),
        username: username.trim(),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Import Started",
          description: "Notion database import has started. This may take some time to complete.",
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.message || "Failed to import from Notion",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing from Notion:", error);
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
        Notion Integration
      </h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Connect to Notion
            </CardTitle>
            <CardDescription>
              Connect to Notion API to import projects into Ipê Mind Tree
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Notion API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Notion API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isInitializing || initialized}
                />
                <p className="text-sm text-gray-500">
                  You can find your API key in the Notion integrations page.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleInitialize}
              disabled={isInitializing || !apiKey || initialized}
            >
              {isInitializing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialized ? "Connected" : isInitializing ? "Connecting..." : "Connect to Notion"}
            </Button>
          </CardFooter>
        </Card>

        <Card className={!initialized ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Projects
            </CardTitle>
            <CardDescription>
              Import projects from a Notion database into Ipê Mind Tree
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="databaseId">Notion Database ID</Label>
                <Input
                  id="databaseId"
                  placeholder="Enter the database ID"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  disabled={isImporting || !initialized}
                />
                <p className="text-sm text-gray-500">
                  The ID can be found in the database URL: notion.so/[workspace]/[database-id]
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Your Name</Label>
                <Input
                  id="username"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isImporting || !initialized}
                />
                <p className="text-sm text-gray-500">
                  This will be recorded with the import for tracking purposes.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleImport}
              disabled={isImporting || !initialized || !databaseId || !username}
            >
              {isImporting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isImporting ? "Importing..." : "Import Projects"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}