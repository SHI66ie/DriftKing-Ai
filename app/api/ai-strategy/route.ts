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
    const {
      raceResults,
      lapTimes,
      weather,
      track,
      raceDuration,
      tireCompound,
      fuelLoad
    } = await request.json()

    if (!groq && !gemini) {
      return NextResponse.json({
        error: 'No AI service configured',
        message: 'Add GROQ_API_KEY (recommended) or GEMINI_API_KEY to .env.local'
      }, { status: 503 })
    }

    // Priority: Groq > Gemini
    const useGroq = groq !== null
    const useGemini = !useGroq && gemini !== null

    console.log(`⚙️ Using ${useGroq ? 'Groq' : 'Gemini'} for strategy optimization...`)

    // 1. Fetch simulation results from the Python microservice
    let simulationResult = null;
    let tyreGripCurve: { lap: number; grip: number }[] = [];
    
    try {
      const numLaps = lapTimes?.length || 50;
      const trackTemp = weather?.trackTemp || weather?.temp || 35.0;
      
      const simResponse = await fetch('http://127.0.0.1:8000/api/strategy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_laps: numLaps,
          track_temp: trackTemp,
          base_lap_time: 95.0,
          fuel_effect: 0.05,
          pit_stop_loss: 22.0,
          num_simulations: 500
        })
      });
      
      if (simResponse.ok) {
        simulationResult = await simResponse.json();
      }

      // Fetch tyre degradation curve for first 20 laps
      const gripPromises = Array.from({ length: 20 }, (_, idx) => 
        fetch('http://127.0.0.1:8000/api/tyre/degradation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            compound: tireCompound || 'Medium',
            track_temp: trackTemp,
            lap: idx + 1,
            fuel_load: fuelLoad === 'Full' ? 80.0 : 40.0,
            safety_car_laps: []
          })
        }).then(res => res.ok ? res.json() : null)
      );

      const gripResults = await Promise.all(gripPromises);
      tyreGripCurve = gripResults.map((r, idx) => ({
        lap: idx + 1,
        grip: r?.success ? r.grip : null
      })).filter((item): item is { lap: number; grip: number } => item.grip !== null);

    } catch (e) {
      console.warn("⚠️ Strategy microservice offline, proceeding with AI standalone prediction:", e);
    }

    const prompt = `You are a Toyota GR Cup race strategist. Optimize race strategy:

RACE PARAMETERS:
Track: ${track}
Duration: ${raceDuration || 'Standard race'}
Total Laps: ${lapTimes?.length || 'TBD'}
Weather: ${JSON.stringify(weather)}
Tire Compound: ${tireCompound || 'Medium'}
Fuel Load: ${fuelLoad || 'Full'}

${simulationResult ? `MONTE CARLO SIMULATION RESULTS:
- Simulation Engine: ${simulationResult.engine}
- Optimal Pit Stop Lap: Lap ${simulationResult.optimal_pit_lap}
- Projected Total Race Time: ${simulationResult.optimal_race_time.toFixed(2)} seconds
- Sweep Results: Pit Laps Swept [${simulationResult.sweep_laps.join(', ')}]
- Risk Standard Deviation: ${simulationResult.risk_std.map((r: number) => r.toFixed(2)).join(', ')}

PROJECTED TYRE GRIP CURVE (Core Temperature wear model):
${tyreGripCurve.map(t => `Lap ${t.lap}: Grip ${(t.grip * 100).toFixed(1)}%`).join(', ')}
` : ''}

TOP 5 RESULTS:
${raceResults?.slice(0, 5).map((r: any, i: number) =>
      `${i + 1}. ${r.driverName || r.driver} - ${r.totalTime || r.time}`
    ).join('\n')}

AVERAGE LAP TIMES:
${lapTimes?.slice(0, 10).map((l: any) => l.lapTime || l.time).join(', ')}

Provide strategic recommendations:

1. **Optimal Pit Window**: When to pit (lap range with reasoning, referencing the simulation results if available)
2. **Tire Strategy**: Compound selection and management (reference the projected Tyre Grip Curve)
3. **Fuel Strategy**: Optimal fuel load vs lap time trade-off
4. **Weather Strategy**: Adjustments for conditions
5. **Overtaking Windows**: Best laps/sectors for passes
6. **Risk vs Reward**: Conservative vs aggressive approach (citing the risk standard deviations)
7. **Position-Specific Tactics**: Lead vs chase vs holding position
8. **Contingency Plans**: Alternative strategies if conditions change

Provide data-driven, specific recommendations with confidence levels. Include the Monte Carlo simulation parameters and output directly in your strategic response to highlight the mathematical justification.`


    let strategy = ''
    let modelUsed = ''
    let tokensUsed = 0

    // Try Groq first (FREE & FAST)
    if (useGroq && groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert Toyota GR Cup race strategist. Provide data-driven strategy recommendations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 3000
        })
        strategy = completion.choices[0]?.message?.content || ''
        modelUsed = 'llama-3.1-8b-instant (Groq)'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('Groq strategy error:', error.message)
      }
    }

    // Fall back to Gemini if Groq failed
    if (!strategy && useGemini && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 3000,
            topP: 0.85,
            topK: 40
          }
        })
        strategy = result.response.text()
        modelUsed = 'gemini-1.5-flash-latest'
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0
      } catch (error: any) {
        console.error('Gemini strategy error:', error.message)
        throw error
      }
    }

    if (!strategy) {
      throw new Error('All AI providers failed to generate strategy')
    }

    return NextResponse.json({
      success: true,
      strategy,
      metadata: {
        model: modelUsed,
        track,
        tokensUsed,
        generatedAt: new Date().toISOString(),
        provider: useGroq ? 'Groq (FREE)' : 'Gemini (FREE)'
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


