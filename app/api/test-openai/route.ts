import { OpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Simple test completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      error: error.message 
    }, { status: 500 });
  }
} 