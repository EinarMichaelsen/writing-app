// Simple script to test DeepSeek API directly
require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require('openai');

async function testDeepSeekAPI() {
  console.log('Testing DeepSeek API...');
  
  // Check if API key exists
  const apiKey = process.env.DEEPSEEK_API_KEY;
  console.log('API Key exists:', !!apiKey);
  
  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }
  
  try {
    // Initialize DeepSeek client
    const deepseek = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });
    
    console.log('Making API request...');
    
    // Test with a simple completion
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hello, this is a test." }],
      max_tokens: 5,
    });
    
    console.log('API Response:', completion.choices[0]?.message.content);
    console.log('API test successful!');
  } catch (error) {
    console.error('API Error:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testDeepSeekAPI(); 