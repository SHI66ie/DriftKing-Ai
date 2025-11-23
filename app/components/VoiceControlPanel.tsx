'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Radio, MessageSquare, Settings } from 'lucide-react'

interface VoiceControlPanelProps {
  raceData: any
  track: string
  race: string
}

export default function VoiceControlPanel({ raceData, track, race }: VoiceControlPanelProps) {
  const [isListening, setIsListening] = useState(false)
  const [voiceMode, setVoiceMode] = useState<'race_engineer' | 'race_strategist' | 'driving_coach' | 'spotter'>('race_engineer')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [conversationHistory, setConversationHistory] = useState<Array<{command: string, response: string, timestamp: Date}>>([])
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<any>(null)

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[0][0].transcript
        setTranscript(command)
        processVoiceCommand(command)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      setTranscript('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const processVoiceCommand = async (command: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/ai-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceCommand: command,
          currentContext: {
            track,
            position: 3,
            currentLap: 15,
            totalLaps: 30,
            speed: 180,
            tireCondition: 'Good',
            fuelLevel: 65
          },
          driverProfile: {
            name: 'Driver',
            experience: 'Advanced',
            style: 'Aggressive',
            communication: 'Concise'
          },
          raceState: {
            sessionType: 'Race',
            weather: 'Dry',
            trackTemp: 35,
            timeRemaining: '15:30'
          },
          mode: voiceMode
        })
      })

      const data: any = await response.json()
      
      if (data.success) {
        setResponse(data.voiceResponse)
        
        // Add to conversation history
        setConversationHistory(prev => [...prev, {
          command,
          response: data.voiceResponse,
          timestamp: new Date()
        }].slice(-10)) // Keep last 10 exchanges

        // Speak the response if audio is enabled
        if (audioEnabled && synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(data.voiceResponse)
          utterance.rate = data.audioSuggestion?.suggestedSpeed === 'fast' ? 1.2 : 1.0
          utterance.volume = data.audioSuggestion?.volume === 'loud' ? 1.0 : 0.8
          utterance.pitch = 1.0
          synthRef.current.speak(utterance)
        }
      }
    } catch (error) {
      console.error('Voice command processing error:', error)
      setResponse('Sorry, I couldn\'t process that command. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const voiceModes = [
    {
      id: 'race_engineer' as const,
      name: 'Race Engineer',
      icon: Settings,
      description: 'Technical analysis and setup advice',
      color: 'text-blue-400'
    },
    {
      id: 'race_strategist' as const,
      name: 'Strategist',
      icon: MessageSquare,
      description: 'Race strategy and pit decisions',
      color: 'text-purple-400'
    },
    {
      id: 'driving_coach' as const,
      name: 'Driving Coach',
      icon: Volume2,
      description: 'Driving technique and performance',
      color: 'text-green-400'
    },
    {
      id: 'spotter' as const,
      name: 'Spotter',
      icon: Radio,
      description: 'Traffic and safety alerts',
      color: 'text-yellow-400'
    }
  ]

  const quickCommands = [
    'What\'s my gap to the leader?',
    'When should I pit?',
    'How are my tire temperatures?',
    'What\'s my current pace?',
    'Any traffic behind me?',
    'Fuel status check',
    'Weather update please',
    'Setup recommendations'
  ]

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center mb-6">
        <div className="relative">
          <Mic className="w-7 h-7 text-purple-400 mr-3" />
          {isListening && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
        </div>
        <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Voice Control Center</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent mx-4" />
        <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
          AI Race Radio
        </span>
      </div>

      {/* Voice Mode Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {voiceModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => setVoiceMode(mode.id)}
              className={`p-3 rounded-lg transition-all ${
                voiceMode === mode.id
                  ? 'bg-racing-blue text-white border-2 border-racing-blue'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1 ${voiceMode === mode.id ? 'text-white' : mode.color}`} />
              <div className="text-xs font-semibold">{mode.name}</div>
            </button>
          )
        })}
      </div>

      {/* Voice Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`p-4 rounded-full transition-all ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-racing-blue hover:bg-racing-blue/80'
          } disabled:opacity-50`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-3 rounded-lg transition-all ${
            audioEnabled 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {audioEnabled ? (
            <Volume2 className="w-5 h-5 text-white" />
          ) : (
            <VolumeX className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Status Display */}
      <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Status:</span>
          <span className={`text-sm px-2 py-1 rounded ${
            isListening ? 'bg-red-500/20 text-red-400' :
            isProcessing ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
          </span>
        </div>

        {transcript && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">You said:</div>
            <div className="text-sm bg-blue-900/20 p-2 rounded border-l-2 border-blue-500">
              "{transcript}"
            </div>
          </div>
        )}

        {response && (
          <div>
            <div className="text-xs text-gray-400 mb-1">{voiceModes.find(m => m.id === voiceMode)?.name} responds:</div>
            <div className="text-sm bg-green-900/20 p-2 rounded border-l-2 border-green-500">
              {response}
            </div>
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">Quick Commands:</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickCommands.map((command, idx) => (
            <button
              key={idx}
              onClick={() => processVoiceCommand(command)}
              disabled={isProcessing}
              className="text-left p-2 bg-gray-700/50 hover:bg-gray-700 rounded text-xs transition-colors disabled:opacity-50"
            >
              "{command}"
            </button>
          ))}
        </div>
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Radio Traffic:</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {conversationHistory.slice(-5).map((exchange, idx) => (
              <div key={idx} className="text-xs bg-gray-900/30 p-2 rounded">
                <div className="text-blue-400 mb-1">
                  {exchange.timestamp.toLocaleTimeString()}: "{exchange.command}"
                </div>
                <div className="text-green-400">
                  → {exchange.response}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser Compatibility Note */}
      {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-sm text-yellow-400">
          Voice recognition not supported in this browser. Try Chrome or Edge for full functionality.
        </div>
      )}
    </div>
  )
}
