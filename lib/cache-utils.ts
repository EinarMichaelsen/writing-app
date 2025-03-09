/**
 * Simple in-memory LRU cache for suggestions to reduce API calls
 * This helps mitigate timeouts by reducing the number of calls to DeepSeek
 */

// Cache item structure with expiration
interface CacheItem<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;       // Maximum number of items to store
  ttl: number;           // Time to live in milliseconds
  fuzzyMatch: boolean;   // Whether to use fuzzy matching for similar inputs
  fuzzyThreshold: number; // Threshold for fuzzy matching (higher = stricter)
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  ttl: number;
  lastCleared: number | null;
}

// Default cache configuration
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 500,        // Store up to 500 items
  ttl: 1000 * 60 * 60, // 1 hour TTL
  fuzzyMatch: true,    // Enable fuzzy matching
  fuzzyThreshold: 0.8, // 80% similarity required for fuzzy match
};

/**
 * Client-side cache key in localStorage
 */
const CLIENT_CACHE_KEY = "tabwords_suggestion_cache";

/**
 * Clears the client-side cache
 */
export function clearClientCache(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLIENT_CACHE_KEY);
      console.log("Client-side suggestion cache cleared");
    }
  } catch (error) {
    console.error("Error clearing client cache:", error);
  }
}

/**
 * LRU Cache implementation with expiration
 */
export class SuggestionCache {
  private cache: Map<string, CacheItem<string>> = new Map();
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  private lastCleared: number | null = null;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Store an item in the cache
   */
  set(key: string, value: string): void {
    // Clean expired items first
    this.cleanExpired();
    
    // If we're at capacity, remove the least recently used item
    if (this.cache.size >= this.config.maxSize) {
      let oldest: [string, number] | null = null;
      
      for (const [k, item] of this.cache.entries()) {
        if (!oldest || item.lastAccessed < oldest[1]) {
          oldest = [k, item.lastAccessed];
        }
      }
      
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
    
    // Normalize the key (last 50 chars, lowercase, trim)
    const normalizedKey = this.normalizeKey(key);
    
    // Add the new item
    this.cache.set(normalizedKey, {
      value,
      expiresAt: Date.now() + this.config.ttl,
      lastAccessed: Date.now(),
    });
  }
  
  /**
   * Get an item from the cache
   */
  get(key: string): string | null {
    // Clean expired items first
    this.cleanExpired();
    
    // Normalize the key
    const normalizedKey = this.normalizeKey(key);
    
    // Try exact match first
    if (this.cache.has(normalizedKey)) {
      const item = this.cache.get(normalizedKey)!;
      
      // Update last accessed time
      item.lastAccessed = Date.now();
      
      // Track statistics
      this.hits++;
      
      return item.value;
    }
    
    // If fuzzy matching is enabled, try to find a similar key
    if (this.config.fuzzyMatch) {
      const fuzzyResult = this.fuzzyGet(normalizedKey);
      
      if (fuzzyResult) {
        // Track statistics
        this.hits++;
        return fuzzyResult;
      }
    }
    
    // Track statistics
    this.misses++;
    
    return null;
  }
  
  /**
   * Try to find a similar key using fuzzy matching
   */
  private fuzzyGet(key: string): string | null {
    let bestMatch: [string, number] | null = null;
    
    // Get the last few words to match
    const keyWords = key.split(/\s+/).slice(-5).join(' ');
    
    for (const [cacheKey, item] of this.cache.entries()) {
      // Get the similarity score
      const similarity = this.getSimilarity(keyWords, cacheKey);
      
      // If we found a match above the threshold
      if (similarity > this.config.fuzzyThreshold) {
        if (!bestMatch || similarity > bestMatch[1]) {
          bestMatch = [cacheKey, similarity];
        }
      }
    }
    
    // If we found a match, return it
    if (bestMatch) {
      const item = this.cache.get(bestMatch[0])!;
      
      // Update last accessed time
      item.lastAccessed = Date.now();
      
      return item.value;
    }
    
    return null;
  }
  
  /**
   * Get the similarity between two strings
   * Uses Levenshtein distance
   */
  private getSimilarity(str1: string, str2: string): number {
    // For very short inputs, require exact match
    if (str1.length < 3 || str2.length < 3) {
      return str1 === str2 ? 1 : 0;
    }
    
    // Check if str2 contains str1 (partial match)
    if (str2.includes(str1)) {
      return 0.95; // High similarity for substring match
    }
    
    // Calculate edit distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - distance / maxLength;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));
    
    // Fill the first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    
    return dp[m][n];
  }
  
  /**
   * Remove expired items from the cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.lastCleared = Date.now();
    console.log("Server-side suggestion cache cleared");
  }
  
  /**
   * Get the size of the cache
   */
  size(): number {
    this.cleanExpired();
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.cleanExpired();
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      lastCleared: this.lastCleared,
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Normalize a key for storage
   */
  private normalizeKey(key: string): string {
    // Take the last 50 characters, convert to lowercase, and trim whitespace
    return key.slice(-50).toLowerCase().trim();
  }
}

// Create and export a singleton instance
const suggestionCache = new SuggestionCache();
export default suggestionCache; 