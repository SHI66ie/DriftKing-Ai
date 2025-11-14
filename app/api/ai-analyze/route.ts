import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI processing
export const runtime = 'nodejs' // Use Node.js runtime for better compatibility

// Initialize OpenAI (optional - requires OPENAI_API_KEY)
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

// Initialize Google Gemini (FREE - requires GEMINI_API_KEY)
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
    const { raceResults, lapTimes, weather, track, race }: any = await request.json()

    // Check if either AI service is available
    if (!openai && !gemini) {
      return NextResponse.json({
        error: 'No AI service configured',
        message: 'Add either GEMINI_API_KEY (FREE) or OPENAI_API_KEY to enable AI analysis',
        hints: {
          gemini: 'Get FREE Gemini key: https://makersuite.google.com/app/apikey',
          openai: 'Get OpenAI key (paid): https://platform.openai.com/api-keys'
        }
      }, { status: 503 })
    }

    // Prefer Gemini (free) over OpenAI (paid) if both available
    const useGemini = gemini !== null
    const aiProvider = useGemini ? 'Google Gemini (FREE)' : 'OpenAI GPT'
    console.log(`🤖 Using ${aiProvider} for analysis...`)

    // Prepare race data summary for AI
    const raceDataSummary = {
      track,
      race,
      totalDrivers: raceResults?.length || 0,
      totalLaps: lapTimes?.length || 0,
      weatherConditions: weather ? {
        temperature: weather.airTemp,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed
      } : 'Unknown',
      topDrivers: raceResults?.slice(0, 5).map((r: any) => ({
        position: r.position || r.finishPosition,
        driver: r.driverName || r.driver,
        totalTime: r.totalTime || r.time
      })) || []
    }

    console.log('🤖 Sending race data to OpenAI for analysis...')
    console.log('Data summary:', JSON.stringify(raceDataSummary, null, 2))

    // Limit data size to reduce tokens
    const limitedLapTimes = lapTimes ? lapTimes.slice(0, 20) : null
    const limitedResults = raceResults ? raceResults.slice(0, 10) : null

    // Build analysis prompt
    const prompt = `Analyze this Toyota GR Cup race data:

Track: ${track} | Race: ${race}
Drivers: ${raceDataSummary.totalDrivers} | Laps: ${raceDataSummary.totalLaps}
Weather: ${JSON.stringify(raceDataSummary.weatherConditions)}

Top 5 Finishers:
${limitedResults?.map((r: any, i: number) => `${i+1}. ${r.driverName || r.driver} - ${r.totalTime || r.time || 'N/A'}`).join('\n') || 'No data'}

Sample Lap Times: ${limitedLapTimes?.slice(0, 5).map((l: any) => l.lapTime || l.time).join(', ') || 'N/A'}

Provide:
1. Top 3 performance insights
2. Strategy recommendations
3. Driver coaching tips (1-2 specific)
4. Weather impact analysis
5. Predictions for improvement

Format: Use numbered lists and bullet points. Be specific with data.`

    let analysis = ''
    let modelUsed = ''
    let tokensUsed = 0

    // Use Gemini (FREE) or OpenAI
    if (useGemini && gemini) {
      try {
        console.log('🆓 Using Gemini 1.5 Pro (FREE)...')
        // Try Pro first for better quality, fall back to Flash if needed
        let model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' })
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
            topP: 0.9,
            topK: 40
          }
        })
        
        analysis = result.response.text() || 'No analysis generated'
        modelUsed = 'gemini-1.5-pro (FREE)'
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0
        
      } catch (geminiError: any) {
        console.error('⚠️ Gemini error, falling back to OpenAI if available:', geminiError.message)
        if (!openai) throw geminiError
      }
    }
    
    // Use OpenAI if Gemini failed or not available
    if (!analysis && openai) {
      const model = process.env.GPT_MODEL || 'gpt-3.5-turbo'
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `You are RaceMind AI, expert racing analyst for Toyota GR Cup.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
        
        analysis = completion.choices[0]?.message?.content || 'No analysis generated'
        modelUsed = completion.model
        tokensUsed = completion.usage?.total_tokens || 0
        
      } catch (openaiError: any) {
        // Try GPT-3.5 fallback
        if (model.includes('gpt-4')) {
          console.log('⚠️ GPT-4 not available, falling back to GPT-3.5...')
          const fallback = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: "system", content: `Racing analyst. Numbered insights.` },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
          analysis = fallback.choices[0]?.message?.content || 'No analysis generated'
          modelUsed = fallback.model
          tokensUsed = fallback.usage?.total_tokens || 0
        } else {
          throw openaiError
        }
      }
    }

    console.log(`✅ AI analysis complete`)
    console.log(`Model: ${modelUsed} | Tokens: ${tokensUsed}`)

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        model: modelUsed,
        tokensUsed,
        track,
        race,
        provider: useGemini ? 'Google Gemini (FREE)' : 'OpenAI'
      }
    })

  } catch (error: any) {
    console.error('❌ AI analysis error:', error)
    return NextResponse.json({
      error: 'AI analysis failed',
      message: error.message,
      details: error.response?.data || error.toString()
    }, { status: 500 })
  }
}
