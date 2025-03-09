import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    // Check if DeepSeek API key is set
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    // Log more detailed information (without exposing the full key)
    console.log('API Key check:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      firstChar: apiKey ? apiKey.charAt(0) : 'none',
      lastChar: apiKey ? apiKey.charAt(apiKey.length - 1) : 'none'
    });
    
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        error: "DeepSeek API key not found in environment variables",
        envVars: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')).join(', ')
      }, { status: 400 });
    }

    try {
      // Initialize DeepSeek client
      const deepseek = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
      });
      
      // Test the API with a minimal request
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hello, this is a test." }],
        max_tokens: 5,
      });
      
      // If we get here, the API is configured correctly
      return NextResponse.json({
        configured: true,
        message: "DeepSeek API is configured correctly",
        response: completion.choices[0]?.message.content || "No response"
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
    console.error("Unexpected error in test-deepseek route:", error);
    
    return NextResponse.json({
      configured: false,
      error: error.message || "Unexpected error",
    }, { status: 500 });
  }
} 