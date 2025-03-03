import OpenAI from "openai";

// DeepSeek configuration
interface DeepSeekOptions {
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
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
    timeout: 15000, // 15 second timeout for the DeepSeek SDK
    maxRetries: 1,  // Limit retries to avoid excessive timeouts
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
    
    // We'll use a much shorter timeout for configuration checks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return false;
      const data = await response.json();
      return data.configured;
    } catch (error) {
      // If this fails, we'll assume DeepSeek isn't configured
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
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
  backoff = 300,
  timeout = 8000
): Promise<Response> {
  // Create a new abort controller for each attempt
  const controller = new AbortController();
  
  // Create a merged signal if the options already had one
  const originalSignal = options.signal;
  options.signal = controller.signal;
  
  // Set up the timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // If the original signal aborts, we should abort too
  const signalListener = () => {
    controller.abort();
    clearTimeout(timeoutId);
  };
  
  if (originalSignal) {
    originalSignal.addEventListener('abort', signalListener);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Clean up
    clearTimeout(timeoutId);
    if (originalSignal) {
      originalSignal.removeEventListener('abort', signalListener);
    }
    
    // Only retry on 5xx server errors and network/timeout failures
    if ((!response.ok && response.status >= 500) && retries > 0) {
      // Wait with exponential backoff before retrying
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
    }
    
    return response;
  } catch (error: unknown) {
    // Clean up
    clearTimeout(timeoutId);
    if (originalSignal) {
      originalSignal.removeEventListener('abort', signalListener);
    }
    
    if (((error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))) && retries > 0) {
      // Network error or timeout - retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
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
  const maxRetries = options.maxRetries ?? 2;
  const timeout = options.timeout ?? 8000; // 8 second default timeout
  
  try {
    // Use relative URL for API calls to ensure they work in all environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/generate-suggestion`;

    // Set up the main controller for the overall operation
    const controller = new AbortController();
    
    // Generate a very minimal context to avoid long processing times
    // Just use the last few words as context
    const words = text.split(/\s+/);
    const lastWords = words.slice(-10).join(' ');
    
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: lastWords, // Send only the last few words rather than the full text
          maxTokens: options.maxTokens || 15, // Minimal tokens for faster responses
          temperature: options.temperature || 0.7,
        }),
        signal: controller.signal,
      },
      maxRetries,
      300, // Initial backoff in ms
      timeout // Use the timeout from options or default
    );

    // Handle error responses
    if (!response.ok) {
      // If we got a 504, throw a specific timeout error
      if (response.status === 504) {
        throw new Error('Request timed out. The API may be overloaded.');
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Server error: ${response.status}` };
      }
      
      // If we get an authentication error but we have text, generate a simple fallback
      if (response.status === 401 && lastWords) {
        console.log("Authentication error, using simple client-side fallback");
        // Return a simple continuation based on the last word
        return `${lastWords.split(' ').pop()} ...`;
      }
      
      throw new Error(
        errorData.error || `Failed to generate suggestion: ${response.status}`
      );
    }

    const data = await response.json();
    
    if (data.fallback) {
      console.log("Server used fallback generation");
    }
    
    return data.suggestion || '';
  } catch (error: any) {
    console.error("Error generating suggestion:", error);
    
    // For timeout errors, try to provide a simple fallback rather than failing
    if (error.name === 'AbortError' || error.message?.includes('timed out') || error.message?.includes('504')) {
      if (text) {
        // Return a very simple continuation based on the last word if possible
        const lastWord = text.split(/\s+/).pop() || '';
        if (lastWord.length > 2) {
          return `${lastWord} ...`;
        }
      }
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