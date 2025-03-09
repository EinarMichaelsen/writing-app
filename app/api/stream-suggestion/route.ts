import { NextResponse } from "next/server";
import OpenAI from "openai";

// Set a timeout for the DeepSeek API call
const TIMEOUT_MS = 10000; // Increase to 10 seconds

// Configure for longer execution
export const maxDuration = 58; // seconds

// Configure the DeepSeek client
function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com/v1",
    timeout: TIMEOUT_MS,
  });
}

function getDeepSeekModel() {
  return "deepseek-chat";
}

export async function POST(request: Request) {
  // Add response headers for streaming
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store, max-age=0",
    "Connection": "keep-alive",
  };

  try {
    // Check if DeepSeek API key is configured
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DeepSeek API key not configured");
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ suggestion: "", error: "DeepSeek API key not configured", clear: true })));
          controller.close();
        },
      });
      return new Response(stream, { headers });
    }

    // Parse the request body
    const { text, maxTokens = 15, temperature = 0.1 } = await request.json();

    // Ensure we have text to work with
    if (!text || typeof text !== "string") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ suggestion: "", error: "Invalid text input", clear: true })));
          controller.close();
        },
      });
      return new Response(stream, { headers });
    }

    // Extract the last 500 characters for context
    const context = text.slice(-500);

    // Create an encoder for the stream
    const encoder = new TextEncoder();

    // Create a stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create a DeepSeek client
          const client = getDeepSeekClient();
          
          console.log("Starting streaming suggestion generation...");
          const startTime = Date.now();

          // Generate a streaming completion
          const completion = await client.chat.completions.create({
            model: getDeepSeekModel(),
            messages: [
              {
                role: "system",
                content: "You are a writing assistant that provides natural, contextual continuations of text. Your completions should be brief (1-10 words) and flow naturally from the existing text. Avoid generic transitions unless they truly fit the context. Focus on continuing the exact thought or sentence pattern that was started."
              },
              { role: "user", content: context }
            ],
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: 0.1, // Focus on most likely tokens
            presence_penalty: 0.1, // Slight penalty for repeating tokens
            frequency_penalty: 0.3, // Higher penalty for repeating phrases
            stream: true,
          });
          
          let fullSuggestion = "";
          let wordCount = 0;
          const maxWords = 10;
          
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullSuggestion += content;
              
              // Count words to limit to 10 max
              const words = fullSuggestion.split(/\s+/);
              wordCount = words.length;
              
              // Clean up the suggestion
              let cleanSuggestion = fullSuggestion
                .replace(/^["']|["']$/g, '') // Remove quotes
                .trim();
              
              // Only show up to 10 words
              if (wordCount > maxWords) {
                const limitedWords = cleanSuggestion.split(/\s+/).slice(0, maxWords);
                cleanSuggestion = limitedWords.join(' ');
                
                // Send the final suggestion
                controller.enqueue(encoder.encode(JSON.stringify({ 
                  suggestion: cleanSuggestion, 
                  clear: true 
                })));
                
                // End the stream
                controller.close();
                break;
              }
              
              // Send the current suggestion
              controller.enqueue(encoder.encode(JSON.stringify({ 
                suggestion: cleanSuggestion, 
                clear: true 
              })));
            }
          }
          
          const endTime = Date.now();
          console.log(`Streaming suggestion completed in ${endTime - startTime}ms`);
          
          // Close the stream when done
          controller.close();
        } catch (error: any) {
          // Handle specific errors
          console.error("Error in streaming suggestion:", error);
          
          // Handle authentication errors
          if (error.status === 401 || error.message?.includes('authentication')) {
            controller.enqueue(encoder.encode(JSON.stringify({ 
              suggestion: "", 
              error: "Authentication failed", 
              clear: true 
            })));
          } else {
            controller.enqueue(encoder.encode(JSON.stringify({ 
              suggestion: "", 
              error: "Failed to generate suggestion", 
              clear: true 
            })));
          }
          
          // Close the stream
          controller.close();
        }
      }
    });
    
    // Return the stream
    return new Response(stream, { headers });
  } catch (error) {
    console.error("Error processing request:", error);
    
    // Create a stream with an error message
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ 
          suggestion: "", 
          error: "Internal server error", 
          clear: true 
        })));
        controller.close();
      },
    });
    
    return new Response(stream, { headers });
  }
} 