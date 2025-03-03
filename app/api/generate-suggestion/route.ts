import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Set a reasonable timeout for the DeepSeek API call - shorter than Vercel's 60s limit
const API_TIMEOUT = 25000; // 25 seconds

// Configure for longer execution
export const config = {
  maxDuration: 58, // Max duration in seconds (just under Vercel's 60s limit)
}

export async function POST(request: Request) {
  // Add response headers for longer cache and connection timeout
  const responseHeaders = new Headers({
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=30', // 30 seconds keep-alive
  });

  // Check if DeepSeek API key is set
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error("DeepSeek API key not found in environment variables");
    return NextResponse.json(
      { error: "DeepSeek API key not configured" },
      { status: 400, headers: responseHeaders }
    );
  }

  try {
    // Initialize DeepSeek client (using OpenAI compatibility)
    const deepseek = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
      timeout: API_TIMEOUT, // Set timeout for fetch requests
      maxRetries: 1, // Limit retries to avoid excessive timeouts
    });
    
    // Parse the request body
    const { text, maxTokens = 100, temperature = 0.7 } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    // Create the prompt - use a very short context to reduce response time
    const lastChars = text.slice(-100); // Get just the last 100 characters for faster processing
    const prompt = `
      Based on this text fragment, suggest a 2-3 word continuation:
      "${lastChars}"
      
      Suggestion:
    `.trim();

    // Start a timer to track total processing time
    const startTime = Date.now();
    
    try {
      // Use a Promise.race to implement timeout
      const completionPromise = deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: Math.min(maxTokens, 20), // Limit max tokens to ensure faster response
        temperature: temperature,
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('DeepSeek API request timed out')), API_TIMEOUT);
      });
      
      // Race the completion against the timeout
      const completion = await Promise.race([
        completionPromise,
        timeoutPromise,
      ]) as OpenAI.Chat.Completions.ChatCompletion;
      
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
    } catch (innerError: any) {
      // Handle specific DeepSeek errors
      console.error("DeepSeek API error:", innerError);
      
      if (innerError.message === 'DeepSeek API request timed out') {
        return NextResponse.json(
          { error: "DeepSeek API request timed out", code: 'timeout_error' },
          { status: 504, headers: responseHeaders }
        );
      } else if (innerError.status === 401 || innerError.message?.includes('Authentication')) {
        // Instead of failing, try an extremely simple fallback approach
        console.log("Authentication error with DeepSeek, using fallback generation");
        
        // Extremely simple fallback suggestion
        const words = lastChars.split(/\s+/);
        const lastTwoWords = words.slice(-2).join(' ');
        const fallbackSuggestion = lastTwoWords || "and then";
        
        return NextResponse.json({ 
          suggestion: fallbackSuggestion,
          fallback: true
        }, { 
          headers: responseHeaders 
        });
      }
      
      throw innerError; // Re-throw for the outer catch
    }
  } catch (error: any) {
    console.error("Error generating suggestion:", error);
    
    // Provide a more helpful error message
    let statusCode = 500;
    let errorMessage = "Failed to generate suggestion";
    
    if (error.message === 'DeepSeek API request timed out') {
      statusCode = 504;
      errorMessage = "Request to DeepSeek API timed out. Please try again.";
    } else if (error.status === 401 || error.message?.includes('Authentication')) {
      statusCode = 401;
      errorMessage = "Authentication failed with DeepSeek API. Please check your API key.";
    } else if (error.message?.includes('aborted') || error.message?.includes('canceled')) {
      statusCode = 499; // Client closed request
      errorMessage = "Request was canceled.";
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: statusCode,
        message: error.message || "Unknown error"
      },
      { status: statusCode, headers: responseHeaders }
    );
  }
} 