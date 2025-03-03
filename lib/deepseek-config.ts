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
    
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    return data.configured;
  } catch (error) {
    console.error("Error checking DeepSeek configuration:", error);
    return false;
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
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        maxTokens: options.maxTokens || 100,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to generate suggestion: ${response.status}`
      );
    }

    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    console.error("Error generating suggestion:", error);
    throw error;
  }
}

/**
 * Returns the DeepSeek model name
 */
export function getDeepSeekModel(modelName: string = "deepseek-chat"): string {
  return modelName;
} 