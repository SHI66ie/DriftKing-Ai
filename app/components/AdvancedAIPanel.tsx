'use client'

import React, { useState } from 'react'
import { Brain, Zap, Shield, Target, Activity, Cpu, Eye, Navigation } from 'lucide-react'

interface AdvancedAIPanelProps {
  raceData: any
  track: string
  race: string
  simulatedWeather?: any
}

export default function AdvancedAIPanel({ raceData, track, race, simulatedWeather }: AdvancedAIPanelProps) {
  const [activeMode, setActiveMode] = useState<'multimodal' | 'autonomous' | 'safety'>('multimodal')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runMultimodalAnalysis = async (analysisType: string) => {
    setLoading(true)
    try {
      const weatherData = simulatedWeather || raceData?.weather || {}
      const response = await fetch('/api/ai-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetryData: raceData?.telemetry || {},
          trackLayout: {
            corners: 12,
            elevation: 'Moderate',
            surface: 'Asphalt',
            length: '4.2km'
          },
          weatherData,
          isSimulated: !!simulatedWeather,
          driverBehavior: {
            brakingStyle: 'Aggressive',
            corneringStyle: 'Late Apex',
            throttleStyle: 'Progressive',
            consistency: 'High'
          },
          raceContext: {
            position: 3,
            currentLap: 15,
            totalLaps: 30,
            gapToLeader: '+2.3s',
            tireCondition: 'Good',
            fuelLevel: 65
          },
          analysisType
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Multimodal analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAutonomousAnalysis = async (mode: string) => {
    setLoading(true)
    try {
      const weatherData = simulatedWeather || raceData?.weather || {}
      const response = await fetch('/api/ai-autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather: weatherData,
          isSimulated: !!simulatedWeather,
          sensorData: {
            lidar: true,
            camera: true,
            radar: true,
            gps: 'Active',
            imu: 'Calibrated'
          },
          vehicleState: {
            speed: 180,
            position: 'Turn 7 approach',
            heading: 45,
            acceleration: -0.5,
            steeringAngle: 15,
            brakesPressure: 25,
            throttlePosition: 75
          },
          trackMap: {
            width: 12,
            racingLine: 'Optimal',
            upcomingCorners: ['Turn 7: Right, 90°', 'Turn 8: Left, 45°'],
            trackLimits: 'Enforced',
            drsZones: ['Main Straight', 'Back Straight']
          },
          trafficData: {
            nearbyVehicles: [
              { id: 'Car_23', distance: 50, position: 'ahead' },
              { id: 'Car_17', distance: 30, position: 'behind' }
            ],
            overtakingOpportunities: 'Turn 8 exit',
            safetyGaps: { front: 1.2, rear: 0.8 }
          },
          missionGoal: {
            primary: 'Overtake Car_23',
            secondary: 'Maintain tire condition',
            targetPosition: 2,
            riskTolerance: 'Medium'
          },
          safetyConstraints: {
            maxGForce: 2.5,
            minFollowingDistance: 1.5,
            trackLimitsEnforcement: 'Strict'
          },
          mode
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Autonomous analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  const aiModes = [
    {
      id: 'multimodal' as const,
      name: 'Multimodal AI',
      icon: Brain,
      description: 'Advanced multi-sensor analysis',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      features: ['Performance Analysis', 'Strategy Optimization', 'Safety Assessment', 'Comprehensive Review']
    },
    {
      id: 'autonomous' as const,
      name: 'Autonomous Racing',
      icon: Cpu,
      description: 'Self-driving race analysis',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      features: ['Real-time Decisions', 'Path Planning', 'Risk Assessment', 'Predictive Control']
    },
    {
      id: 'safety' as const,
      name: 'Safety AI',
      icon: Shield,
      description: 'Advanced safety monitoring',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      features: ['Hazard Detection', 'Risk Scoring', 'Emergency Planning', 'Incident Prevention']
    }
  ]

  const renderMultimodalControls = () => (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => runMultimodalAnalysis('performance')}
        disabled={loading}
        className="p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg border border-purple-500/30 transition-colors"
      >
        <Target className="w-5 h-5 text-purple-400 mb-2" />
        <div className="text-sm font-semibold">Performance</div>
        <div className="text-xs text-gray-400">Optimize lap times</div>
      </button>
      
      <button
        onClick={() => runMultimodalAnalysis('strategy')}
        disabled={loading}
        className="p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg border border-purple-500/30 transition-colors"
      >
        <Zap className="w-5 h-5 text-purple-400 mb-2" />
        <div className="text-sm font-semibold">Strategy</div>
        <div className="text-xs text-gray-400">Race planning</div>
      </button>
      
      <button
        onClick={() => runMultimodalAnalysis('safety')}
        disabled={loading}
        className="p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg border border-purple-500/30 transition-colors"
      >
        <Shield className="w-5 h-5 text-purple-400 mb-2" />
        <div className="text-sm font-semibold">Safety</div>
        <div className="text-xs text-gray-400">Risk analysis</div>
      </button>
      
      <button
        onClick={() => runMultimodalAnalysis('comprehensive')}
        disabled={loading}
        className="p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg border border-purple-500/30 transition-colors"
      >
        <Activity className="w-5 h-5 text-purple-400 mb-2" />
        <div className="text-sm font-semibold">Complete</div>
        <div className="text-xs text-gray-400">Full analysis</div>
      </button>
    </div>
  )

  const renderAutonomousControls = () => (
    <div className="grid grid-cols-1 gap-3">
      <button
        onClick={() => runAutonomousAnalysis('autonomous_racing')}
        disabled={loading}
        className="p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Cpu className="w-6 h-6 text-blue-400" />
          <div className="text-left">
            <div className="font-semibold">Autonomous Racing Mode</div>
            <div className="text-sm text-gray-400">Real-time racing decisions with explainable AI</div>
          </div>
        </div>
      </button>
      
      <button
        onClick={() => runAutonomousAnalysis('pit_crew_ai')}
        disabled={loading}
        className="p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Navigation className="w-6 h-6 text-blue-400" />
          <div className="text-left">
            <div className="font-semibold">AI Pit Crew Chief</div>
            <div className="text-sm text-gray-400">Strategic pit stop optimization</div>
          </div>
        </div>
      </button>
      
      <button
        onClick={() => runAutonomousAnalysis('race_engineer')}
        disabled={loading}
        className="p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Eye className="w-6 h-6 text-blue-400" />
          <div className="text-left">
            <div className="font-semibold">AI Race Engineer</div>
            <div className="text-sm text-gray-400">Technical analysis and setup optimization</div>
          </div>
        </div>
      </button>
    </div>
  )

  const renderSafetyControls = () => (
    <div className="p-4 bg-green-600/20 rounded-lg border border-green-500/30">
      <div className="flex items-center space-x-3 mb-3">
        <Shield className="w-6 h-6 text-green-400" />
        <div>
          <div className="font-semibold">Advanced Safety AI</div>
          <div className="text-sm text-gray-400">Real-time hazard detection and risk assessment</div>
        </div>
      </div>
      <button
        onClick={() => runMultimodalAnalysis('safety')}
        disabled={loading}
        className="w-full p-3 bg-green-600/30 hover:bg-green-600/40 rounded-lg transition-colors"
      >
        Run Safety Analysis
      </button>
    </div>
  )

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center mb-6">
        <div className="relative">
          <Brain className="w-7 h-7 text-purple-400 mr-3" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        </div>
        <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Advanced AI Systems</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent mx-4" />
        <span className="text-xs bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/40 font-semibold shadow-lg shadow-purple-500/10">
          Research-Grade AI
        </span>
      </div>

      {/* Mode Selection */}
      <div className="flex space-x-2 mb-6">
        {aiModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 p-3 rounded-lg transition-all ${
                activeMode === mode.id
                  ? `${mode.bgColor} border-2 border-current ${mode.color}`
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${activeMode === mode.id ? mode.color : 'text-gray-400'}`} />
              <div className="text-xs font-semibold">{mode.name}</div>
            </button>
          )
        })}
      </div>

      {/* Mode Description */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center space-x-3 mb-2">
          {React.createElement(aiModes.find(m => m.id === activeMode)?.icon || Brain, {
            className: `w-5 h-5 ${aiModes.find(m => m.id === activeMode)?.color}`
          })}
          <h3 className="font-semibold">{aiModes.find(m => m.id === activeMode)?.name}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-3">{aiModes.find(m => m.id === activeMode)?.description}</p>
        <div className="flex flex-wrap gap-2">
          {aiModes.find(m => m.id === activeMode)?.features.map((feature, idx) => (
            <span key={idx} className="text-xs bg-gray-700/50 px-2 py-1 rounded">
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6">
        {activeMode === 'multimodal' && renderMultimodalControls()}
        {activeMode === 'autonomous' && renderAutonomousControls()}
        {activeMode === 'safety' && renderSafetyControls()}
      </div>

      {/* Results */}
      <div className="bg-gray-900/50 rounded-lg p-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-racing-blue mx-auto mb-4"></div>
              <p className="text-gray-400">Advanced AI processing...</p>
            </div>
          </div>
        ) : result ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">AI Analysis Results</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                {result.metadata?.confidenceScore && (
                  <span>Confidence: {result.metadata.confidenceScore}%</span>
                )}
                {result.metadata?.safetyLevel && (
                  <span>Safety: {result.metadata.safetyLevel}/10</span>
                )}
                <button
                  onClick={() => setResult(null)}
                  className="text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Action Plan for Autonomous Mode */}
              {result.actionPlan && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">Immediate Actions</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Steering:</span>
                      <span className="ml-2 font-mono">{result.actionPlan.steering}°</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Throttle:</span>
                      <span className="ml-2 font-mono">{result.actionPlan.throttle}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Brake:</span>
                      <span className="ml-2 font-mono">{result.actionPlan.brake}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-400 mb-2">Key Recommendations</h4>
                  <ul className="space-y-1 text-sm">
                    {result.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Analysis */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700 shadow-lg max-h-[400px] overflow-y-auto">
                <div className="prose prose-invert max-w-none">
                  {(result.analysis || '').split('\n\n').map((section: string, idx: number) => {
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
            </div>

            {/* Metadata */}
            {result.metadata && (
              <div className="mt-4 flex items-center justify-between bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span className="flex items-center space-x-1">
                    <span>🤖</span>
                    <span>{result.metadata.model || 'AI Model'}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                    {result.metadata.systemMode || result.analysisType || 'Advanced'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {result.metadata.tokensUsed && `${result.metadata.tokensUsed} tokens`}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold mb-2">Advanced AI Ready</h3>
            <p className="text-gray-400 mb-6">
              Select an analysis mode above to begin advanced AI processing
            </p>
            <div className="text-sm text-gray-500">
              Powered by cutting-edge autonomous driving research
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
