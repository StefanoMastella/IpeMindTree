import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ApiTest() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testOpenAI = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Using a cheaper model for testing
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello in Portuguese" }
          ]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Unknown error occurred');
      }
      
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error testing OpenAI API:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-2">API Test</h3>
      
      <Button 
        onClick={testOpenAI} 
        disabled={isLoading}
        className="mb-4"
      >
        {isLoading ? "Testing..." : "Test OpenAI API"}
      </Button>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800">
          <p className="font-medium">Result:</p>
          <pre className="whitespace-pre-wrap text-sm mt-2">{result}</pre>
        </div>
      )}
    </div>
  );
}