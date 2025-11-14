import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Initialize Gemini
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
    const { lapTimes, currentLap, driverData, weather, track } = await request.json()

    if (!gemini) {
      return NextResponse.json({
        error: 'Gemini API not configured',
        message: 'Add GEMINI_API_KEY to .env.local'
      }, { status: 503 })
    }

    console.log('🔮 Using Gemini 1.5 Pro for race predictions...')
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' })

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

PREDICT THE NEXT 3 LAPS:
1. Expected lap times (with confidence %)
2. Position changes probability
3. Tire degradation impact
4. Fuel strategy recommendation
5. Overtaking opportunities
6. Risk assessment (high/medium/low)

Provide specific, data-driven predictions with reasoning. Format as structured JSON.`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2000,
        topP: 0.8,
        topK: 40
      }
    })

    const prediction = result.response.text()
    
    return NextResponse.json({
      success: true,
      prediction,
      metadata: {
        model: 'gemini-1.5-pro',
        currentLap,
        avgLapTime: avgLapTime.toFixed(3),
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
        confidence: 'high'
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
