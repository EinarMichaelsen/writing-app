import { NextResponse } from "next/server";
import OpenAI from "openai";
import { sanitizeMarkdown } from "../../lib/markdown-utils";

// Set a timeout for the DeepSeek API call - reduced for better responsiveness
const TIMEOUT_MS = 3000; // 3 seconds for much faster completions 

// Configure for longer execution in production
export const maxDuration = 30; // seconds

// Improved system prompt with special attention to paragraph and sentence structure
const SYSTEM_PROMPT = `You are an intelligent writing assistant that provides seamless text continuations like GitHub Copilot or Cursor.
Your task is to continue the user's text naturally, as if you were completing their thought mid-sentence or starting a new sentence/paragraph if appropriate.

IMPORTANT INSTRUCTIONS:
- Detect if the user is at the end of a sentence (period, question mark, etc.) or paragraph (double line break) and continue accordingly
- For incomplete sentences: continue naturally from the exact point where the text ended
- For complete sentences (ending with period, question mark, etc.): start a new sentence that follows logically 
- For ends of paragraphs: start a new paragraph with a related but slightly different thought
- Match the user's tone, style, vocabulary, and format precisely
- Continue with the same subject matter and context as the user's writing
- Keep completions concise and focused (2-3 sentences at most)
- Never add commentary, explanations, or annotations`;

// Specialized prompt for Markdown content with structure awareness
const MARKDOWN_PROMPT = `You are an expert writing assistant that continues the user's writing naturally in Markdown format.

CRITICAL INSTRUCTIONS:
1. Analyze the user's text structure carefully:
   - If they are mid-sentence, continue that sentence naturally
   - If they ended with a period/question mark, start a new sentence
   - If they ended a paragraph, start a new related paragraph
   - If they were creating a list, continue the list with similar items
   - If they were writing a heading, continue with body text

2. Continue the user's exact writing content and subject matter
3. Match their tone, style, and formatting precisely
4. Maintain the exact same writing quality and complexity
5. Never write about Markdown itself or explain formatting
6. Do not add meta-commentary or suggestions
7. Maintain the same patterns of sentence length and complexity`;

// Detect sentence and paragraph endings
function analyzeTextStructure(text: string) {
  const trimmedText = text.trim();
  // Check if text ends with common sentence-ending punctuation
  const endsSentence = /[.!?:]\s*$/.test(trimmedText);
  // Check if text ends with a new paragraph marker (double line break, etc.)
  const endsWithNewline = /\n\s*\n\s*$/.test(text) || /\n\s*$/.test(text);
  // Check if it's a list item
  const isList = /^[\s\n]*([-*+]|\d+\.)\s/.test(trimmedText.split('\n').pop() || '');
  // Check if it's a heading
  const isHeading = /^[\s\n]*#{1,6}\s/.test(trimmedText.split('\n').pop() || '');
  
  return {
    endsSentence,
    endsWithNewline,
    isList,
    isHeading,
    trimmedText
  };
}

// Configure the DeepSeek client
function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || "";
  
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1", // Using v1 endpoint for reliability
    timeout: TIMEOUT_MS,
  });
}

function getDeepSeekModel() {
  return "deepseek-chat"; // Using chat model for best results
}

