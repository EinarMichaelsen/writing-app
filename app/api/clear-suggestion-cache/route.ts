import { NextResponse } from 'next/server';
import suggestionCache from '@/lib/cache-utils';

/**
 * Clears the suggestion cache
 * This is useful during development or when testing
 * It requires authentication to prevent abuse
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Simple authentication using a key from environment variables
    // This isn't highly secure, but prevents casual abuse
    const authKey = process.env.CACHE_CLEAR_KEY || "development-mode";
    
    if (body.key !== authKey) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
    
    // Clear the cache
    suggestionCache.clear();
    
    return NextResponse.json({
      success: true,
      message: "Suggestion cache cleared"
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
} 