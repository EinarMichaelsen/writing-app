import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  // Check if DeepSeek API key is set
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "DeepSeek API key not found" },
      { status: 400 }
    );
  }

  try {
    // Initialize DeepSeek client (using OpenAI compatibility)
    const deepseek = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });
    
    // Parse the request body
    const { text, maxTokens = 100, temperature = 0.7 } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Create the prompt
    const lastChars = text.slice(-300); // Get the last 300 characters for context
    const prompt = `
      Based on the following text, suggest a brief, contextually relevant continuation that helps the writer overcome writer's block. Keep it concise, relevant, and creative.
      
      Text: "${lastChars}"
      
      Suggested continuation:
    `;

    // Generate a suggestion using the DeepSeek API
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const suggestion = completion.choices[0]?.message.content || "";

    return NextResponse.json({ suggestion });
  } catch (error: any) {
    console.error("Error generating suggestion:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to generate suggestion" },
      { status: 500 }
    );
  }
} 