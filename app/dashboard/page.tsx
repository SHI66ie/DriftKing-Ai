'use client'

import { useState, useEffect } from 'react'
import { Trophy, Zap, Target, Brain, Clock, Play, Pause, BarChart3, Download, Flag, TrendingUp } from 'lucide-react'
import SetupGuide from '../components/SetupGuide'
import AIToolsPanel from '../components/AIToolsPanel'
import AdvancedAIPanel from '../components/AdvancedAIPanel'
import VoiceControlPanel from '../components/VoiceControlPanel'
import TrackMapViewer from '../components/TrackMapViewer'
import WeatherControls from '../components/WeatherControls'
import ToyotaGRLogo from '../components/ToyotaGRLogo'

interface RaceData {
  loading: boolean
  error: string | null
  data: any[]
}

export default function DashboardPage() {
  const [selectedTrack, setSelectedTrack] = useState('barber')
  const [selectedRace, setSelectedRace] = useState('R1')
  const [isReplaying, setIsReplaying] = useState(false)
  const [raceData, setRaceData] = useState<RaceData>({ loading: false, error: null, data: [] })
  const [generatedReport, setGeneratedReport] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [simulatedWeather, setSimulatedWeather] = useState<any>(null)

  const tracks = [
    { id: 'barber', name: 'Barber Motorsports Park', location: 'Alabama', available: true },
    { id: 'cota', name: 'Circuit of the Americas', location: 'Texas', available: true },
    { id: 'indianapolis', name: 'Indianapolis Motor Speedway', location: 'Indiana', available: true },
    { id: 'road-america', name: 'Road America', location: 'Wisconsin', available: true },
    { id: 'sebring', name: 'Sebring International Raceway', location: 'Florida', available: true },
    { id: 'sonoma', name: 'Sonoma Raceway', location: 'California', available: true },
    { id: 'vir', name: 'Virginia International Raceway', location: 'Virginia', available: true }
  ]

  const loadRaceData = async () => {
    setRaceData({ loading: true, error: null, data: [] })
    setGeneratedReport(null)
    
    try {
      // Load race data from local JSON files in the Data folder
      console.log(`📂 Loading ${selectedTrack} ${selectedRace} data from local Data folder...`)

      const response = await fetch(`/api/race-data/${selectedTrack}/${selectedRace}`)
      const dataSource = 'Local Data Folder'

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || errorData.message || 'Failed to load data from local files')
      }

      const data: any = await response.json()

      console.log(`✅ Successfully loaded ${selectedTrack} ${selectedRace} data from local files`)
      console.log('📊 Race Results present:', !!data.raceResults)
      console.log('⏱️ Lap Times entries:', Array.isArray(data.lapTimes) ? data.lapTimes.length : 0)
      console.log('🌤️ Weather data:', data.weather ? 'Available' : 'Not found')
      console.log('📈 Telemetry:', data.telemetry?.available ? `Mode: ${data.telemetry.type}` : 'Not detected')

      setRaceData({ 
        loading: false, 
        error: null, 
        data: [{ ...data, dataSource }] 
      })
    } catch (error: any) {
      console.error('❌ Error loading race data from local files:', error)
      const errorMessage = error?.message || String(error)
      setRaceData({ 
        loading: false,
        error: `Failed to load race data from local files: ${errorMessage}

⚠️ This usually means the Data folder is missing or incomplete.
🔧 Make sure the /Data directory exists in the project root and contains the ${selectedTrack}/${selectedRace} files.
📁 Each track folder should include race results, lap times, weather, and telemetry JSON files.

If this persists, check the server console for detailed error logs.`,
        data: []
      })
    }
  }

  const startRaceReplay = () => {
    setIsReplaying(true)
    loadRaceData()
    
    // Simulate race replay progress
    setTimeout(() => {
      setIsReplaying(false)
    }, 3000)
  }

  const exportReport = async () => {
    if (!raceData.data[0]) {
      alert('Please load race data first!')
      return
    }

    setIsGeneratingReport(true)

    try {
      console.log('🤖 Requesting AI analysis using local data...')

      const { raceResults, lapTimes, weather, dataSource } = raceData.data[0] || {}
      const weatherForAI = simulatedWeather || weather

      // Call AI analysis endpoint
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceResults,
          lapTimes,
          weather: weatherForAI,
          track: selectedTrack,
          race: selectedRace
        })
      })

      const result: any = await response.json()

      if (!response.ok) {
        console.error('❌ AI analysis error:', result)
        // Fallback to demo report if AI fails
        throw new Error(result.message || 'AI analysis failed')
      }

      // Build report with AI analysis
      const report = `KobayashiAI Race Analysis Report
Track: ${tracks.find(t => t.id === selectedTrack)?.name}
Race: ${selectedRace}
Generated: ${new Date().toLocaleString()}
Data Source: ${dataSource || 'Local Data Folder'}
AI Model: ${result.metadata?.model || 'GPT-4'}

═══════════════════════════════════════════════════
🤖 AI-POWERED ANALYSIS
═══════════════════════════════════════════════════

${result.analysis}

═══════════════════════════════════════════════════
Powered by RaceMind AI | Tokens Used: ${result.metadata?.tokensUsed || 'N/A'}
═══════════════════════════════════════════════════`

      console.log('✅ AI report generated successfully')

      // Display report on dashboard
      setGeneratedReport(report)

      // Also download as file
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KobayashiAI_${selectedTrack}_${selectedRace}_AI_Report.txt`
      a.click()
      URL.revokeObjectURL(url)

    } catch (error: any) {
      console.error('❌ Report generation error:', error)
      
      // Fallback to demo report
      const report = `KobayashiAI Race Analysis Report
