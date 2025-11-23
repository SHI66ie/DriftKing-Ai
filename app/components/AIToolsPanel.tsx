'use client'

import { useState } from 'react'
import { Brain, TrendingUp, Target, Zap, Loader2 } from 'lucide-react'

interface AIToolsPanelProps {
  raceData: any
  track: string
  race: string
  simulatedWeather?: any
}

export default function AIToolsPanel({ raceData, track, race, simulatedWeather }: AIToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'predict' | 'coach' | 'strategy'>('predict')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runPrediction = async () => {
    setLoading(true)
    try {
      const weatherData = simulatedWeather || raceData?.weather || {}
      const response = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lapTimes: raceData?.lapTimes || [],
          currentLap: 15,
          driverData: { name: 'Driver 1', position: 3 },
          weather: weatherData,
          track,
          isSimulated: !!simulatedWeather
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
      const weatherData = simulatedWeather || raceData?.weather || {}
      const primaryDriver =
        raceData?.raceResults?.[0]?.driverName ||
        raceData?.raceResults?.[0]?.driver ||
        'Primary Driver'
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName: primaryDriver,
          lapTimes: raceData?.lapTimes || [],
          raceResults: raceData?.raceResults || [],
          telemetry: raceData?.telemetry || [],
          weather: weatherData,
          track,
          race,
          isSimulated: !!simulatedWeather
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
      const weatherData = simulatedWeather || raceData?.weather || {}
      const response = await fetch('/api/ai-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceData: {
            lapTimes: raceData?.lapTimes || [],
            weather: weatherData,
            track,
            race
          },
          isSimulated: !!simulatedWeather
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
        <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center space-x-1">
          <span>⚡</span>
          <span>Powered by Groq AI</span>
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
              <h3 className="font-semibold text-lg flex items-center space-x-2">
                <span className="text-2xl">🏁</span>
                <span>AI Analysis Report</span>
              </h3>
              <button
                onClick={() => setResult(null)}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
              >
                Clear
              </button>
            </div>
            
            {/* Formatted Results Display */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {/* Main Content */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700 shadow-lg">
                <div className="prose prose-invert max-w-none">
                  {(result.prediction || result.coaching || result.strategy || '').split('\n\n').map((section: string, idx: number) => {
                    // Check if section is a heading (starts with number or **text**)
                    if (section.match(/^\d+\.\s+\*\*.*\*\*/)) {
                      const [, title, ...content] = section.split(/\n/)
                      return (
                        <div key={idx} className="mb-4">
                          <h4 className="text-racing-red font-bold text-base mb-2 flex items-center space-x-2">
                            <span className="text-xl">▸</span>
                            <span>{title.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '')}</span>
                          </h4>
                          <div className="text-gray-300 text-sm leading-relaxed pl-6 space-y-1">
                            {content.map((line, i) => line && (
                              <p key={i} className="flex items-start space-x-2">
                                <span className="text-racing-blue mt-1">•</span>
                                <span>{line.replace(/^-\s*/, '').replace(/\*\*/g, '')}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    } else if (section.match(/^\d+\./)) {
                      // Numbered list item
                      return (
                        <div key={idx} className="mb-3 pl-2">
                          <p className="text-gray-200 text-sm leading-relaxed flex items-start space-x-2">
                            <span className="text-racing-red font-bold mt-0.5">▸</span>
                            <span>{section.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '')}</span>
                          </p>
                        </div>
                      )
                    } else if (section.trim()) {
                      // Regular paragraph
                      return (
                        <p key={idx} className="text-gray-300 text-sm leading-relaxed mb-3">
                          {section.replace(/\*\*/g, '')}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>

              {/* Metadata Footer */}
              {result.metadata && (
                <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span className="flex items-center space-x-1">
                      <span>🤖</span>
                      <span>{result.metadata.model || 'AI Model'}</span>
                    </span>
                    {result.metadata.provider && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        {result.metadata.provider}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.metadata.tokensUsed && `${result.metadata.tokensUsed} tokens`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
