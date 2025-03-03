import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Set a reasonable timeout for the DeepSeek API call - shorter than Vercel's 60s limit
const API_TIMEOUT = 10000; // Reduced to 10 seconds

// Configure for execution
export const config = {
  maxDuration: 25, // Reduced from 58 to 25 seconds to ensure faster response
  runtime: 'edge', // Use edge runtime for better performance
}

// Simple local fallback generation function
function generateSimpleFallback(text: string): string {
  if (!text || text.length < 2) return "and then";
  
  // Get the last few words
  const words = text.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  
  // Simple fallback options based on the last word
  if (lastWord.endsWith('.')) return "The";
  if (lastWord.endsWith('?')) return "I";
  if (lastWord.endsWith('!')) return "This";
  
  // Common continuations
  if (lastWord === "the") return "most";
  if (lastWord === "a") return "few";
  if (lastWord === "to") return "be";
  if (lastWord === "and") return "then";
  if (lastWord === "in") return "the";
  if (lastWord === "of") return "the";
  if (lastWord === "with") return "the";
  
  // Default fallback is to repeat the last word + ellipsis
  return `${lastWord}...`;
}

export async function POST(request: Request) {
  // Track processing time
  const startTime = Date.now();
  
  // Add response headers for better connection management
  const responseHeaders = new Headers({
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=25', // 25 seconds keep-alive
    'Cache-Control': 'no-store, private',
    'Content-Type': 'application/json',
  });

  try {
    // Parse the request early to fail fast if malformed
    let text: string;
    let maxTokens: number = 15; // Reduced from 100 to 15
    let temperature: number = 0.7;
    
    try {
      const body = await request.json();
      text = body.text || '';
      maxTokens = body.maxTokens || maxTokens;
      temperature = body.temperature || temperature;
      
      if (!text) {
        return NextResponse.json(
          { error: "Text is required", suggestion: "" },
          { status: 400, headers: responseHeaders }
        );
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format", suggestion: "" },
        { status: 400, headers: responseHeaders }
      );
    }
    
    // Limit to just the last 50 characters for extremely fast processing
    const lastChars = text.slice(-50); 
    
    // Check if DeepSeek API key is set
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    // If no API key, just use the local fallback immediately
    if (!apiKey) {
      console.warn("DeepSeek API key not found, using local fallback");
      const fallbackSuggestion = generateSimpleFallback(lastChars);
      return NextResponse.json({ 
        suggestion: fallbackSuggestion,
        fallback: true,
        processingTime: Date.now() - startTime
      }, { 
        headers: responseHeaders 
      });
    }

    // Use a simplified prompt for faster processing
    const prompt = `Continue this text: "${lastChars}"`;
    
    try {
      // Initialize DeepSeek client with tight timeout
      const deepseek = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
        timeout: API_TIMEOUT,
        maxRetries: 0, // No retries at SDK level, we handle them ourselves
      });
      
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      // Create a Promise that resolves to either the API response or a timeout/error
      const completionPromise = Promise.race([
        // DeepSeek API call
        deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          max_tokens: Math.min(maxTokens, 10), // Limit to 10 tokens max
          temperature: temperature,
        }),
        
        // Timeout promise that triggers if the API takes too long
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timed out')), API_TIMEOUT);
        })
      ]).catch(error => {
        // If API call fails for any reason, use the local fallback
        clearTimeout(timeoutId);
        console.warn("DeepSeek API error, using fallback:", error.message || "Unknown error");
        return null;
      }).finally(() => {
        clearTimeout(timeoutId);
      });
      
      // Wait for the API response or timeout
      const completion = await completionPromise as OpenAI.Chat.Completions.ChatCompletion | null;
      
      // If we got a valid response, return it
      if (completion) {
        const suggestion = completion.choices[0]?.message.content?.trim() || "";
        
        // Calculate total processing time
        const processingTime = Date.now() - startTime;
        console.log(`Suggestion generated in ${processingTime}ms`);
        
        return NextResponse.json({ 
          suggestion,
          processingTime 
        }, { 
          headers: responseHeaders 
        });
      }
      
      // If we reach here, the API call failed and we need to use local fallback
      const fallbackSuggestion = generateSimpleFallback(lastChars);
      return NextResponse.json({ 
        suggestion: fallbackSuggestion,
        fallback: true,
        processingTime: Date.now() - startTime
      }, { 
        headers: responseHeaders 
      });
    } catch (apiError: any) {
      // Handle any unexpected errors from the DeepSeek API call
      console.error("DeepSeek API unexpected error:", apiError);
      
      // Use local fallback for any API errors
      const fallbackSuggestion = generateSimpleFallback(lastChars);
      return NextResponse.json({ 
        suggestion: fallbackSuggestion,
        fallback: true,
        error: apiError.message || "API error",
        processingTime: Date.now() - startTime
      }, { 
        headers: responseHeaders 
      });
    }
  } catch (error: any) {
    // Handle any other unexpected errors
    console.error("Unexpected error generating suggestion:", error);
    
    // Always return a 200 response with a fallback suggestion
    // This prevents the client from seeing errors
    return NextResponse.json({ 
      suggestion: "and then",
      fallback: true,
      error: error.message || "Unknown error",
      processingTime: Date.now() - startTime
    }, { 
      status: 200, // Always return 200 to avoid client-side errors
      headers: responseHeaders 
    });
  }
} 