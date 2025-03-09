import { NextResponse } from "next/server";

export async function GET() {
  // Check if DeepSeek API key is configured
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  // Return information about the API key (without revealing the full key)
  return NextResponse.json({
    exists: !!apiKey,
    length: apiKey?.length || 0,
    firstChar: apiKey ? apiKey.charAt(0) : null,
    lastChar: apiKey ? apiKey.charAt(apiKey.length - 1) : null,
    // Show the first 5 characters masked with asterisks
    maskedKey: apiKey ? `${apiKey.substring(0, 3)}${'*'.repeat(apiKey.length - 6)}${apiKey.substring(apiKey.length - 3)}` : null,
  });
} 