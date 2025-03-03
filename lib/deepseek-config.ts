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
    const response = await fetch("/api/test-deepseek");
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
    const response = await fetch("/api/generate-suggestion", {
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