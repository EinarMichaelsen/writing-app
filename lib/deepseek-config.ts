import OpenAI from "openai";

// DeepSeek configuration
interface DeepSeekOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Creates and returns an OpenAI compatible client configured for DeepSeek
 */
export function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set in environment variables");
  }
  
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1", // DeepSeek's OpenAI compatible endpoint
  });
}

/**
 * Checks if DeepSeek is configured by testing the API key
 */
export async function isDeepSeekConfigured(): Promise<boolean> {
  try {
    // Use relative URL for API calls to ensure they work in all environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/test-deepseek`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      // Add a reasonable timeout
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) return false;
    const data = await response.json();
    return data.configured;
  } catch (error) {
    console.error("Error checking DeepSeek configuration:", error);
    return false;
  }
}

/**
 * Fetches with retry logic
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit,
  retries = 2,
  backoff = 300
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Only retry on 5xx server errors and network/timeout failures
    if (!response.ok && response.status >= 500 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (error instanceof TypeError && retries > 0) {
      // Network error or timeout - retry
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Generates a suggestion using DeepSeek API
 */
export async function generateSuggestion(
  text: string,
  options: DeepSeekOptions = {}
): Promise<string> {
  try {
    // Use relative URL for API calls to ensure they work in all environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/generate-suggestion`;

    // Set a reasonable timeout for the client-side request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          maxTokens: options.maxTokens || 50, // Reduced from 100 to 50 for faster responses
          temperature: options.temperature || 0.7,
        }),
        signal: controller.signal,
      },
      2, // Number of retries
      500 // Initial backoff in ms
    );
    
    // Clear the timeout if the request succeeds
    clearTimeout(timeoutId);

    // Handle error responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Server error: ${response.status}` };
      }
      
      throw new Error(
        errorData.error || `Failed to generate suggestion: ${response.status}`
      );
    }

    const data = await response.json();
    return data.suggestion || '';
  } catch (error: any) {
    console.error("Error generating suggestion:", error);
    
    // Improve error messages for common issues
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw error;
  }
}

/**
 * Returns the DeepSeek model name
 */
export function getDeepSeekModel(modelName: string = "deepseek-chat"): string {
  return modelName;
} 