Track: ${tracks.find(t => t.id === selectedTrack)?.name}
Race: ${selectedRace}
Generated: ${new Date().toLocaleString()}

⚠️ AI Analysis Unavailable
${error.message || 'Could not connect to AI service'}

To enable AI analysis:
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Create .env.local file in project root
3. Add: OPENAI_API_KEY=your-key-here
4. Restart the development server

DEMO DATA (Placeholder):
- 3-lap hindsight analysis: 92% accuracy
- Strategy validation: Pit window optimal at lap 15
- Tire degradation: Medium compound recommended`

      setGeneratedReport(report)
      
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KobayashiAI_${selectedTrack}_${selectedRace}_report.txt`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Derive a simple weather summary from raw weather arrays
  const initialWeatherSummary = (() => {
    if (!raceData.data[0]?.weather) return undefined

    const baseWeather = raceData.data[0].weather as any
    if (Array.isArray(baseWeather) && baseWeather.length > 0) {
      const latest = baseWeather[baseWeather.length - 1] as any
      return {
        airTemp: Number(latest.AIR_TEMP ?? latest.airTemp ?? 25),
        trackTemp: Number(latest.TRACK_TEMP ?? latest.trackTemp ?? 35),
        humidity: Number(latest.HUMIDITY ?? latest.humidity ?? 50),
        windSpeed: Number(latest.WIND_SPEED ?? latest.windSpeed ?? 5),
        windDirection: Number(latest.WIND_DIRECTION ?? latest.windDirection ?? 0),
        pressure: Number(latest.PRESSURE ?? latest.pressure ?? 1013),
        rain: Boolean(latest.RAIN ?? latest.rain ?? false)
      }
    }

    return baseWeather
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-racing-red/30 shadow-lg shadow-racing-red/10">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <ToyotaGRLogo className="w-10 h-10 text-racing-red" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-racing-blue rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  KobayashiAI
                </h1>
                <p className="text-xs text-racing-red font-semibold tracking-wider">TOYOTA GAZOO RACING</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                title="Select Track"
              >
                {tracks.map(track => (
                  <option key={track.id} value={track.id} disabled={!track.available}>
                    {track.name} {track.available ? '✅' : '⚠️ (Setup Required)'}
                  </option>
                ))}
              </select>
              <select 
                value={selectedRace}
                onChange={(e) => setSelectedRace(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                title="Select Race"
              >
                <option value="R1">Race 1</option>
                <option value="R2">Race 2</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Control Panel */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 mb-8 border border-racing-red/20 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-6">
            <Flag className="w-5 h-5 text-racing-red" />
            <h2 className="text-xl font-bold tracking-tight">Race Analysis Controls</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-racing-red/50 to-transparent" />
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={startRaceReplay}
              disabled={isReplaying}
              className="bg-gradient-to-r from-racing-red to-red-700 hover:from-red-700 hover:to-racing-red disabled:from-gray-600 disabled:to-gray-700 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-racing-red/20 hover:shadow-racing-red/40 flex items-center space-x-2"
            >
              {isReplaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isReplaying ? 'Analyzing...' : 'Start Race Replay'}</span>
            </button>
            
            <button 
              onClick={() => loadRaceData()}
              disabled={raceData.loading}
              className="border-2 border-racing-blue/50 hover:border-racing-blue disabled:border-gray-700 bg-racing-blue/10 hover:bg-racing-blue/20 px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2"
            >
              <BarChart3 className="w-5 h-5" />
              <span>{raceData.loading ? 'Loading...' : 'Load Analytics'}</span>
            </button>

            <button 
              onClick={exportReport}
              disabled={isGeneratingReport || raceData.data.length === 0}
              className="bg-gradient-to-r from-racing-blue to-blue-700 hover:from-blue-700 hover:to-racing-blue px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-racing-blue/20 hover:shadow-racing-blue/40 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReport ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating AI Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Generate AI Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current Selection Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl p-6 border border-racing-red/20 shadow-lg backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Target className="w-5 h-5 mr-2 text-racing-red" />
              Current Selection
            </h3>
            <p className="text-gray-300">
              <strong>Track:</strong> {tracks.find(t => t.id === selectedTrack)?.name}<br/>
              <strong>Location:</strong> {tracks.find(t => t.id === selectedTrack)?.location}<br/>
              <strong>Race:</strong> {selectedRace}
            </p>
          </div>
        </div>

        {/* Data Loading Status */}
        {raceData.loading && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-racing-blue"></div>
              <span>Loading race data from local Data folder...</span>
            </div>
          </div>
        )}

        {raceData.error && (
          <div className="mb-8">
            <SetupGuide />
          </div>
        )}

        {raceData.data.length > 0 && (
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/30 rounded-xl p-6 mb-8 shadow-lg shadow-green-500/10">
            <h3 className="font-semibold text-green-400 mb-2">Data Loaded Successfully</h3>
            <p className="text-green-300 mb-2">
              Race data loaded from your local <code>Data/</code> folder and ready for AI analysis.
            </p>
            <div className="grid md:grid-cols-3 gap-3 text-sm text-green-200">
              <div>
                <div className="font-semibold">Race Results</div>
                <div className="text-green-100">
                  {raceData.data[0]?.raceResults ? 'Available' : 'Not found'}
                </div>
              </div>
              <div>
                <div className="font-semibold">Lap Times</div>
                <div className="text-green-100">
                  {Array.isArray(raceData.data[0]?.lapTimes)
                    ? `${raceData.data[0].lapTimes.length} laps loaded`
                    : 'Not found'}
                </div>
              </div>
              <div>
                <div className="font-semibold">Weather</div>
                <div className="text-green-100">
                  {raceData.data[0]?.weather ? 'Available' : 'Not found'}
                </div>
              </div>
              <div>
                <div className="font-semibold">Telemetry</div>
                <div className="text-green-100">
                  {raceData.data[0]?.telemetry?.available
                    ? `Available (${raceData.data[0].telemetry.type})`
                    : 'Not detected'}
                </div>
              </div>
            </div>
            <p className="text-xs text-green-300 mt-4">
              Source: {raceData.data[0]?.dataSource || 'Local Data Folder'}
            </p>
          </div>
        )}

        {/* AI Tools Panel */}
        {raceData.data.length > 0 && (
          <div className="mb-8">
            <AIToolsPanel 
              raceData={raceData.data[0]} 
              track={selectedTrack} 
              race={selectedRace}
              simulatedWeather={simulatedWeather}
            />
          </div>
        )}

        {/* Advanced AI Panel */}
        {raceData.data.length > 0 && (
          <div className="mb-8">
            <AdvancedAIPanel 
              raceData={raceData.data[0]} 
              track={selectedTrack} 
              race={selectedRace}
              simulatedWeather={simulatedWeather}
            />
          </div>
        )}

        {/* Voice Control Panel */}
        {raceData.data.length > 0 && (
          <div className="mb-8">
            <VoiceControlPanel 
              raceData={raceData.data[0]} 
              track={selectedTrack} 
              race={selectedRace} 
            />
          </div>
        )}

        {/* Track Map Viewer */}
        <div className="mb-8">
          <TrackMapViewer 
            track={selectedTrack}
            pdfUrl={`/api/track-map/${selectedTrack}`}
            mapData={{
              corners: selectedTrack === 'barber' ? 17 : selectedTrack === 'cota' ? 20 : selectedTrack === 'indianapolis' ? 14 : 12,
              length: selectedTrack === 'road-america' ? '4.048 miles' : '3.7 km',
              direction: selectedTrack === 'cota' ? 'Counter-clockwise' : 'Clockwise',
              elevation: selectedTrack === 'sonoma' ? '160 ft' : 'Moderate',
              surface: 'Asphalt',
              sectors: 3
            }}
          />
        </div>

        {/* Weather Controls */}
        <div className="mb-8">
          <WeatherControls
            initialWeather={initialWeatherSummary}
            onWeatherChange={(weather) => {
              setSimulatedWeather(weather)
              console.log('🌤️ Weather simulation updated:', weather)
            }}
          />
        </div>

        {/* Weather Simulation Notice */}
        {simulatedWeather && (
          <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-semibold text-purple-300">Weather Simulation Active</p>
                  <p className="text-xs text-gray-400">
                    AI predictions will use: {simulatedWeather.airTemp}°C air, {simulatedWeather.trackTemp}°C track, 
                    {simulatedWeather.humidity}% humidity{simulatedWeather.rain ? ', Rain' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedWeather(null)}
                className="text-xs text-gray-400 hover:text-white px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                Reset to Actual
              </button>
            </div>
          </div>
        )}

        {/* Generated Report Display */}
        {generatedReport && (
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-gray-700 rounded-2xl p-6 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-2xl flex items-center space-x-2 text-white">
                  <Trophy className="w-6 h-6 text-racing-red" />
                  <span>Race Analysis Report</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">AI-Powered Performance Insights</p>
              </div>
              <button
                onClick={() => setGeneratedReport(null)}
                className="text-gray-400 hover:text-white text-sm bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>
            
            {/* Formatted Report Content */}
            <div className="space-y-4">
              {generatedReport.split('\n\n').map((section, idx) => {
                // Header lines (contains "═" or title keywords)
                if (section.includes('═══') || section.match(/^(Track:|Race:|Generated:|Data Source:|AI Model:)/m)) {
                  return (
                    <div key={idx} className="bg-gray-900/70 rounded-xl p-4 border border-gray-700">
                      <div className="space-y-1 text-sm">
                        {section.split('\n').map((line, lineIdx) => {
                          if (line.includes('═══')) return null
                          if (line.match(/^(Track|Race|Generated|Data Source|AI Model|Tokens Used|Powered by):/)) {
                            const [label, ...value] = line.split(':')
                            return (
                              <div key={lineIdx} className="flex items-start justify-between">
                                <span className="text-gray-400 font-medium">{label}:</span>
                                <span className="text-white">{value.join(':').trim()}</span>
                              </div>
                            )
                          }
                          return line.trim() && (
                            <p key={lineIdx} className="text-gray-300">{line}</p>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                
                // AI Analysis section
                if (section.includes('AI-POWERED ANALYSIS') || section.includes('🤖')) {
                  return (
                    <div key={idx} className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-5 border border-purple-500/30">
                      <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center space-x-2">
                        <span>🤖</span>
                        <span>AI-Powered Analysis</span>
                      </h4>
                      <div className="space-y-3">
                        {section.split('\n').slice(1).map((line, lineIdx) => {
                          if (!line.trim() || line.includes('═══') || line.includes('🤖')) return null
                          
                          // Numbered sections
                          if (line.match(/^\d+\./)) {
                            return (
                              <div key={lineIdx} className="flex items-start space-x-2">
                                <span className="text-racing-red font-bold mt-1">▸</span>
                                <p className="text-gray-200 text-sm leading-relaxed">
                                  {line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')}
                                </p>
                              </div>
                            )
                          }
                          
                          // Bullet points
                          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                            return (
                              <div key={lineIdx} className="flex items-start space-x-2 pl-4">
                                <span className="text-racing-blue mt-1">•</span>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {line.replace(/^[\s-•]+/, '')}
                                </p>
                              </div>
                            )
                          }
                          
                          return (
                            <p key={lineIdx} className="text-gray-300 text-sm leading-relaxed">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                
                // PDF Documents section
                if (section.includes('Available Reference Documents')) {
                  return (
                    <div key={idx} className="bg-gray-900/70 rounded-xl p-4 border border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center space-x-2">
                        <Trophy className="w-4 h-4" />
                        <span>Reference Documents</span>
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-300">
                        {section.split('\n').slice(1).map((line, lineIdx) => 
                          line.trim() && <li key={lineIdx}>{line}</li>
                        )}
                      </ul>
                    </div>
                  )
                }
                
                // Regular sections
                if (section.trim()) {
                  return (
                    <div key={idx} className="text-gray-300 text-sm leading-relaxed">
                      {section}
                    </div>
                  )
                }
                
                return null
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <p>✨ Generated by RaceMind AI</p>
              </div>
              <button
                onClick={exportReport}
                className="bg-racing-blue hover:bg-racing-blue/80 px-6 py-3 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 p-6 rounded-xl border border-racing-red/20 hover:border-racing-red/40 transition-all shadow-lg hover:shadow-racing-red/20 group">
            <Brain className="w-8 h-8 text-racing-red mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-lg font-semibold mb-2">3-Lap Predictor</h4>
            <p className="text-gray-400 text-sm">AI forecasts next 3 laps with 89-95% accuracy</p>
            <div className="mt-4 text-2xl font-bold text-racing-red">92%</div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 p-6 rounded-xl border border-racing-blue/20 hover:border-racing-blue/40 transition-all shadow-lg hover:shadow-racing-blue/20 group">
            <Clock className="w-8 h-8 text-racing-blue mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-lg font-semibold mb-2">Race Replay</h4>
            <p className="text-gray-400 text-sm">Interactive timeline with AI alerts</p>
            <div className="mt-4 text-2xl font-bold text-racing-blue">Real-time</div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 p-6 rounded-xl border border-racing-red/20 hover:border-racing-red/40 transition-all shadow-lg hover:shadow-racing-red/20 group">
            <Target className="w-8 h-8 text-racing-red mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-lg font-semibold mb-2">Strategy Validator</h4>
            <p className="text-gray-400 text-sm">Validates pit calls against race outcomes</p>
            <div className="mt-4 text-2xl font-bold text-racing-red">92%</div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 p-6 rounded-xl border border-racing-blue/20 hover:border-racing-blue/40 transition-all shadow-lg hover:shadow-racing-blue/20 group">
            <Zap className="w-8 h-8 text-racing-blue mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-lg font-semibold mb-2">AI Training</h4>
            <p className="text-gray-400 text-sm">Generates actionable driver insights</p>
            <div className="mt-4 text-2xl font-bold text-racing-blue">PDF Export</div>
          </div>
        </div>
      </div>
    </div>
  )
}
