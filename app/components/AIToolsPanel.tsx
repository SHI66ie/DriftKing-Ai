'use client'

import { useState } from 'react'
import { Brain, TrendingUp, Target, Zap, Loader2 } from 'lucide-react'

interface AIToolsPanelProps {
  raceData: any
  track: string
  race: string
}

export default function AIToolsPanel({ raceData, track, race }: AIToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'predict' | 'coach' | 'strategy'>('predict')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runPrediction = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lapTimes: raceData?.lapTimes || [],
          currentLap: 15,
          driverData: { name: 'Driver 1', position: 3 },
          weather: raceData?.weather || {},
          track
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Prediction error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runCoaching = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName: 'Driver 1',
          lapTimes: raceData?.lapTimes || [],
          raceResults: raceData?.raceResults || [],
          telemetry: raceData?.telemetry || null,
          track
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Coaching error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runStrategy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceResults: raceData?.raceResults || [],
          lapTimes: raceData?.lapTimes || [],
          weather: raceData?.weather || {},
          track,
          raceDuration: '45 minutes',
          tireCompound: 'Medium',
          fuelLoad: 'Full'
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Strategy error:', error)
    } finally {
      setLoading(false)
    }
  }

  const tools = [
    {
      id: 'predict' as const,
      name: 'Race Predictor',
      icon: TrendingUp,
      description: 'AI predicts next 3 laps',
      color: 'text-blue-400',
      action: runPrediction
    },
    {
      id: 'coach' as const,
      name: 'Driver Coach',
      icon: Target,
      description: 'Personalized coaching tips',
      color: 'text-green-400',
      action: runCoaching
    },
    {
      id: 'strategy' as const,
      name: 'Strategy Optimizer',
      icon: Zap,
      description: 'Optimal race strategy',
      color: 'text-purple-400',
      action: runStrategy
    }
  ]

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center mb-6">
        <Brain className="w-6 h-6 text-racing-blue mr-3" />
        <h2 className="text-xl font-bold">AI Analysis Tools</h2>
        <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
          Powered by Gemini
        </span>
      </div>

      {/* Tool Tabs */}
      <div className="flex space-x-2 mb-6">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`flex-1 p-3 rounded-lg transition-all ${
                activeTab === tool.id
                  ? 'bg-racing-blue text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${activeTab === tool.id ? 'text-white' : tool.color}`} />
              <div className="text-xs font-semibold">{tool.name}</div>
            </button>
          )
        })}
      </div>

      {/* Tool Content */}
      <div className="bg-gray-900/50 rounded-lg p-4 min-h-[300px]">
        {!result ? (
          <div className="text-center py-12">
            {tools.map((tool) => 
              activeTab === tool.id ? (
                <div key={tool.id}>
                  <tool.icon className={`w-16 h-16 mx-auto mb-4 ${tool.color}`} />
                  <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
                  <p className="text-gray-400 mb-6">{tool.description}</p>
                  <button
                    onClick={tool.action}
                    disabled={loading}
                    className="bg-racing-blue hover:bg-racing-blue/80 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      `Run ${tool.name}`
                    )}
                  </button>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Analysis Results</h3>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-800/50 rounded p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {result.prediction || result.coaching || result.strategy || JSON.stringify(result, null, 2)}
              </pre>
            </div>
            {result.metadata && (
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>Model: {result.metadata.model}</span>
                <span>Tokens: {result.metadata.tokensUsed}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
