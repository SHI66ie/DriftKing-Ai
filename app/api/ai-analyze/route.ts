import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI processing

// Initialize OpenAI (requires OPENAI_API_KEY in .env.local)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

export async function POST(request: NextRequest) {
  try {
    const { raceResults, lapTimes, weather, track, race } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        message: 'Add OPENAI_API_KEY to .env.local to enable AI analysis'
      }, { status: 500 })
    }

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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are RaceMind AI, an expert racing data analyst for Toyota GR Cup. Analyze race data and provide:
1. Performance insights (lap times, consistency, pace)
2. Strategy recommendations (pit windows, tire management)
3. Driver-specific coaching tips
4. Weather impact analysis
5. Predictions for next race

Be specific with numbers, cite data points, and format as structured text.`
        },
        {
          role: "user",
          content: `Analyze this Toyota GR Cup race data and provide actionable insights:

Track: ${track}
Race: ${race}

Summary:
${JSON.stringify(raceDataSummary, null, 2)}

${lapTimes ? `Sample Lap Times (first 10):
${JSON.stringify(lapTimes.slice(0, 10), null, 2)}` : 'No lap time data available'}

Provide:
1. Top 3 performance insights
2. Strategy recommendations
3. Driver coaching tips
4. Weather impact analysis (if applicable)
5. Predictions for improvement`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content || 'No analysis generated'

    console.log('✅ AI analysis complete')
    console.log('Tokens used:', completion.usage)

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        track,
        race
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
