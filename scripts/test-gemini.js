const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Integration...\n');

  // Check if API key exists
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    console.log('\n📝 To fix:');
    console.log('1. Create/edit .env.local file');
    console.log('2. Add: GEMINI_API_KEY=your_key_here');
    console.log('3. Restart this script\n');
    process.exit(1);
  }

  console.log('✅ API key found');
  console.log(`Key prefix: ${process.env.GEMINI_API_KEY.substring(0, 10)}...\n`);

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini client initialized\n');

    // Test Gemini Flash (fast, free)
    console.log('🚀 Testing Gemini 1.5 Flash...');
    const flashModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const flashResult = await flashModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: 'Say "RaceMind AI is ready for racing!" in exactly 7 words.' }] 
      }]
    });
    
    const flashResponse = flashResult.response.text();
    console.log(`✅ Flash Response: ${flashResponse}`);
    console.log(`📊 Tokens used: ${flashResult.response.usageMetadata?.totalTokenCount || 0}\n`);

    // Test Gemini Pro (advanced, free)
    console.log('🚀 Testing Gemini 1.5 Pro...');
    const proModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const proResult = await proModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: 'You are a racing AI. In 20 words, describe Toyota GR Cup racing.' }] 
      }]
    });
    
    const proResponse = proResult.response.text();
    console.log(`✅ Pro Response: ${proResponse}`);
    console.log(`📊 Tokens used: ${proResult.response.usageMetadata?.totalTokenCount || 0}\n`);

    // Success summary
    console.log('═══════════════════════════════════════');
    console.log('✅ GEMINI API TEST SUCCESSFUL');
    console.log('═══════════════════════════════════════');
    console.log('✓ API key is valid');
    console.log('✓ Gemini 1.5 Flash is working');
    console.log('✓ Gemini 1.5 Pro is working');
    console.log('✓ RaceMind AI is ready!\n');
    console.log('🏁 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3000/dashboard');
    console.log('3. Load race data and try AI features\n');

  } catch (error) {
    console.error('\n❌ GEMINI API TEST FAILED\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n🔧 Your API key appears to be invalid');
      console.log('Get a new key: https://makersuite.google.com/app/apikey\n');
    } else if (error.message.includes('quota')) {
      console.log('\n⚠️ API quota exceeded');
      console.log('Wait for reset or upgrade plan\n');
    } else {
      console.log('\n🔧 Check your internet connection and try again\n');
    }
    
    process.exit(1);
  }
}

// Run test
testGeminiAPI().catch(console.error);
