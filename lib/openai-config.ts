import { openai } from '@ai-sdk/openai';

/**
 * Get configured OpenAI model for client-side usage
 * @param modelName The name of the OpenAI model to use
 * @returns The configured OpenAI model
 */
export function getOpenAIModel(modelName: string) {
  return openai(modelName);
}

/**
 * Check if OpenAI API key is configured
 * @returns Promise resolving to boolean indicating if OpenAI is configured
 */
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

/**
 * Generate a suggestion using OpenAI API
 * @param text The current text to generate a suggestion for
 * @param options Optional parameters for the suggestion
 * @returns The generated suggestion
 */
export async function generateSuggestion(
  text: string, 
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  try {
    const response = await fetch('/api/generate-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate suggestion');
    }

    return data.suggestion;
  } catch (error) {
    console.error('Error generating suggestion:', error);
    throw error;
  }
} 