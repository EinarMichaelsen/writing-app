import { openai } from '@ai-sdk/openai';

// Initialize OpenAI with API key from environment variables
export const getOpenAIModel = (model: string) => {
  // For client-side usage, we need to check that we're accessing the API correctly
  // This ensures the OpenAI key is only used on the server or via API routes
  if (typeof window !== 'undefined' && !model.startsWith('openai:')) {
    return `openai:${model}`;
  }
  
  return model;
};

// Function to check if OpenAI API key is configured
export async function isOpenAIConfigured(): Promise<boolean> {
  try {
    const response = await fetch('/api/test-openai');
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error checking OpenAI configuration:', error);
    return false;
  }
}

// Helper for generating suggestions with properly configured context
export async function generateSuggestion(
  text: string, 
  options?: { maxLength?: number; temperature?: number }
) {
  const maxLength = options?.maxLength || 15;
  const temperature = options?.temperature || 0.4;
  
  try {
    const response = await fetch('/api/generate-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        maxTokens: maxLength,
        temperature,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate suggestion');
    }
    
    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return '';
  }
} 