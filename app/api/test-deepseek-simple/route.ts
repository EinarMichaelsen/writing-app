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
        configured: false,
        error: "DeepSeek API key not found in environment variables"
      }, { status: 400 });
    }

    try {
      // Initialize DeepSeek client with a longer timeout
      const deepseek = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
        timeout: 30000, // 30 seconds timeout
      });
      
      // Test the API with a minimal request
      const startTime = Date.now();
      console.log("Starting DeepSeek API test call...");
      
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello, this is a test." }],
        max_tokens: 5,
        temperature: 0.1,
      });
      
      const endTime = Date.now();
      console.log(`DeepSeek API call completed in ${endTime - startTime}ms`);
      
      // If we get here, the API is configured correctly
      return NextResponse.json({
        configured: true,
        message: "DeepSeek API is configured correctly",
        response: completion.choices[0]?.message.content || "No response",
        timeTaken: endTime - startTime
      });
    } catch (error: any) {
      // If there's an error with the API call, return the error
      console.error("Error testing DeepSeek API:", error);
      
      return NextResponse.json({
        configured: false,
        error: error.message || "Unknown error",
        type: error.type || error.name || "Unknown error type",
        status: error.status || "Unknown status"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Unexpected error in test-deepseek-simple route:", error);
    
    return NextResponse.json({
      configured: false,
      error: error.message || "Unexpected error",
    }, { status: 500 });
  }
} 