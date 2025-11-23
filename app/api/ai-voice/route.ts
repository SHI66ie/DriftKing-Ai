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
  console.error('Failed to initialize Groq for voice AI:', error)
}

// Voice-controlled racing AI inspired by Simulator Controller (Gemini fallback)
let gemini: GoogleGenerativeAI | null = null
try {
  if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
} catch (error) {
  console.error('Failed to initialize Gemini for voice AI:', error)
}

export async function POST(request: NextRequest) {
  try {
    const { 
      voiceCommand,
      currentContext,
      driverProfile,
      raceState,
      mode = 'race_engineer'
    }: any = await request.json()

    if (!groq && !gemini) {
      return NextResponse.json({
        error: 'Voice AI not configured',
        message: 'Add GROQ_API_KEY (recommended) or GEMINI_API_KEY to enable voice-controlled racing AI'
      }, { status: 503 })
    }

    console.log('🎤 Processing voice command with', groq ? 'Groq' : 'Gemini', ':', voiceCommand)

    // Create voice interaction context
    const voiceContext = `
VOICE-CONTROLLED RACING AI SYSTEM
==================================
Inspired by Simulator Controller's AI Race Assistants

VOICE COMMAND: "${voiceCommand}"

CURRENT CONTEXT:
- Track: ${currentContext?.track || 'Unknown'}
- Position: ${currentContext?.position || 'Unknown'}
- Lap: ${currentContext?.currentLap || 'Unknown'}/${currentContext?.totalLaps || 'Unknown'}
- Speed: ${currentContext?.speed || 'Unknown'} km/h
- Tire Condition: ${currentContext?.tireCondition || 'Unknown'}
- Fuel Level: ${currentContext?.fuelLevel || 'Unknown'}%

DRIVER PROFILE:
- Name: ${driverProfile?.name || 'Driver'}
- Experience Level: ${driverProfile?.experience || 'Intermediate'}
- Preferred Style: ${driverProfile?.style || 'Balanced'}
- Communication Preference: ${driverProfile?.communication || 'Concise'}

RACE STATE:
- Session Type: ${raceState?.sessionType || 'Race'}
- Weather: ${raceState?.weather || 'Dry'}
- Track Temperature: ${raceState?.trackTemp || 'Unknown'}°C
- Time Remaining: ${raceState?.timeRemaining || 'Unknown'}
`

    let systemPrompt = ''
    
    switch (mode) {
      case 'race_engineer':
        systemPrompt = `You are an AI Race Engineer with natural voice interaction capabilities.

Personality: Professional, technical, supportive
Communication Style: Clear, concise, data-driven
Expertise: Vehicle setup, performance optimization, technical analysis

Respond to voice commands with:
1. **Immediate Response**: Direct answer to the command
2. **Technical Insight**: Relevant data or analysis
3. **Actionable Advice**: Specific recommendations
4. **Follow-up Questions**: If clarification needed

Keep responses under 50 words for radio communication clarity.`
        break

      case 'race_strategist':
        systemPrompt = `You are an AI Race Strategist with voice command processing.

Personality: Strategic, analytical, forward-thinking
Communication Style: Strategic insights, timing-focused
Expertise: Race strategy, pit stops, position management

Focus on:
1. **Strategic Decisions**: Pit timing, tire strategy
2. **Position Analysis**: Overtaking opportunities
3. **Risk Assessment**: Strategic trade-offs
4. **Timing Recommendations**: When to push or conserve

Provide strategic guidance in racing radio format.`
        break

      case 'driving_coach':
        systemPrompt = `You are an AI Driving Coach with voice interaction.

Personality: Encouraging, instructional, performance-focused
Communication Style: Coaching tone, technique-focused
Expertise: Driving technique, performance improvement

Provide:
1. **Technique Coaching**: Specific driving improvements
2. **Performance Feedback**: Lap time analysis
3. **Skill Development**: Areas for improvement
4. **Motivational Support**: Confidence building

Use encouraging coaching language with specific technical advice.`
        break

      case 'spotter':
        systemPrompt = `You are an AI Race Spotter with voice alerts.

Personality: Alert, safety-focused, situational awareness
Communication Style: Quick alerts, safety warnings
Expertise: Traffic awareness, hazard detection, positioning

Provide:
1. **Traffic Updates**: Car positions and movements
2. **Safety Alerts**: Hazards and incidents
3. **Gap Information**: Timing to other cars
4. **Track Conditions**: Surface and weather updates

Use standard spotter radio terminology and be concise.`
        break

      default:
        systemPrompt = `You are a comprehensive AI Racing Assistant.`
    }

    const fullPrompt = `${voiceContext}

${systemPrompt}

VOICE COMMAND PROCESSING:
Analyze the voice command "${voiceCommand}" and provide an appropriate response based on:

1. **Command Intent**: What is the driver asking for?
2. **Context Relevance**: How does current race state affect the response?
3. **Priority Level**: Is this urgent, important, or informational?
4. **Response Type**: Information, instruction, confirmation, or question?

Respond as if you're speaking over race radio - be clear, concise, and professional.

RESPONSE FORMAT:
- Keep under 50 words for radio clarity
- Use racing terminology
- Be specific with numbers/data when relevant
- End with confirmation or follow-up if needed

Example responses:
- "Copy that. Your current pace is 2 tenths off optimal. Focus on turn 3 exit, you're losing time there."
- "Pit window opens in 3 laps. Current gap to P2 is 4.2 seconds. Recommend staying out 2 more laps."
- "Understood. Tire temps look good, you can push harder in sector 2. Gap behind is 6 seconds."

Provide your radio response now:`

    let aiResponse = ''
    let modelUsed = ''
    let tokensUsed = 0

    // Try Groq first (FREE & FAST)
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI race radio assistant. Reply in under 50 words, plain text, no JSON or code fences, using clear racing radio style.'
            },
            { role: 'user', content: fullPrompt }
          ],
          temperature: 0.6,
          max_tokens: 200
        })

        aiResponse = completion.choices[0]?.message?.content || ''
        modelUsed = 'llama-3.1-8b-instant (Groq)'
        tokensUsed = completion.usage?.total_tokens || 0
      } catch (error: any) {
        console.error('Groq voice AI error:', error.message || error)
      }
    }

    // Fallback to Gemini
    if (!aiResponse && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 200, // Keep responses short for voice
            topP: 0.8
          }
        })

        aiResponse = result.response.text()
        modelUsed = 'gemini-1.5-flash'
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0
      } catch (error: any) {
        console.error('Gemini voice AI error:', error.message || error)
      }
    }

    if (!aiResponse) {
      throw new Error('All AI providers failed for voice command')
    }

    const response = aiResponse.trim()

    // Extract command intent and priority
    const intent = extractCommandIntent(voiceCommand)
    const priority = extractPriority(voiceCommand, currentContext)

    console.log(`🎤 Voice response generated - Intent: ${intent}, Priority: ${priority}`)

    return NextResponse.json({
      success: true,
      voiceResponse: response,
      intent,
      priority,
      mode,
      metadata: {
        model: modelUsed,
        provider: groq ? 'Groq (FREE)' : 'Gemini (FREE)',
        tokensUsed,
        responseLength: response.length,
        processingTime: Date.now(),
        commandProcessed: voiceCommand
      },
      audioSuggestion: generateAudioSuggestion(response)
    })

  } catch (error: any) {
    console.error('❌ Voice AI error:', error)
    return NextResponse.json({
      error: 'Voice AI processing failed',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

function extractCommandIntent(command: string): string {
  const lowerCommand = command.toLowerCase()
  
  if (lowerCommand.includes('pit') || lowerCommand.includes('stop')) return 'pit_strategy'
  if (lowerCommand.includes('gap') || lowerCommand.includes('time')) return 'timing_info'
  if (lowerCommand.includes('tire') || lowerCommand.includes('tyre')) return 'tire_status'
  if (lowerCommand.includes('fuel')) return 'fuel_status'
  if (lowerCommand.includes('position') || lowerCommand.includes('place')) return 'position_info'
  if (lowerCommand.includes('setup') || lowerCommand.includes('adjust')) return 'setup_change'
  if (lowerCommand.includes('weather') || lowerCommand.includes('rain')) return 'weather_info'
  if (lowerCommand.includes('pace') || lowerCommand.includes('speed')) return 'pace_analysis'
  if (lowerCommand.includes('traffic') || lowerCommand.includes('car')) return 'traffic_info'
  
  return 'general_query'
}

function extractPriority(command: string, context: any): 'urgent' | 'important' | 'normal' {
  const lowerCommand = command.toLowerCase()
  
  // Urgent - safety or immediate action needed
  if (lowerCommand.includes('emergency') || lowerCommand.includes('problem') || 
      lowerCommand.includes('issue') || lowerCommand.includes('help')) {
    return 'urgent'
  }
  
  // Important - race-critical information
  if (lowerCommand.includes('pit') || lowerCommand.includes('strategy') || 
      lowerCommand.includes('position') || lowerCommand.includes('gap')) {
    return 'important'
  }
  
  return 'normal'
}

function generateAudioSuggestion(response: string): any {
  // Suggest audio parameters for text-to-speech
  const wordCount = response.split(' ').length
  const estimatedDuration = Math.max(2, wordCount * 0.4) // ~0.4 seconds per word
  
  return {
    suggestedSpeed: wordCount > 30 ? 'fast' : 'normal',
    estimatedDuration: `${estimatedDuration.toFixed(1)}s`,
    tone: response.includes('!') ? 'urgent' : 'professional',
    volume: response.includes('URGENT') || response.includes('WARNING') ? 'loud' : 'normal'
  }
}
