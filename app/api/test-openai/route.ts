import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: "OpenAI API key is missing in environment variables",
      }, { status: 500 });
    }
    
    // Test the API key with a simple completion
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: "Hello, are you working?",
        maxTokens: 50,
      });
      
      return NextResponse.json({ 
        success: true, 
        message: "API key is working correctly",
        response: text
      });
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      return NextResponse.json({ 
        success: false, 
        message: "API key is not working correctly",
        error: apiError instanceof Error ? apiError.message : String(apiError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Server error occurred",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 