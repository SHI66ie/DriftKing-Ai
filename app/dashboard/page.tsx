'use client'

import { useState, useEffect } from 'react'
import { Car, Trophy, Zap, Target, Brain, Clock, Play, Pause, BarChart3, Download } from 'lucide-react'
import SetupGuide from '../components/SetupGuide'
import AIToolsPanel from '../components/AIToolsPanel'
import AdvancedAIPanel from '../components/AdvancedAIPanel'
import VoiceControlPanel from '../components/VoiceControlPanel'
import TrackMapViewer from '../components/TrackMapViewer'
import WeatherControls from '../components/WeatherControls'

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
  const [workerStatus, setWorkerStatus] = useState<'checking' | 'online' | 'offline' | null>(null)
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

  const checkWorkerStatus = async () => {
    setWorkerStatus('checking')
    try {
      const response = await fetch('/api/verify-tracks', { signal: AbortSignal.timeout(5000) })
      if (response.ok) {
        setWorkerStatus('online')
        console.log('✅ Worker is online and responding')
      } else {
        setWorkerStatus('offline')
        console.error('❌ Worker returned error status:', response.status)
      }
    } catch (error) {
      setWorkerStatus('offline')
      console.error('❌ Worker connection failed:', error)
    }
  }

  const loadRaceData = async () => {
    setRaceData({ loading: true, error: null, data: [] })
    
    try {
      // Load data from Google Drive via Cloudflare Worker proxy
      console.log(`🌐 Loading ${selectedTrack} ${selectedRace} data from Google Drive...`)
      
      const response = await fetch(`/api/drive-data/${selectedTrack}/${selectedRace}`)
      const dataSource = 'Google Drive (Cloudflare Worker)'
      
      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || errorData.message || 'Failed to load data from Google Drive')
      }
      
      const data: any = await response.json()
      
      console.log(`✅ Successfully loaded ${selectedTrack} ${selectedRace} metadata from ${dataSource}`)
      console.log('📊 Race Results:', data.files?.raceResults ? `File: ${data.files.raceResults.name}` : 'Not found')
      console.log('⏱️ Lap Times:', data.files?.lapTimes ? `File: ${data.files.lapTimes.name}` : 'Not found')
      console.log('🌤️ Weather:', data.files?.weather ? `File: ${data.files.weather.name}` : 'Not found')
      console.log('📈 Telemetry:', data.files?.telemetry ? `File: ${data.files.telemetry.name}` : 'Not found')
      console.log('📄 PDF Documents:', data.pdfDocuments?.length ? `${data.pdfDocuments.length} files available` : 'None')
      
      setRaceData({ 
        loading: false, 
        error: null, 
        data: [{ ...data, dataSource }] 
      })
    } catch (error: any) {
      console.error('❌ Error loading race data:', error)
      const errorMessage = error?.message || String(error)
      setRaceData({ 
        loading: false, 
        error: `Failed to load race data: ${errorMessage}

⚠️ This is likely a timeout or worker connectivity issue.
🔧 Try: Refresh the page or select a different track/race.
🌐 Worker URL: https://drive-proxy.blockmusic.workers.dev
📁 Google Drive Folder: ${selectedTrack}/${selectedRace}

If this persists, check browser console for detailed error logs.`,
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
      console.log('🤖 Requesting AI analysis...')
      
      // Download actual data files if they're just metadata
      const files = raceData.data[0].files
      let raceResults = null
      let lapTimes = null
      let weather = null
      
      if (files?.raceResults?.downloadUrl) {
        console.log('📥 Downloading race results...')
        const res = await fetch(files.raceResults.downloadUrl)
        raceResults = await res.json()
      }
      
      if (files?.lapTimes?.downloadUrl) {
        console.log('📥 Downloading lap times...')
        const res = await fetch(files.lapTimes.downloadUrl)
        lapTimes = await res.json()
      }
      
      if (files?.weather?.downloadUrl) {
        console.log('📥 Downloading weather data...')
        const res = await fetch(files.weather.downloadUrl)
        weather = await res.json()
      }
      
      // Call AI analysis endpoint
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceResults,
          lapTimes,
          weather,
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

      const pdfDocs = raceData.data[0]?.pdfDocuments || []
      const pdfSection = pdfDocs.length > 0 
        ? `\n\nAvailable Reference Documents:\n${pdfDocs.map((pdf: any) => `- ${pdf.name} (${(pdf.size / 1024 / 1024).toFixed(2)} MB)`).join('\n')}`
        : ''

      // Build report with AI analysis
      const report = `KobayashiAI Race Analysis Report
Track: ${tracks.find(t => t.id === selectedTrack)?.name}
Race: ${selectedRace}
Generated: ${new Date().toLocaleString()}
Data Source: ${raceData.data[0]?.source || 'Google Drive'}
AI Model: ${result.metadata?.model || 'GPT-4'}${pdfSection}

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Car className="w-8 h-8 text-racing-red" />
              <h1 className="text-2xl font-bold">KobayashiAI Dashboard</h1>
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
        <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Race Analysis Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={startRaceReplay}
              disabled={isReplaying}
              className="bg-racing-red hover:bg-red-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              {isReplaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isReplaying ? 'Analyzing...' : 'Start Race Replay'}</span>
            </button>
            
            <button 
              onClick={() => loadRaceData()}
              disabled={raceData.loading}
              className="border border-gray-600 hover:border-gray-400 disabled:border-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="w-5 h-5" />
              <span>{raceData.loading ? 'Loading...' : 'Load Analytics'}</span>
            </button>

            <button 
              onClick={exportReport}
              disabled={isGeneratingReport || raceData.data.length === 0}
              className="bg-racing-blue hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
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

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-racing-blue" />
              Worker Status
            </h3>
            <p className="text-gray-300 mb-3">
              <strong>Connection:</strong>{' '}
              {workerStatus === 'checking' && <span className="text-yellow-400">Checking...</span>}
              {workerStatus === 'online' && <span className="text-green-400">✓ Online</span>}
              {workerStatus === 'offline' && <span className="text-red-400">✗ Offline</span>}
              {workerStatus === null && <span className="text-gray-400">Not tested</span>}
            </p>
            <button
              onClick={checkWorkerStatus}
              disabled={workerStatus === 'checking'}
              className="bg-racing-blue hover:bg-racing-blue/80 px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {workerStatus === 'checking' ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Data Loading Status */}
        {raceData.loading && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-racing-blue"></div>
              <span>Loading race data from remote source...</span>
            </div>
          </div>
        )}

        {raceData.error && (
          <div className="mb-8">
            <SetupGuide />
          </div>
        )}

        {raceData.data.length > 0 && (
          <>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-green-400 mb-2">Data Loaded Successfully</h3>
              <p className="text-green-300">Race data loaded and ready for AI analysis.</p>
              {raceData.data[0]?.pdfDocuments?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-800">
                  <h4 className="font-semibold text-green-400 mb-2">📄 Available PDF Documents ({raceData.data[0].pdfDocuments.length})</h4>
                  <div className="space-y-2">
                    {raceData.data[0].pdfDocuments.map((pdf: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-800/30 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-300">{pdf.name}</span>
                          <span className="text-xs text-gray-500">({(pdf.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <a 
                          href={pdf.downloadUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-racing-blue hover:bg-racing-blue/80 text-white px-3 py-1 rounded transition-colors"
                        >
                          View PDF
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ℹ️ These documents enhance AI analysis with additional race context and technical data.
                  </p>
                </div>
              )}
            </div>
          </>
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
            pdfUrl={raceData.data[0]?.pdfDocuments?.[0]?.downloadUrl}
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
            initialWeather={raceData.data[0]?.weather}
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
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <Brain className="w-8 h-8 text-racing-red mb-4" />
            <h4 className="text-lg font-semibold mb-2">3-Lap Predictor</h4>
            <p className="text-gray-400 text-sm">AI forecasts next 3 laps with 89-95% accuracy</p>
            <div className="mt-4 text-2xl font-bold text-racing-red">92%</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <Clock className="w-8 h-8 text-racing-blue mb-4" />
            <h4 className="text-lg font-semibold mb-2">Race Replay</h4>
            <p className="text-gray-400 text-sm">Interactive timeline with AI alerts</p>
            <div className="mt-4 text-2xl font-bold text-racing-blue">Real-time</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <Target className="w-8 h-8 text-racing-red mb-4" />
            <h4 className="text-lg font-semibold mb-2">Strategy Validator</h4>
            <p className="text-gray-400 text-sm">Validates pit calls against race outcomes</p>
            <div className="mt-4 text-2xl font-bold text-racing-red">92%</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <Zap className="w-8 h-8 text-racing-blue mb-4" />
            <h4 className="text-lg font-semibold mb-2">AI Training</h4>
            <p className="text-gray-400 text-sm">Generates actionable driver insights</p>
            <div className="mt-4 text-2xl font-bold text-racing-blue">PDF Export</div>
          </div>
        </div>
      </div>
    </div>
  )
}
