import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    const { driverName, lapTimes, raceResults, telemetry, track } = await request.json()

    if (!gemini) {
      return NextResponse.json({
        error: 'Gemini API not configured',
        message: 'Add GEMINI_API_KEY to .env.local'
      }, { status: 503 })
    }

    console.log('🏁 Using Gemini Flash for driver coaching...')
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Analyze driver performance
    const bestLap = Math.min(...lapTimes.map((l: any) => parseFloat(l.lapTime || l.time || 999)))
    const worstLap = Math.max(...lapTimes.map((l: any) => parseFloat(l.lapTime || l.time || 0)))
    const consistency = worstLap - bestLap

    const prompt = `You are a professional racing coach for Toyota GR Cup. Analyze this driver's performance:

DRIVER: ${driverName}
TRACK: ${track}
TOTAL LAPS: ${lapTimes.length}
BEST LAP: ${bestLap.toFixed(3)}s
WORST LAP: ${worstLap.toFixed(3)}s
CONSISTENCY GAP: ${consistency.toFixed(3)}s
FINAL POSITION: ${raceResults?.position || 'N/A'}

TELEMETRY INSIGHTS:
${telemetry ? JSON.stringify(telemetry).slice(0, 500) : 'Limited data available'}

Provide:
1. **Strengths**: 2-3 specific areas where driver excels
2. **Improvement Areas**: 3-4 actionable coaching points
3. **Braking Zones**: Specific corner/sector recommendations
4. **Consistency Tips**: How to reduce lap time variance
5. **Race Strategy**: Overtaking and defensive driving advice
6. **Next Session Goals**: 2-3 measurable objectives

Be specific, technical, and actionable. Use racing terminology.`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2500
      }
    })

    const coaching = result.response.text()

    return NextResponse.json({
      success: true,
      coaching,
      driverStats: {
        bestLap: bestLap.toFixed(3),
        worstLap: worstLap.toFixed(3),
        consistency: consistency.toFixed(3),
        totalLaps: lapTimes.length
      },
      metadata: {
        model: 'gemini-1.5-flash',
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
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
