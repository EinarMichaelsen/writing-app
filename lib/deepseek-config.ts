import OpenAI from "openai";
import suggestionCache from "./cache-utils";

// DeepSeek configuration
interface DeepSeekOptions {
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
  skipCache?: boolean; // New option to skip cache
}

// Client-side caching to avoid API calls entirely when possible
// This persists between page loads
const CLIENT_CACHE_KEY = "tabwords_suggestion_cache";
const CLIENT_CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Creates and returns an OpenAI compatible client configured for DeepSeek
 */
export function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com/v1",
  });
}

/**
 * Checks if DeepSeek is configured by testing the API key
 */
export async function isDeepSeekConfigured(): Promise<boolean> {
  try {
    // In server components, we can directly check if the API key exists
    if (typeof window === 'undefined') {
      return !!process.env.DEEPSEEK_API_KEY;
    }
    
    // In client components, we need to make an API call
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/test-api-key`;
    
    // We'll use a much shorter timeout for configuration checks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return false;
      const data = await response.json();
      return data.exists;
    } catch (error) {
      // If this fails, we'll assume DeepSeek isn't configured
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("Error checking DeepSeek configuration:", error);
    return false;
  }
}

/**
 * Fetches with retry logic
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit,
  retries = 2,
  backoff = 300,
  timeout = 8000
): Promise<Response> {
  // Create a new abort controller for each attempt
  const controller = new AbortController();
  
  // Create a merged signal if the options already had one
  const originalSignal = options.signal;
  
  // Track if the original signal is already aborted
  if (originalSignal && originalSignal.aborted) {
    throw new Error('Request was already aborted by caller');
  }
  
  // Set our new controller's signal
  options.signal = controller.signal;
  
  // Set up the timeout
  let timeoutId: NodeJS.Timeout | null = null;
  
  // Only set timeout if positive
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error('Request timed out'));
    }, timeout);
  }
  
  // If the original signal aborts, we should abort too
  let signalListener: (() => void) | null = null;
  
  if (originalSignal) {
    signalListener = () => {
      if (timeoutId) clearTimeout(timeoutId);
      controller.abort(new Error('Request aborted by caller'));
    };
    originalSignal.addEventListener('abort', signalListener);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Clean up
    if (timeoutId) clearTimeout(timeoutId);
    if (originalSignal && signalListener) {
      originalSignal.removeEventListener('abort', signalListener);
    }
    
    // Only retry on 5xx server errors and network/timeout failures
    if ((!response.ok && response.status >= 500) && retries > 0) {
      // Wait with exponential backoff before retrying
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
    }
    
    return response;
  } catch (error: unknown) {
    // Clean up
    if (timeoutId) clearTimeout(timeoutId);
    if (originalSignal && signalListener) {
      originalSignal.removeEventListener('abort', signalListener);
    }
    
    // Check if it's an abort error
    const isAbortError = error instanceof DOMException && error.name === 'AbortError';
    
    // Determine if we should retry
    const shouldRetry = retries > 0 && 
      ((error instanceof TypeError) || 
      (isAbortError && error.message.includes('timed out')));
    
    if (shouldRetry) {
      console.log(`Retrying after error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Network error or timeout - retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
    }

    // If it's an abort error, provide a clearer message
    if (isAbortError) {
      throw new Error('Request was cancelled or timed out');
    }
    
    throw error;
  }
}

/**
 * Try to get a suggestion from the client-side cache
 */
function getFromClientCache(key: string): string | null {
  try {
    // Only available in browser context
    if (typeof window === 'undefined') return null;
    
    // Get the cache from localStorage
    const cacheJson = localStorage.getItem(CLIENT_CACHE_KEY);
    if (!cacheJson) return null;
    
    const cache = JSON.parse(cacheJson);
    
    // Check if the cache is valid
    if (!cache || typeof cache !== 'object') return null;
    
    // Find a matching entry
    const normalizedKey = key.slice(-50).toLowerCase().trim();
    for (const cacheKey in cache) {
      if (cacheKey.includes(normalizedKey) || normalizedKey.includes(cacheKey)) {
        const entry = cache[cacheKey];
        
        // Check if the entry is expired
        if (entry.expires && entry.expires < Date.now()) {
          // Remove expired entry
          delete cache[cacheKey];
          continue;
        }
        
        // Return the value
        return entry.value;
      }
    }
    
    // Clean up the cache periodically
    // Only keep recent entries
    const now = Date.now();
    let changed = false;
    for (const cacheKey in cache) {
      if (cache[cacheKey].expires < now) {
        delete cache[cacheKey];
        changed = true;
      }
    }
    
    // Save the cleaned cache if needed
    if (changed) {
      localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(cache));
    }
    
    return null;
  } catch (error) {
    console.error("Error reading from client cache:", error);
    return null;
  }
}

/**
 * Store a suggestion in the client-side cache
 */
