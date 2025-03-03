import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Set a reasonable timeout for the DeepSeek API call
const API_TIMEOUT = 25000; // 25 seconds

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
      timeout: API_TIMEOUT, // Set timeout for fetch requests
    });
    
    // Parse the request body
    const { text, maxTokens = 100, temperature = 0.7 } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Create the prompt - use a shorter context to reduce response time
    const lastChars = text.slice(-200); // Get just the last 200 characters for faster processing
    const prompt = `
      Based on the following text, suggest a brief continuation (2-5 words):
      
      Text: "${lastChars}"
      
      Suggested continuation:
    `;

    // Create a promise that will reject after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DeepSeek API request timed out')), API_TIMEOUT);
    });

    // Race the API request against the timeout
    const completionPromise = deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: Math.min(maxTokens, 50), // Limit max tokens to ensure faster response
      temperature: temperature,
    });

    // Wait for either the completion or the timeout
    const completion = await Promise.race([
      completionPromise,
      timeoutPromise,
    ]) as OpenAI.Chat.Completions.ChatCompletion;

    const suggestion = completion.choices[0]?.message.content?.trim() || "";

    return NextResponse.json({ suggestion });
  } catch (error: any) {
    console.error("Error generating suggestion:", error);
    
    // Provide a more helpful error message
    let statusCode = 500;
    let errorMessage = "Failed to generate suggestion";
    
    if (error.message === 'DeepSeek API request timed out') {
      statusCode = 504;
      errorMessage = "Request to DeepSeek API timed out. Please try again.";
    } else if (error.status === 401) {
      statusCode = 401;
      errorMessage = "Authentication failed with DeepSeek API. Please check your API key.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 