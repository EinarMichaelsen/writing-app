import { OpenAI } from '@ai-sdk/openai';
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
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Simple test completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello, are you working?" }],
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "API key is working correctly",
      response: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "API key is not working correctly",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 