export async function POST(request: Request) {
  // Add response headers for better performance
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "Connection": "keep-alive",
  };

  try {
    // Check if DeepSeek API key is configured
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DeepSeek API key not configured");
      return NextResponse.json(
        { suggestion: "", error: "DeepSeek API key not configured" },
        { status: 500, headers }
      );
    }

    // Parse the request body
    const { text, isMarkdown = false, maxTokens = 15, temperature = 0.1 } = await request.json();

    // Ensure we have text to work with
    if (!text || typeof text !== "string") {
      console.error("Invalid text input");
      return NextResponse.json(
        { suggestion: "", error: "Invalid text input" },
        { status: 400, headers }
      );
    }

    // Extract up to 3000 characters with smarter context handling
    // Always include the entire last paragraph for better coherence
    let context = text;
    if (text.length > 3000) {
      // Find a good breakpoint (paragraph or sentence)
      const lastParagraphMatch = text.slice(-3000).match(/(?:\n\s*\n|\r\n\s*\r\n)/);
      const breakPoint = lastParagraphMatch && lastParagraphMatch.index !== undefined
        ? text.length - 3000 + lastParagraphMatch.index 
        : text.length - 3000;
      context = text.slice(breakPoint);
    }
    
    // Analyze the text structure for better completions
    const structure = analyzeTextStructure(context);

    // Create a DeepSeek client
    const client = getDeepSeekClient();

    try {
      const startTime = Date.now();
      
      // Select the appropriate prompt
      const systemPrompt = isMarkdown ? MARKDOWN_PROMPT : SYSTEM_PROMPT;
      
      // Enhance prompt with structure info for better completions
      let enhancedPrompt = systemPrompt;
      if (structure.endsSentence) {
        enhancedPrompt += "\n\nNote: The user's text ends with a complete sentence. Start a new sentence that follows logically.";
      } else if (structure.endsWithNewline) {
        enhancedPrompt += "\n\nNote: The user's text ends with a paragraph. Start a new paragraph with a related thought.";
      } else if (structure.isList) {
        enhancedPrompt += "\n\nNote: The user is writing a list. Continue with another list item in the same format.";
      } else if (structure.isHeading) {
        enhancedPrompt += "\n\nNote: The user just wrote a heading. Continue with body text under that heading.";
      } else {
        enhancedPrompt += "\n\nNote: The user is mid-sentence. Continue that exact sentence naturally.";
      }

      // Generate a completion with optimized parameters for faster response
      const completion = await client.chat.completions.create({
        model: getDeepSeekModel(),
        messages: [
          {
            role: "system",
            content: enhancedPrompt
          },
          { role: "user", content: context }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.1,
        presence_penalty: 0.0, // Reduced further for faster suggestions
        frequency_penalty: 0.0, // Reduced further for faster suggestions
        stream: false
      });

      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      
      // Extract the suggestion from the completion
      let suggestion = completion.choices[0]?.message?.content || "";

      // Minimal cleaning of the suggestion
      suggestion = suggestion.trim();

      // Process markdown content appropriately
      if (isMarkdown) {
        suggestion = sanitizeMarkdown(suggestion);
        
        // Ensure there are no HTML tags in the markdown suggestion
        if (suggestion.includes('<') && suggestion.includes('>')) {
          suggestion = suggestion.replace(/<\/?[^>]+(>|$)/g, "");
        }
      } else {
        // Clean HTML tags from non-HTML content when appropriate
        if (suggestion.startsWith('<p>') || suggestion.includes('</p>') || 
            suggestion.includes('<h') || suggestion.includes('</h')) {
          suggestion = suggestion.replace(/<\/?[^>]+(>|$)/g, "");
        }
        
        // Remove any markdown or code formatting
        if (suggestion.startsWith("```") && suggestion.includes("\n")) {
          suggestion = suggestion.split("\n").slice(1).join("\n");
          if (suggestion.endsWith("```")) {
            suggestion = suggestion.slice(0, -3).trim();
          }
        }
      }

      // Intelligently adjust the suggestion based on context
      // If text ends with space and suggestion starts with space, remove one
      if (text.endsWith(" ") && suggestion.startsWith(" ")) {
        suggestion = suggestion.substring(1);
      }
      
      // If text doesn't end with space and suggestion doesn't start with punctuation, add space
      if (!text.endsWith(" ") && !suggestion.startsWith(".") && 
          !suggestion.startsWith(",") && !suggestion.startsWith("!") && 
          !suggestion.startsWith("?") && !suggestion.startsWith(":") && 
          !suggestion.startsWith(";") && !suggestion.startsWith(")") &&
          !text.endsWith("\n") && suggestion.length > 0) {
        suggestion = " " + suggestion;
      }

      // Return the suggestion with timing info
      return NextResponse.json({ 
        suggestion, 
        timeTaken,
        analysis: {
          endsSentence: structure.endsSentence,
          endsWithNewline: structure.endsWithNewline,
          isList: structure.isList,
          isHeading: structure.isHeading
        }
      }, { headers });
    } catch (error: any) {
      // Handle errors with consistent response formatting
      console.error("Error generating completion:", error);
      
      return NextResponse.json(
        { 
          suggestion: "", 
          error: error.message || "Failed to generate suggestion",
          status: error.status || 500
        },
        { status: error.status || 500, headers }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { suggestion: "", error: "Internal server error" },
      { status: 500, headers }
    );
  }
} 