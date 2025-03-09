import { NextResponse } from 'next/server';
import suggestionCache from '@/lib/cache-utils';

/**
 * Returns statistics about the suggestion cache
 * Useful for monitoring cache performance
 */
export async function GET() {
  try {
    // Get cache statistics
    const stats = suggestionCache.getStats();
    
    // Calculate hit rate
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
    
    return NextResponse.json({
      ...stats,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    
    return NextResponse.json(
      { error: "Failed to get cache statistics" },
      { status: 500 }
    );
  }
} 