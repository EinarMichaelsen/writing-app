import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  // Check if DeepSeek API key is set
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "DeepSeek API key not found", configured: false },
      { status: 400 }
    );
  }

  try {
    // Initialize DeepSeek client (using OpenAI compatibility)
    const deepseek = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    // Test with a simple completion
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hello, are you working?" }],
      max_tokens: 10,
    });

    // If we get here, the API key is valid
    return NextResponse.json({ configured: true });
  } catch (error: any) {
    console.error("DeepSeek API error:", error);
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to connect to DeepSeek API", 
        configured: false 
      },
      { status: 500 }
    );
  }
} 