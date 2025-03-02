import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: "OpenAI API key is missing in environment variables",
      }, { status: 500 });
    }
    
    // Parse request body
    const body = await request.json();
    const { text, maxTokens = 15, temperature = 0.4 } = body;
    
    if (!text) {
      return NextResponse.json({ 
        success: false, 
        message: "Text input is required",
      }, { status: 400 });
    }
    
    // Generate suggestion using OpenAI
    const { text: suggestion } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are an intelligent autocomplete system. Complete the following text with a natural suggestion that would help the writer continue their document. Your suggestion should be brief (2-10 words) and contextually relevant. Only provide the completion text without any explanation or additional content.
      
Document so far:
${text.slice(-300)}`,
      maxTokens,
      temperature,
    });
    
    // Return the cleaned suggestion
    return NextResponse.json({ 
      success: true, 
      suggestion: suggestion.trim(),
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Error generating suggestion",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 