"use client"

import { useState } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface RaceQASectionProps {
  raceData: any
  track: string
  race: string
}

export default function RaceQASection({ raceData, track, race }: RaceQASectionProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const askQuestion = async () => {
    if (!question.trim()) return
    setLoading(true)
    setAnswer(null)

    try {
      const body = {
        question,
        raceResults: raceData?.raceResults || [],
        lapTimes: raceData?.lapTimes || [],
        weather: raceData?.weather || null,
        track,
        race
      }

      const response = await fetch('/api/ai-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const json: any = await response.json()
      if (!response.ok) {
        throw new Error(json.message || 'AI Q&A failed')
      }

      setAnswer(json.answer || '')
    } catch (error: any) {
      setAnswer(error?.message || 'Failed to get an answer from AI.')
    } finally {
      setLoading(false)
    }
  }

  if (!raceData) return null

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 mb-8 border border-purple-500/30 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Ask RaceMind AI</h3>
        </div>
        <span className="text-xs text-gray-400">Ask anything about this race</span>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Example: Why did the leader lose time after lap 10? Where are the best overtaking opportunities?"
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 min-h-[70px] resize-y"
        />
        <button
          onClick={askQuestion}
          disabled={loading || !question.trim()}
          className="md:self-stretch bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </div>

      {answer && (
        <div className="mt-3 bg-gray-900/70 border border-gray-700 rounded-lg p-4 max-h-72 overflow-y-auto text-sm text-gray-200 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  )
}