function storeInClientCache(key: string, value: string): void {
  try {
    // Only available in browser context
    if (typeof window === 'undefined') return;
    
    // Get the existing cache or create a new one
    const cacheJson = localStorage.getItem(CLIENT_CACHE_KEY);
    const cache = cacheJson ? JSON.parse(cacheJson) : {};
    
    // Add the new entry
    const normalizedKey = key.slice(-50).toLowerCase().trim();
    cache[normalizedKey] = {
      value,
      expires: Date.now() + CLIENT_CACHE_EXPIRY,
    };
    
    // Limit cache size to prevent localStorage overflow
    const maxEntries = 100;
    const keys = Object.keys(cache);
    if (keys.length > maxEntries) {
      // Remove oldest entries
      const sortedKeys = keys.sort((a, b) => cache[a].expires - cache[b].expires);
      const keysToRemove = sortedKeys.slice(0, keys.length - maxEntries);
      
      for (const keyToRemove of keysToRemove) {
        delete cache[keyToRemove];
      }
    }
    
    // Save the updated cache
    localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Error storing in client cache:", error);
  }
}

/**
 * Extracts a limited context from the text to optimize API calls
 * @param text The full text to extract context from
 * @param maxChars Maximum number of characters to extract
 * @param maxWords Maximum number of words to extract
 * @returns The extracted context
 */
function extractContext(text: string, maxChars: number = 100, maxWords: number = 30): string {
  // Extract by characters
  const lastChars = text.slice(-maxChars);
  
  // Extract by words
  const words = text.split(/\s+/);
  const lastWords = words.slice(-maxWords).join(' ');
  
  // Use the shorter of the two for context
  return lastChars.length < lastWords.length ? lastChars : lastWords;
}

/**
 * Generates a suggestion using DeepSeek API
 */
export async function generateSuggestion(
  text: string,
  options: DeepSeekOptions = {}
): Promise<string> {
  // Check if DeepSeek is configured
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("DeepSeek API key not found");
    return "";
  }

  try {
    const client = getDeepSeekClient();
    
    // Set defaults with fallbacks
    const maxTokens = options.maxTokens || 15;
    const temperature = options.temperature || 0.1; // Lower temperature for more precise completions
    const timeout = options.timeout || 3000; // 3 second default timeout
    
    // Extract the last 500 characters for context
    const context = text.slice(-500);
    
    // Create a prompt that focuses on continuing the text naturally
    const prompt = `${context}`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await client.chat.completions.create({
        model: getDeepSeekModel(),
        messages: [
          { 
            role: "system", 
            content: "You are a writing assistant that provides natural, contextual continuations of text. Your completions should be brief (1-10 words) and flow naturally from the existing text. Avoid generic transitions unless they truly fit the context." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.1, // Focus on most likely tokens
        presence_penalty: 0.1, // Slight penalty for repeating tokens
        frequency_penalty: 0.3, // Higher penalty for repeating phrases
      }, { signal: controller.signal });

      clearTimeout(timeoutId);
      
      let suggestion = response.choices[0]?.message?.content?.trim() || "";
      
      // Limit to first 10 words maximum
      const words = suggestion.split(/\s+/);
      if (words.length > 10) {
        suggestion = words.slice(0, 10).join(' ');
      }
      
      // Clean up the suggestion
      suggestion = suggestion
        .replace(/^["']|["']$/g, '') // Remove quotes
        .trim();
      
      // Handle empty or problematic suggestions
      if (!suggestion || suggestion.length < 2) {
        return "";
      }
      
      return suggestion;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Error generating suggestion:", error);
      return "";
    }
  } catch (error) {
    console.error("Error initializing DeepSeek client:", error);
    return "";
  }
}

/**
 * Generate a suggestion using the streaming API for immediate feedback
 * This function returns a callback function that will be called with streaming updates
 */
export async function generateStreamingSuggestion(
  text: string, 
  onUpdate: (suggestion: string, options?: { clear?: boolean }) => void,
  options: DeepSeekOptions = {}
): Promise<void> {
  // Check if DeepSeek is configured
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn("DeepSeek API key not found");
    onUpdate("", { clear: true });
    return;
  }

  try {
    const client = getDeepSeekClient();
    
    // Set defaults with fallbacks
    const maxTokens = options.maxTokens || 15;
    const temperature = options.temperature || 0.1; // Lower temperature for more precise completions
    const timeout = options.timeout || 3000; // 3 second default timeout
    
    // Extract the last 500 characters for context
    const context = text.slice(-500);
    
    // Create a prompt that focuses on continuing the text naturally
    const prompt = `${context}`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const completion = await client.chat.completions.create({
        model: getDeepSeekModel(),
        messages: [
          { 
            role: "system", 
            content: "You are a writing assistant that provides natural, contextual continuations of text. Your completions should be brief (1-10 words) and flow naturally from the existing text. Avoid generic transitions unless they truly fit the context." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.1, // Focus on most likely tokens
        presence_penalty: 0.1, // Slight penalty for repeating tokens
        frequency_penalty: 0.3, // Higher penalty for repeating phrases
        stream: true,
      }, { signal: controller.signal });
      
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
            
            // End the stream after reaching word limit
            onUpdate(cleanSuggestion, { clear: true });
            controller.abort();
            break;
          }
          
          // Send the current suggestion to the client
          onUpdate(cleanSuggestion, { clear: true });
        }
      }
      
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // If it's a timeout or abort, just clear the suggestion
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log("Streaming suggestion request aborted");
      } else {
        console.error("Error in streaming suggestion:", error);
      }
      
      onUpdate("", { clear: true });
    }
  } catch (error) {
    console.error("Error initializing DeepSeek client:", error);
    onUpdate("", { clear: true });
  }
}

