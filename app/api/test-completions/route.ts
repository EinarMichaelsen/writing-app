import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    // Check if DeepSeek API key is set
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    console.log('API Key check:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      firstChar: apiKey ? apiKey.charAt(0) : 'none',
      lastChar: apiKey ? apiKey.charAt(apiKey.length - 1) : 'none'
    });
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "DeepSeek API key not found in environment variables"
      }, { status: 400 });
    }

    try {
      // Initialize DeepSeek client with beta API
      const deepseek = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/beta",
        timeout: 30000, // 30 seconds timeout
      });
      
      // Test the completions API with a simple prompt
      const startTime = Date.now();
      console.log("Starting DeepSeek completions test...");
      
      const completion = await deepseek.completions.create({
        model: "deepseek-coder-6.7b-instruct",
        prompt: "Complete this sentence: The quick brown fox jumps over",
        max_tokens: 10,
        temperature: 0.2,
      });
      
      const endTime = Date.now();
      console.log(`DeepSeek completions test completed in ${endTime - startTime}ms`);
      
      // Return the completion
      return NextResponse.json({
        success: true,
        completion: completion.choices[0]?.text || "No completion",
        timeTaken: endTime - startTime
      });
    } catch (error: any) {
      // If there's an error with the API call, return the error
      console.error("Error testing DeepSeek completions:", error);
      
      return NextResponse.json({
        success: false,
        error: error.message || "Unknown error",
        type: error.type || error.name || "Unknown error type",
        status: error.status || "Unknown status"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Unexpected error in test-completions route:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message || "Unexpected error",
    }, { status: 500 });
  }
} 