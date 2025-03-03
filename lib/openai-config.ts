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
  options?: { maxTokens?: number; temperature?: number; maxRetries?: number; timeout?: number }
): Promise<string> {
  const maxRetries = options?.maxRetries || 2;
  const timeout = options?.timeout || 20000; // 20 seconds default timeout
  
  // Create a function for a single attempt
  const attemptRequest = async (attempt: number): Promise<string> => {
    // Create an AbortController for this attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      console.log(`Making suggestion request (attempt ${attempt}/${maxRetries})`);
      
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
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to generate suggestion: ${response.status}`);
      }

      return data.suggestion;
    } catch (error: any) {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);
      
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      // If we have retries left, don't throw yet
      if (attempt < maxRetries) {
        console.log(`Retrying... (${attempt}/${maxRetries})`);
        // Wait a bit before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptRequest(attempt + 1);
      }
      
      // No more retries, propagate the error
      throw error;
    }
  };
  
  // Start with the first attempt
  return attemptRequest(1);
} 