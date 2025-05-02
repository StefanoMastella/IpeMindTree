import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testGeminiAPI } from '@/lib/gemini';

export default function ApiTest() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testGemini = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await testGeminiAPI(
        "Say hello in Portuguese and explain what the IMT (Ipê Mind Totem) is in 1-2 sentences."
      );
      
      setResult(response);
    } catch (err) {
      console.error('Error testing Gemini API:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-2">AI API Test</h3>
      
      <Button 
        onClick={testGemini} 
        disabled={isLoading}
        className="mb-4"
      >
        {isLoading ? "Testing..." : "Test Gemini API"}
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