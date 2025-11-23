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

// Initialize Gemini (FREE - fallback)
let gemini: GoogleGenerativeAI | null = null
try {
  if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
} catch (error) {
  console.error('Failed to initialize Gemini:', error)
}

export async function POST(request: NextRequest) {
  try {
    const { driverName, lapTimes, raceResults, telemetry, track, weather }: any = await request.json()

    if (!groq && !gemini) {
      return NextResponse.json({
        error: 'No AI service configured',
        message: 'Add GROQ_API_KEY (recommended) or GEMINI_API_KEY to .env.local'
      }, { status: 503 })
    }

    console.log(`🏁 Using ${groq ? 'Groq' : 'Gemini'} for driver coaching...`)

    // Analyze driver performance with safe defaults
    const safeLapTimes = Array.isArray(lapTimes) ? lapTimes : []
    const parsedTimes = safeLapTimes
      .map((l: any) => parseFloat(l.lapTime || l.time || '0'))
      .filter((t) => Number.isFinite(t) && t > 0)

    const bestLap = parsedTimes.length ? Math.min(...parsedTimes) : null
    const worstLap = parsedTimes.length ? Math.max(...parsedTimes) : null
    const consistency = bestLap !== null && worstLap !== null ? worstLap - bestLap : null

    const bestLapStr = bestLap !== null ? `${bestLap.toFixed(3)}s` : 'N/A'
    const worstLapStr = worstLap !== null ? `${worstLap.toFixed(3)}s` : 'N/A'
    const consistencyStr = consistency !== null ? `${consistency.toFixed(3)}s` : 'N/A'

    const weatherSummary = weather
      ? `Air: ${weather.airTemp ?? 'N/A'}°C, Track: ${weather.trackTemp ?? 'N/A'}°C, Humidity: ${weather.humidity ?? 'N/A'}%, Wind: ${weather.windSpeed ?? 'N/A'} m/s, Rain: ${weather.rain ? 'Yes' : 'No'}`
      : 'Not specified'

    const prompt = `You are a professional racing coach for Toyota GR Cup. Analyze this driver's performance:

DRIVER: ${driverName || 'Primary Driver'}
TRACK: ${track}
TOTAL LAPS: ${safeLapTimes.length}
BEST LAP: ${bestLapStr}
WORST LAP: ${worstLapStr}
CONSISTENCY GAP: ${consistencyStr}
FINAL POSITION: ${raceResults?.position || 'N/A'}
WEATHER: ${weatherSummary}

TELEMETRY INSIGHTS:
${telemetry ? JSON.stringify(telemetry).slice(0, 500) : 'Limited data available'}

Provide:
1. **Strengths**: 2-3 specific areas where driver excels
2. **Improvement Areas**: 3-4 actionable coaching points
3. **Braking Zones**: Specific corner/sector recommendations
4. **Consistency Tips**: How to reduce lap time variance
5. **Race Strategy**: Overtaking and defensive driving advice
6. **Next Session Goals**: 2-3 measurable objectives

FORMAT REQUIREMENTS:
- Respond as a structured driving coaching report in plain text, not JSON.
- Use numbered sections with **bold** titles and short bullet points.
- Do NOT mention that you are an AI or language model.
- Do NOT use markdown code fences or formatted code blocks.

Be specific, technical, and actionable. Use racing terminology.`

    let coaching = ''
    let modelUsed = ''
    let tokensUsed = 0

    // Try Groq first
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional Toyota GR Cup driver coach. Provide a concise, structured coaching report in plain text. Do NOT mention that you are an AI and do NOT output JSON or code fences.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 2500
        })

        coaching = completion.choices[0]?.message?.content || ''
        modelUsed = 'llama-3.1-8b-instant (Groq)'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('Groq driver coaching error:', error.message || error)
      }
    }

    // Fallback to Gemini
    if (!coaching && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text:
                'Respond as a concise, structured driving coaching report in plain text. Do NOT mention that you are an AI or use JSON/code fences.\n\n' +
                prompt
            }]
          }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2500
          }
        })

        coaching = result.response.text()
        modelUsed = 'gemini-1.5-flash'
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0
      } catch (error: any) {
        console.error('Gemini driver coaching error:', error.message || error)
      }
    }

    if (!coaching) {
      throw new Error('All AI providers failed to generate coaching')
    }

    return NextResponse.json({
      success: true,
      coaching,
      driverStats: {
        bestLap: bestLapStr,
        worstLap: worstLapStr,
        consistency: consistencyStr,
        totalLaps: safeLapTimes.length
      },
      metadata: {
        model: modelUsed,
        tokensUsed,
        provider: groq ? 'Groq (FREE)' : 'Gemini (FREE)'
      }
    })

  } catch (error: any) {
    console.error('❌ Coaching generation error:', error)
    return NextResponse.json({
      error: 'Coaching failed',
      message: error.message
    }, { status: 500 })
  }
}