/**
 * Generate a contextual fallback based on the context
 */
function getContextualFallback(context: string): string {
  // Normalize context to lowercase for easier pattern matching
  const lowerContext = context.toLowerCase().trim();
  
  // Check for repetition patterns and avoid them
  if (
    lowerContext.includes("which means that which means that") ||
    lowerContext.includes("we need to we need to") ||
    lowerContext.includes("showing that showing that") ||
    lowerContext.includes("indicating that indicating that")
  ) {
    // If repetition is detected, return something completely different
    const alternatives = [
      "furthermore", "additionally", "in contrast", 
      "specifically", "interestingly", "notably"
    ];
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  
  // Extract the last few words for better context matching
  const words = lowerContext.split(/\s+/);
  const lastWord = words[words.length - 1] || '';
  const lastFewWords = words.slice(-3).join(' ');
  
  // Check for common patterns and provide varied responses
  
  // Causal patterns
  if (lastFewWords.includes("because") || lastFewWords.includes("since") || lastFewWords.includes("as a result")) {
    const options = [
      "it provides", "it enables", "it allows for", 
      "it creates", "it facilitates", "it helps with"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Contrast patterns
  if (lastFewWords.includes("however") || lastFewWords.includes("but") || lastFewWords.includes("yet")) {
    const options = [
      "we must consider", "it's important to note", 
      "we should remember", "it's worth noting", 
      "we need to recognize"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Conclusion patterns
  if (lastFewWords.includes("therefore") || lastFewWords.includes("thus") || lastFewWords.includes("hence")) {
    const options = [
      "we can conclude", "it follows that", 
      "we understand that", "we can see that", 
      "it becomes clear"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Example patterns
  if (lastFewWords.includes("for example") || lastFewWords.includes("such as") || lastFewWords.includes("like")) {
    const options = [
      "when we look at", "consider the case of", 
      "as shown by", "as demonstrated by", 
      "as illustrated by"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Question patterns
  if (lastFewWords.match(/what|how|why|when|where|who/i)) {
    const options = [
      "it's important to", "we should consider", 
      "let's examine", "we can analyze", 
      "it's helpful to"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastFewWords.endsWith('?')) {
    const options = [
      "the answer is", "we can see that", 
      "it depends on", "it varies based on", 
      "several factors determine"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Common word-specific patterns
  if (lastWord === "the") {
    const options = [
      "most important", "key factor", "main point", 
      "critical aspect", "essential element"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord === "a") {
    const options = [
      "significant", "major", "crucial", 
      "key", "fundamental", "valuable"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord === "to") {
    const options = [
      "ensure that", "make sure", "consider how", 
      "understand why", "recognize that"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord === "and") {
    const options = [
      "furthermore", "additionally", "moreover", 
      "beyond that", "equally important"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord === "in") {
    const options = [
      "this case", "particular", "general", 
      "many situations", "most contexts"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord === "with") {
    const options = [
      "careful consideration", "this approach", 
      "these tools", "proper planning", 
      "the right resources"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Default fallbacks based on punctuation
  if (lastWord.endsWith('.')) {
    const options = [
      "Additionally", "Furthermore", "Moreover", 
      "Next", "Building on this", "In addition"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord.endsWith('!')) {
    const options = [
      "Importantly", "Notably", "Significantly", 
      "Remarkably", "Interestingly"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (lastWord.endsWith(',')) {
    const options = [
      "as well as", "along with", "in addition to", 
      "together with", "not to mention"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Avoid "which means that" if it's already in the context
  if (lowerContext.includes("which means that")) {
    const options = [
      "suggesting that", "indicating that", 
      "demonstrating that", "showing that", 
      "highlighting that"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // General fallbacks - avoid repetitive phrases
  const generalOptions = [
    "suggesting that", "indicating that", 
    "showing that", "demonstrating that", 
    "highlighting that", "revealing that"
  ];
  
  return generalOptions[Math.floor(Math.random() * generalOptions.length)];
}

/**
 * Returns the DeepSeek model name
 */
export function getDeepSeekModel() {
  return "deepseek-chat";
} 