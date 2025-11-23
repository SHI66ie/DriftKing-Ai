import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Initialize Groq (FREE & FAST - PRIMARY)
let groq: OpenAI | null = null
try {
  if (process.env.GROQ_API_KEY) {
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 50000,
      maxRetries: 2
    })
  }
} catch (error) {
  console.error('Failed to initialize Groq:', error)
}

// Initialize DeepSeek (FREE - backup)
let deepseek: OpenAI | null = null
try {
  if (process.env.DEEPSEEK_API_KEY) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      timeout: 50000,
      maxRetries: 2
    })
  }
} catch (error) {
  console.error('Failed to initialize DeepSeek:', error)
}

// Initialize Gemini (FREE - fallback)
let gemini: GoogleGenerativeAI | null = null
try {
  if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
} catch (error) {
  console.error('Failed to initialize Gemini:', error)
}

// Initialize OpenAI (paid - final fallback)
let openai: OpenAI | null = null
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 50000,
      maxRetries: 2
    })
  }
} catch (error) {
  console.error('Failed to initialize OpenAI:', error)
}

export async function POST(request: NextRequest) {
  try {
    const { lapTimes, currentLap, driverData, weather, track } = await request.json()

    if (!groq && !deepseek && !gemini && !openai) {
      return NextResponse.json({
        error: 'No AI service configured',
        message: 'Add GROQ_API_KEY (recommended), DEEPSEEK_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to .env.local'
      }, { status: 503 })
    }

    // Priority: Groq > DeepSeek > Gemini > OpenAI
    const useGroq = groq !== null
    const useDeepSeek = !useGroq && deepseek !== null
    const useGemini = !useGroq && !useDeepSeek && gemini !== null
    const useOpenAI = !useGroq && !useDeepSeek && !useGemini && openai !== null

    console.log(`🔮 Using ${useGroq ? 'Groq' : useDeepSeek ? 'DeepSeek' : useGemini ? 'Gemini' : 'OpenAI'} for race predictions...`)

    // Prepare recent lap data
    const recentLaps = lapTimes?.slice(-10) || []
    const avgLapTime = recentLaps.reduce((sum: number, lap: any) => 
      sum + parseFloat(lap.lapTime || lap.time || 0), 0) / (recentLaps.length || 1)

    const prompt = `You are an expert Toyota GR Cup race strategist analyzing real-time telemetry.

CURRENT RACE SITUATION:
Track: ${track}
Current Lap: ${currentLap}
Driver: ${driverData?.name || 'Unknown'}
Current Position: ${driverData?.position || 'N/A'}
Average Lap Time: ${avgLapTime.toFixed(3)}s
Recent Lap Times: ${recentLaps.map((l: any) => l.lapTime || l.time).join(', ')}
Weather: ${JSON.stringify(weather)}

PREDICT THE NEXT 3 LAPS AND WRITE A RACE PREDICTION REPORT:
- Give expected lap times for the next 3 laps, with confidence levels.
- Describe likely position changes and overtaking chances.
- Explain tire degradation impact and fuel strategy recommendations.
- Assess overall risk level (high/medium/low) and key threats/opportunities.

FORMAT REQUIREMENTS (VERY IMPORTANT):
1. Respond in plain text as a multi-section race prediction report, not as JSON.
2. Use numbered sections with bold titles, for example:
   "1. **Summary**" then one or more sentences.
3. Use short bullet points where helpful, but no code blocks.
4. Do NOT include any markdown code fences or code blocks.

Your final answer should read like a human-written race engineer report for the driver and team.`

    let prediction = ''
    let modelUsed = ''
    let tokensUsed = 0

    // Try Groq first
    if (useGroq && groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert Toyota GR Cup race strategist. Provide a clear, narrative race prediction report in plain text. Do NOT output JSON or code fences.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 2000
        })
        prediction = completion.choices[0]?.message?.content || ''
        modelUsed = 'llama-3.1-8b (Groq)'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('Groq prediction error:', error.message)
      }
    }

    // Try DeepSeek if Groq failed
    if (!prediction && useDeepSeek && deepseek) {
      try {
        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert Toyota GR Cup race strategist. Provide a clear, narrative race prediction report in plain text. Do NOT output JSON or code fences.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 2000
        })
        prediction = completion.choices[0]?.message?.content || ''
        modelUsed = 'deepseek-chat'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('DeepSeek prediction error:', error.message)
      }
    }

    // Try Gemini if others failed
    if (!prediction && useGemini && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Provide a clear, narrative race prediction report in plain text. Do NOT output JSON or code fences.\n\n' + prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000,
            topP: 0.8,
            topK: 40
          }
        })
        prediction = result.response.text()
        modelUsed = 'gemini-1.5-pro'
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0
      } catch (error: any) {
        console.error('Gemini prediction error:', error.message)
      }
    }

    // Try OpenAI as final fallback
    if (!prediction && useOpenAI && openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert Toyota GR Cup race strategist. Provide a clear, narrative race prediction report in plain text. Do NOT output JSON or code fences.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 2000
        })
        prediction = completion.choices[0]?.message?.content || ''
        modelUsed = 'gpt-3.5-turbo'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('OpenAI prediction error:', error.message)
      }
    }

    if (!prediction) {
      throw new Error('All AI providers failed to generate prediction')
    }
    
    return NextResponse.json({
      success: true,
      prediction,
      metadata: {
        model: modelUsed,
        currentLap,
        avgLapTime: avgLapTime.toFixed(3),
        tokensUsed,
        confidence: 'high',
        provider: useGroq ? 'Groq (FREE)' : useDeepSeek ? 'DeepSeek (FREE)' : useGemini ? 'Gemini (FREE)' : 'OpenAI'
      }
    })

  } catch (error: any) {
    console.error('❌ AI prediction error:', error)
    return NextResponse.json({
      error: 'Prediction failed',
      message: error.message
    }, { status: 500 })
  }
}
