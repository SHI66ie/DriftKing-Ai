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
    const { 
      raceResults, 
      lapTimes, 
      weather, 
      track, 
      raceDuration,
      tireCompound,
      fuelLoad 
    } = await request.json()

    if (!gemini) {
      return NextResponse.json({
        error: 'Gemini API not configured',
        message: 'Add GEMINI_API_KEY to .env.local'
      }, { status: 503 })
    }

    console.log('⚙️ Using Gemini Flash for strategy optimization...')
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

    const prompt = `You are a Toyota GR Cup race strategist. Optimize race strategy:

RACE PARAMETERS:
Track: ${track}
Duration: ${raceDuration || 'Standard race'}
Total Laps: ${lapTimes?.length || 'TBD'}
Weather: ${JSON.stringify(weather)}
Tire Compound: ${tireCompound || 'Medium'}
Fuel Load: ${fuelLoad || 'Full'}

TOP 5 RESULTS:
${raceResults?.slice(0, 5).map((r: any, i: number) => 
  `${i + 1}. ${r.driverName || r.driver} - ${r.totalTime || r.time}`
).join('\n')}

AVERAGE LAP TIMES:
${lapTimes?.slice(0, 10).map((l: any) => l.lapTime || l.time).join(', ')}

Provide strategic recommendations:

1. **Optimal Pit Window**: When to pit (lap range with reasoning)
2. **Tire Strategy**: Compound selection and management
3. **Fuel Strategy**: Optimal fuel load vs lap time trade-off
4. **Weather Strategy**: Adjustments for conditions
5. **Overtaking Windows**: Best laps/sectors for passes
6. **Risk vs Reward**: Conservative vs aggressive approach
7. **Position-Specific Tactics**: Lead vs chase vs holding position
8. **Contingency Plans**: Alternative strategies if conditions change

Provide data-driven, specific recommendations with confidence levels.`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3000,
        topP: 0.85,
        topK: 40
      }
    })

    const strategy = result.response.text()

    return NextResponse.json({
      success: true,
      strategy,
      metadata: {
        model: 'gemini-1.5-flash-latest',
        track,
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Strategy optimization error:', error)
    return NextResponse.json({
      error: 'Strategy optimization failed',
      message: error.message
    }, { status: 500 })
  }
}
