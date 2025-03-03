import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = 'edge';

export async function POST(req: Request) {
  // Check if DeepSeek API key is set
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "DeepSeek API key not found" },
      { status: 400 }
    );
  }

  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required and must be an array" },
        { status: 400 }
      );
    }

    // Initialize DeepSeek client (using OpenAI compatibility)
    const deepseek = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });
    
    // Prepare the system message with context
    const systemMessage = `You are an AI writing assistant helping a user with their document. 
                          Be concise, helpful, and focus on improving the user's writing. 
                          Provide specific suggestions when asked.
                          ${context || ""}`;

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call DeepSeek API with streaming
          const completion = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemMessage },
              ...messages
            ],
            stream: true,
          });

          // Process the streaming response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Encode and send the chunk
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          
          controller.close();
        } catch (error) {
          console.error("Error streaming from DeepSeek:", error);
          controller.error(error);
        }
      }
    });

    // Return the stream as a response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 }
    );
  }
} 