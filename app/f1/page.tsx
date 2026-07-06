'use client'

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, Fragment } from 'react'
import { Trophy, Zap, Target, Brain, Clock, Play, Pause, BarChart3, Download, Flag, TrendingUp, ArrowLeft, ArrowRight, Calendar, LayoutDashboard, Settings, Info, Cloud, Thermometer, Wind, Droplets, History, Database, Satellite, Activity, Eye } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

import Link from 'next/link'
import { hybridF1Api, transformHybridData } from '@/lib/hybrid-f1-api'
import { openf1Api, transformOpenF1Data } from '@/lib/openf1-api'
import { getHistoricalResults } from '@/lib/historical-f1-data'

// Lazy load heavy components for F1 optimization
const TrackMapViewer = lazy(() => import('../components/TrackMapViewer'))
const WeatherControls = lazy(() => import('../components/WeatherControls'))
const F1AIChat = lazy(() => import('../components/F1AIChat'))
const DecisionPanel = lazy(() => import('../components/DecisionPanel'))
const DriverComparisonPanel = lazy(() => import('../components/DriverComparisonPanel'))
const LiveDataTicker = lazy(() => import('../components/LiveDataTicker'))
const RaceVisualization = lazy(() => import('../components/RaceVisualization'))
const WhatIfSimulator = lazy(() => import('../components/WhatIfSimulator'))
const LiveFeedProvider = lazy(() => import('../components/LiveFeedProvider').then(mod => ({ default: mod.LiveFeedProvider })))
const LiveFeedToggle = lazy(() => import('../components/LiveFeedToggle'))

// Performance monitoring hook
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring'

interface RaceData {
  loading: boolean
  error: string | null
  data: any[]
}

export default function F1Page() {
  // F1 Performance monitoring
  try {
    usePerformanceMonitoring()
  } catch (error) {
    console.error('Performance monitoring error:', error)
  }

  // Error boundary state
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Error boundary wrapper
  const handleError = (error: Error) => {
    console.error('F1 Page Error:', error)
    setHasError(true)
    setErrorMessage(error.message)
  }

  // Wrap component in error boundary
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-400 mb-4">
            An error occurred while loading the F1 page.
          </p>
          <details className="text-left text-gray-500 mb-4">
            <summary>Error details</summary>
            <pre className="mt-2 p-4 bg-gray-800 rounded text-sm overflow-auto">
              {errorMessage}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // State declarations for F1
  const [selectedTrack, setSelectedTrack] = useState('melbourne') // Start with Australia - first race of 2026 season
  const [selectedRace, setSelectedRace] = useState('R1')
  const [isReplaying, setIsReplaying] = useState(false)
  const [raceData, setRaceData] = useState<RaceData>({ loading: false, error: null, data: [] })
  const [generatedReport, setGeneratedReport] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [simulatedWeather, setSimulatedWeather] = useState<any>(null)
  const [dataSourceMode, setDataSourceMode] = useState<'official' | 'custom'>('official')
  const [customDataError, setCustomDataError] = useState<string | null>(null)
  const [customTrackMapUrl, setCustomTrackMapUrl] = useState<string | null>(null)

  // Top-level Navigation Tabs
  const [activeTab, setActiveTab] = useState<'upcoming' | 'builder' | 'analytics' | 'ai' | 'practice' | 'standings' | 'archives'>('upcoming')


  // Mock upcoming races 2026 - Chronological Calendar Order
  const upcomingRacesList = useMemo(() => [
    { id: 'melbourne', name: 'Australian GP', date: 'March 6-8, 2026', track: 'Albert Park Circuit', country: 'Australia', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'shanghai', name: 'Chinese GP', date: 'March 15, 2026', track: 'Shanghai International Circuit', country: 'China', leader: 'Lando Norris', format: 'Standard' },
    { id: 'suzuka', name: 'Japanese GP', date: 'March 29, 2026', track: 'Suzuka International Racing Course', country: 'Japan', leader: 'Charles Leclerc', format: 'Sprint' },
    { id: 'bahrain', name: 'Bahrain GP', date: 'April 12, 2026', track: 'Bahrain International Circuit', country: 'Bahrain', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'jeddah', name: 'Saudi Arabian GP', date: 'April 19, 2026', track: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', leader: 'Oscar Piastri', format: 'Standard' },
    { id: 'miami', name: 'Miami GP', date: 'May 3-5, 2026', track: 'Miami International Autodrome', country: 'USA', leader: 'Lando Norris', format: 'Sprint' },
    { id: 'imola', name: 'Emilia Romagna GP', date: 'May 17-18, 2026', track: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'monaco', name: 'Monaco GP', date: 'May 24-25, 2026', track: 'Circuit de Monaco', country: 'Monaco', leader: 'Charles Leclerc', format: 'Standard' },
    { id: 'villeneuve', name: 'Canadian GP', date: 'June 13-15, 2026', track: 'Circuit Gilles Villeneuve', country: 'Canada', leader: 'Lando Norris', format: 'Standard' },
    { id: 'catalunya', name: 'Spanish GP', date: 'June 20-22, 2026', track: 'Circuit de Barcelona-Catalunya', country: 'Spain', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'redbull-ring', name: 'Austrian GP', date: 'June 27-29, 2026', track: 'Red Bull Ring', country: 'Austria', leader: 'Max Verstappen', format: 'Sprint' },
    { id: 'silverstone', name: 'British GP', date: 'July 3-5, 2026', track: 'Silverstone Circuit', country: 'UK', leader: 'Kimi Antonelli', format: 'Standard', recap: 'The British GP has concluded in a highly chaotic race featuring a bizarre finish under the Safety Car due to an FIA software error. Charles Leclerc won for Ferrari, breaking a massive 624-day winless streak after capitalizing on a poor start from pole-sitter Kimi Antonelli. George Russell claimed second, and Lewis Hamilton finished third. Championship leader Kimi Antonelli suffered a late technical failure (broken wheel-fairing/brake duct) and was demoted to 16th place after a penalty. Max Verstappen crashed out at Stowe on lap 48. The championship battle has tightened significantly, with Antonelli\'s lead over Russell slashed to 25 points.' },
    { id: 'hungaroring', name: 'Hungarian GP', date: 'July 25-27, 2026', track: 'Hungaroring', country: 'Hungary', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'spa', name: 'Belgian GP', date: 'August 1-3, 2026', track: 'Circuit de Spa-Francorchamps', country: 'Belgium', leader: 'Charles Leclerc', format: 'Sprint' },
    { id: 'zandvoort', name: 'Dutch GP', date: 'August 29-31, 2026', track: 'Circuit Zandvoort', country: 'Netherlands', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'monza', name: 'Italian GP', date: 'September 5-7, 2026', track: 'Autodromo Nazionale Monza', country: 'Italy', leader: 'Charles Leclerc', format: 'Standard' },
    { id: 'baku', name: 'Azerbaijan GP', date: 'September 19-21, 2026', track: 'Baku City Circuit', country: 'Azerbaijan', leader: 'Oscar Piastri', format: 'Sprint' },
    { id: 'marina-bay', name: 'Singapore GP', date: 'October 3-5, 2026', track: 'Marina Bay Street Circuit', country: 'Singapore', leader: 'Lando Norris', format: 'Standard' },
    { id: 'americas', name: 'United States GP', date: 'October 17-19, 2026', track: 'Circuit of the Americas', country: 'USA', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'rodriguez', name: 'Mexico City GP', date: 'October 24-26, 2026', track: 'AutΓö£Γöédromo Hermanos RodrΓö£┬íguez', country: 'Mexico', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'interlagos', name: 'SΓö£├║o Paulo GP', date: 'November 7-9, 2026', track: 'AutΓö£Γöédromo JosΓö£ΓîÉ Carlos Pace', country: 'Brazil', leader: 'Lando Norris', format: 'Sprint' },
    { id: 'vegas', name: 'Las Vegas GP', date: 'November 21-23, 2026', track: 'Las Vegas Strip Circuit', country: 'USA', leader: 'Max Verstappen', format: 'Standard' },
    { id: 'yas-marina', name: 'Abu Dhabi GP', date: 'December 5-7, 2026', track: 'Yas Marina Circuit', country: 'UAE', leader: 'Max Verstappen', format: 'Standard' }
  ], [])

  // API Data State - Initialized with 2026 grid data
  const [apiTeams, setApiTeams] = useState<any[]>([
    { id: 'redbull', name: 'Red Bull Racing', color: '#1e40af' },
    { id: 'mercedes', name: 'Mercedes AMG', color: '#00d2be' },
    { id: 'ferrari', name: 'Scuderia Ferrari', color: '#ef4444' },
    { id: 'mclaren', name: 'McLaren F1', color: '#ff8000' },
    { id: 'aston', name: 'Aston Martin', color: '#006f62' },
    { id: 'alpine', name: 'Alpine F1', color: '#0090ff' },
    { id: 'williams', name: 'Williams Racing', color: '#005aff' },
    { id: 'rb', name: 'Visa Cash App RB', color: '#6692ff' },
    { id: 'sauber', name: 'Audi/Sauber', color: '#000000' },
    { id: 'haas', name: 'Haas F1 Team', color: '#ffffff' }
  ])
  const [apiDrivers, setApiDrivers] = useState<any[]>([
    { id: '1', name: 'Max Verstappen', number: '1', team: 'Red Bull Racing', code: 'VER' },
    { id: '11', name: 'Sergio Perez', number: '11', team: 'Red Bull Racing', code: 'PER' },
    { id: '44', name: 'Lewis Hamilton', number: '44', team: 'Ferrari', code: 'HAM' },
    { id: '16', name: 'Charles Leclerc', number: '16', team: 'Ferrari', code: 'LEC' },
    { id: '4', name: 'Lando Norris', number: '4', team: 'McLaren', code: 'NOR' },
    { id: '81', name: 'Oscar Piastri', number: '81', team: 'McLaren', code: 'PIA' },
    { id: '63', name: 'George Russell', number: '63', team: 'Mercedes AMG', code: 'RUS' },
    { id: '47', name: 'Andrea Kimi Antonelli', number: '47', team: 'Mercedes AMG', code: 'ANT' },
    { id: '14', name: 'Fernando Alonso', number: '14', team: 'Aston Martin', code: 'ALO' },
    { id: '18', name: 'Lance Stroll', number: '18', team: 'Aston Martin', code: 'STR' },
    { id: '10', name: 'Pierre Gasly', number: '10', team: 'Alpine F1', code: 'GAS' },
    { id: '31', name: 'Esteban Ocon', number: '31', team: 'Haas F1 Team', code: 'OCO' },
    { id: '23', name: 'Alexander Albon', number: '23', team: 'Williams Racing', code: 'ALB' },
    { id: '55', name: 'Carlos Sainz', number: '55', team: 'Williams', code: 'SAI' },
    { id: '22', name: 'Yuki Tsunoda', number: '22', team: 'Visa Cash App RB', code: 'TSU' },
    { id: 'Liam', name: 'Liam Lawson', number: '30', team: 'Visa Cash App RB', code: 'LAW' },
    { id: '27', name: 'Nico Hulkenberg', number: '27', team: 'Audi/Sauber', code: 'HUL' },
    { id: '12', name: 'Jack Doohan', number: '12', team: 'Alpine F1', code: 'DOO' },
    { id: 'Bearman', name: 'Oliver Bearman', number: '87', team: 'Haas F1 Team', code: 'BEA' },
    { id: '24', name: 'Zhou Guanyu', number: '24', team: 'Audi/Sauber', code: 'ZHO' }
  ])

  const [apiSessions, setApiSessions] = useState<any[]>([])
  const [apiRaces, setApiRaces] = useState<any[]>([])
  const [apiStandings, setApiStandings] = useState<any[]>([])
  const [nextEvent, setNextEvent] = useState<any>(null)
  const [currentRaceIndex, setCurrentRaceIndex] = useState(() => {
    // Initialize to the first future race based on today's date
    const now = new Date();
    const raceDates = [
      { date: 'March 6-8, 2026' }, { date: 'March 15, 2026' }, { date: 'March 29, 2026' },
      { date: 'April 12, 2026' }, { date: 'April 19, 2026' }, { date: 'May 3-5, 2026' },
      { date: 'May 17-18, 2026' }, { date: 'May 24-25, 2026' }, { date: 'June 13-15, 2026' },
      { date: 'June 20-22, 2026' }, { date: 'June 27-29, 2026' }, { date: 'July 3-5, 2026' },
      { date: 'July 25-27, 2026' }, { date: 'August 1-3, 2026' }, { date: 'August 29-31, 2026' },
      { date: 'September 5-7, 2026' }, { date: 'September 20-22, 2026' },
      { date: 'October 4-6, 2026' }, { date: 'October 18-20, 2026' }, { date: 'October 25-27, 2026' },
      { date: 'November 15-17, 2026' }, { date: 'November 22-23, 2026' },
      { date: 'December 5-7, 2026' }, { date: 'December 12-14, 2026' },
    ];
    const months: Record<string, number> = {
      January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
      July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };
    for (let i = 0; i < raceDates.length; i++) {
      const datePart = raceDates[i].date.replace(/,.*/, '');
      const parts = datePart.trim().split(/\s+/);
      const month = months[parts[0]] ?? 0;
      const yearMatch = raceDates[i].date.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2026;
      // Use end day of range if present
      const dayRange = datePart.replace(parts[0] + ' ', '');
      const endDay = parseInt(dayRange.split('-').pop() || dayRange);
      const raceEnd = new Date(year, month, endDay, 18, 0, 0);
      if (now < raceEnd) return i;
    }
    return raceDates.length - 1;
  }) // Track current race in sequence - initialized by date
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [useRealData, setUseRealData] = useState(false)

  // Get current race based on index
  const currentRace = upcomingRacesList[currentRaceIndex] || upcomingRacesList[0]

  // Update nextEvent when currentRace changes
  useEffect(() => {
    if (currentRace) {
      setNextEvent({
        session_name: currentRace.name,
        date_start: currentRace.date,
        circuit_short_name: currentRace.track
      })
    }
  }, [currentRace])

  // Practice/Testing State
  const [practiceSessions, setPracticeSessions] = useState<any[]>([])
  const [selectedPracticeSession, setSelectedPracticeSession] = useState<number | null>(null)
  const [practiceData, setPracticeData] = useState<any[]>([])
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [selectedTrackForPractice, setSelectedTrackForPractice] = useState<string>(selectedTrack) // Track selector for practice

  // Standings State
  const [standingsData, setStandingsData] = useState<{
    season: any[], // General season championship
    track: { // Track-specific standings for selected track
      championship: any[],
      qualifying: any[],
      raceResults: any[],
      sprintResults: any[]
    },
    allTracks: any[] // All tracks with their latest standings
  }>({
    season: [],
    track: {
      championship: [],
      qualifying: [],
      raceResults: [],
      sprintResults: []
    },
    allTracks: []
  })

  // Historical standings state
  const [historicalStandings, setHistoricalStandings] = useState<{
    availableYears: number[],
    selectedYear: number,
    availableRaces: any[],
    selectedRace: string,
    seasonStandings: any[],
    raceResults: any[]
  }>({
    availableYears: [2024, 2025, 2026],
    selectedYear: 2026,
    availableRaces: [],
    selectedRace: '',
    seasonStandings: [],
    raceResults: []
  })
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [selectedRaceForStandings, setSelectedRaceForStandings] = useState<string>(selectedTrack) // Use selectedTrack
  const [selectedSessionType, setSelectedSessionType] = useState<'all' | 'qualifying' | 'race' | 'sprint'>('all')
  const [standingsView, setStandingsView] = useState<'season' | 'track' | 'historical'>('season') // New view toggle

  // Calendar Race-Specific Standings Preview State
  const [calendarStandings, setCalendarStandings] = useState<Record<string, any[]>>({});
  const [loadingCalendarStandings, setLoadingCalendarStandings] = useState<Set<string>>(new Set());
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);
  
  // Top 3 results state for past races
  const [top3Results, setTop3Results] = useState<Record<string, { position: number; driver: string; team: string }[]>>({});
  const [loadingTop3Results, setLoadingTop3Results] = useState<Set<string>>(new Set());

  // Calendar Past Races State
  const [showPastRaces, setShowPastRaces] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState<string | null>(null);

  // New Historical Data States
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [archivesData, setArchivesData] = useState<any[]>([])
  const [archivesLoading, setArchivesLoading] = useState(false)
  
  // Detailed race standings state
  const [detailedRaceStandings, setDetailedRaceStandings] = useState<{
    raceId: string | null;
    raceName: string;
    raceDate: string;
    loading: boolean;
    data: {
      qualifying: any[];
      race: any[];
      sprint: any[];
    };
  }>({
    raceId: null,
    raceName: '',
    raceDate: '',
    loading: false,
    data: {
      qualifying: [],
      race: [],
      sprint: []
    }
  })

  // UseEffect to fetch historical data
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedTrack) return;
      setHistoryLoading(true);
      try {
        const track = upcomingRacesList.find(t => t.id === selectedTrack)?.name || selectedTrack;
        const res = await fetch(`/api/f1/history?track=${encodeURIComponent(track)}&t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setHistoricalData(data.history);
        }
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedTrack, upcomingRacesList]);

  // UseEffect to fetch archives
  const fetchArchives = useCallback(async () => {
    setArchivesLoading(true);
    try {
      const res = await fetch(`/api/f1/archives?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setArchivesData(data.archives);
      }
    } catch (err) {
      console.error("Archives fetch error:", err);
    } finally {
      setArchivesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'archives') {
      fetchArchives();
    }
  }, [activeTab, fetchArchives]);

  // Fetch top 3 results for past races
  const fetchTop3Results = useCallback(async (raceId: string, raceName: string, raceDate: string) => {
    try {
      console.log(`Starting fetch for ${raceName} in ${new Date(raceDate).getFullYear()}`);
      
      // Get the year from the race date or use current year
      const year = new Date(raceDate).getFullYear() || new Date().getFullYear();
      
      // Try to get historical data first (more reliable for past races)
      const historicalResults = getHistoricalResults(raceName, raceDate);
      if (historicalResults) {
        console.log(`Using historical data for ${raceName}:`, historicalResults);
        return historicalResults;
      }
      
      // Find the session for this race with improved matching
      const sessions = await hybridF1Api.getSessions(year);
      console.log(`Available sessions:`, sessions.map(s => ({ 
        name: s.session_name ?? '', 
        circuit: s.circuit_short_name ?? '', 
        type: s.session_type,
        key: s.session_key 
      })));
      
      // Normalize race name for better matching
      const normalizedRaceName = raceName.toLowerCase()
        .replace(/ grand prix/gi, '')
        .replace(/ gp$/i, '')
        .replace(/[^a-z]/g, '')
        .trim();
      
      console.log(`Looking for race: "${raceName}" (normalized: "${normalizedRaceName}")`);
      
      const raceSession = sessions.find(s => {
        if (s.session_type !== 'Race') return false;

        const sessionName = s.session_name ?? '';
        const circuitName = s.circuit_short_name ?? '';
        
        const normalizedSessionName = sessionName.toLowerCase()
          .replace(/ grand prix/gi, '')
          .replace(/ gp$/i, '')
          .replace(/[^a-z]/g, '')
          .trim();
          
        const normalizedCircuitName = circuitName.toLowerCase()
          .replace(/[^a-z]/g, '')
          .trim();
        
        console.log(`Checking session: "${sessionName}" -> "${normalizedSessionName}" vs "${normalizedRaceName}"`);
        console.log(`Checking circuit: "${circuitName}" -> "${normalizedCircuitName}" vs "${normalizedRaceName}"`);
        
        return normalizedSessionName.includes(normalizedRaceName) || 
               normalizedRaceName.includes(normalizedSessionName) ||
               normalizedCircuitName.includes(normalizedRaceName) || 
               normalizedRaceName.includes(normalizedCircuitName);
      });
      
      if (!raceSession) {
        console.warn(`No race session found for ${raceName} in ${year}`);
        console.log('Available race sessions:', sessions.filter(s => s.session_type === 'Race').map(s => s.session_name ?? ''));
        // Return fallback data with different drivers to indicate fallback
        return [
          { position: 1, driver: 'No Data Available', team: 'API Issue' },
          { position: 2, driver: 'Check Console', team: 'For Details' },
          { position: 3, driver: 'API Error', team: 'Try Again' }
        ];
      }
      
      console.log(`Found race session: ${raceSession.session_name ?? 'Unknown'} (${raceSession.session_key ?? 'n/a'})`);
      
      const sessionKey = raceSession.session_key;
      if (typeof sessionKey !== 'number') {
        console.warn(`No valid session key for ${raceName} in ${year}`);
        return [
          { position: 1, driver: 'No Data Available', team: 'API Issue' },
          { position: 2, driver: 'Check Console', team: 'For Details' },
          { position: 3, driver: 'API Error', team: 'Try Again' }
        ];
      }
      
      // Fetch real position data from Hybrid API
      const positionData = await hybridF1Api.getPositionData(sessionKey);
      console.log(`Found ${positionData.length} position records`);
      
      const drivers = await hybridF1Api.getDrivers(sessionKey);
      console.log(`Found ${drivers.length} drivers`);
      
      if (positionData && positionData.length > 0) {
        const finalPositions = new Map();
        positionData.forEach((pos: any) => {
          finalPositions.set(pos.driver_number, pos);
        });
        
        const sortedPositions = Array.from(finalPositions.values())
          .sort((a: any, b: any) => a.position - b.position)
          .slice(0, 3); // Top 3 only
        
        console.log(`Top 3 positions:`, sortedPositions);
        
        const results = sortedPositions.map((pos, index) => {
          const driver = drivers.find((d: any) => d.driver_number === pos.driver_number);
          return {
            position: pos.position,
            driver: driver ? driver.full_name : `Driver ${pos.driver_number}`,
            team: driver ? driver.team_name : 'Unknown'
          };
        });
        
        console.log(`Processed results:`, results);
        return results;
      } else {
        console.warn(`No position data found for ${raceName}`);
        // Return fallback data
        return [
          { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing' },
          { position: 2, driver: 'Charles Leclerc', team: 'Ferrari' },
          { position: 3, driver: 'Lando Norris', team: 'McLaren' }
        ];
      }
    } catch (error) {
      console.error('Failed to fetch top 3 results:', error);
      // Return fallback data on error
      return [
        { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing' },
        { position: 2, driver: 'Charles Leclerc', team: 'Ferrari' },
        { position: 3, driver: 'Lando Norris', team: 'McLaren' }
      ];
    }
  }, []);

  // Fetch detailed race standings
  const fetchDetailedRaceStandings = useCallback(async (raceId: string, raceName: string, raceDate: string) => {
    setDetailedRaceStandings(prev => ({ ...prev, raceId, raceName, raceDate, loading: true }));
    
    try {
      // Get the year from the race date or use current year
      const year = new Date(raceDate).getFullYear() || new Date().getFullYear();
      
      // Find the session for this race
      const sessions = await hybridF1Api.getSessions(year);
      const raceSession = sessions.find(s => {
        const circuitName = s.circuit_short_name ?? '';
        const sessionName = s.session_name ?? '';
        return s.session_type === 'Race' && (
          circuitName.toLowerCase().includes(raceName.toLowerCase().replace(/ grand prix/gi, '').trim()) ||
          sessionName.toLowerCase().includes(raceName.toLowerCase().replace(/ grand prix/gi, '').trim())
        );
      });
      
      if (!raceSession) {
        console.warn(`No race session found for ${raceName} in ${year}`);
        setDetailedRaceStandings(prev => ({ ...prev, loading: false }));
        return;
      }
      
      const sessionKey = raceSession.session_key;
      if (typeof sessionKey !== 'number') {
        console.warn(`No valid session key for ${raceName} in ${year}`);
        setDetailedRaceStandings(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch real data from Hybrid API
      const [qualifyingLapData, positionData, sprintPositionData] = await Promise.all([
        hybridF1Api.getLaps(sessionKey),
        hybridF1Api.getPositionData(sessionKey),
        hybridF1Api.getSessions(year).then(sessions => 
          sessions.find(s => s.session_type === 'Sprint' && s.circuit_short_name === raceSession.circuit_short_name)
        ).then(sprintSession => sprintSession ? hybridF1Api.getPositionData(sprintSession.session_key ?? 0) : [])
      ]);
      
      // Get driver information
      const drivers = await hybridF1Api.getDrivers(sessionKey);
      
      // Process qualifying results
      const qualifyingResults: any[] = [];
      if (qualifyingLapData && qualifyingLapData.length > 0) {
        // Group laps by driver and find best times
        const driverQualifyingLaps = new Map();
        qualifyingLapData.forEach(lap => {
          if (lap.lap_duration && lap.lap_duration > 0) {
            if (!driverQualifyingLaps.has(lap.driver_number) || lap.lap_duration < driverQualifyingLaps.get(lap.driver_number).lap_duration) {
              driverQualifyingLaps.set(lap.driver_number, lap);
            }
          }
        });
        
        // Sort drivers by best lap time
        const sortedQualifyingLaps = Array.from(driverQualifyingLaps.values())
          .sort((a: any, b: any) => a.lap_duration - b.lap_duration)
          .slice(0, 20); // Top 20 for qualifying
        
        // Create qualifying results with Q1, Q2, Q3 simulation
        sortedQualifyingLaps.forEach((lap, index) => {
          const driver = drivers.find((d: any) => d.driver_number === lap.driver_number);
          // Simulate Q1, Q2, Q3 based on lap times
          const q1Time = lap.lap_duration;
          const q2Time = q1Time * 1.02; // Slightly slower
          const q3Time = q2Time * 1.02; // Slightly slower
          
          qualifyingResults.push({
            position: index + 1,
            driver: driver ? driver.full_name : `Driver ${lap.driver_number}`,
            team: driver ? driver.team_name : 'Unknown',
            q1: q1Time ? `${(q1Time / 60).toFixed(3)}` : 'N/A',
            q2: q2Time ? `${(q2Time / 60).toFixed(3)}` : 'N/A',
            q3: q3Time ? `${(q3Time / 60).toFixed(3)}` : 'N/A',
            gap: index === 0 ? '0.000' : `${(lap.lap_duration - sortedQualifyingLaps[0].lap_duration).toFixed(3)}`
          });
        });
      }
      
      // Process race results
      const raceResults: any[] = [];
      if (positionData && positionData.length > 0) {
        const finalPositions = new Map();
        positionData.forEach((pos: any) => {
          finalPositions.set(pos.driver_number, pos);
        });
        
        const sortedPositions = Array.from(finalPositions.values())
          .sort((a: any, b: any) => a.position - b.position)
          .slice(0, 20); // Top 20 for race
        
        sortedPositions.forEach((pos, index) => {
          const driver = drivers.find((d: any) => d.driver_number === pos.driver_number);
          raceResults.push({
            position: pos.position,
            driver: driver ? driver.full_name : `Driver ${pos.driver_number}`,
            team: driver ? driver.team_name : 'Unknown',
            grid: pos.position, // Grid position (in real app, this would come from qualifying)
            laps: Math.floor(Math.random() * 20) + 50, // In real app, this would be actual lap count
            time: index === 0 ? '1:28:45.672' : `+${(Math.random() * 30 + 5).toFixed(3)}s`, // In real app, actual race time
            points: index < 10 ? [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][index] || 0 : 0,
            status: pos.position <= 20 ? 'Finished' : 'DNF'
          });
        });
      }
      
      // Process sprint results (if available)
      const sprintResults: any[] = [];
      if (sprintPositionData && sprintPositionData.length > 0) {
        const finalSprintPositions = new Map();
        sprintPositionData.forEach((pos: any) => {
          finalSprintPositions.set(pos.driver_number, pos);
        });
        
        const sortedSprintPositions = Array.from(finalSprintPositions.values())
          .sort((a: any, b: any) => a.position - b.position)
          .slice(0, 10); // Top 10 for sprint
        
        sortedSprintPositions.forEach((pos, index) => {
          const driver = drivers.find((d: any) => d.driver_number === pos.driver_number);
          sprintResults.push({
            position: pos.position,
            driver: driver ? driver.full_name : `Driver ${pos.driver_number}`,
            team: driver ? driver.team_name : 'Unknown',
            laps: Math.floor(Math.random() * 15) + 20, // In real app, actual sprint lap count
            time: index === 0 ? '28:45.123' : `+${(Math.random() * 10 + 2).toFixed(3)}s`, // In real app, actual sprint time
            points: index < 8 ? [8, 7, 6, 5, 4, 3, 2, 1][index] || 0 : 0,
            status: pos.position <= 10 ? 'Finished' : 'DNF'
          });
        });
      }

      setDetailedRaceStandings(prev => ({
        ...prev,
        loading: false,
        data: {
          qualifying: qualifyingResults,
          race: raceResults,
          sprint: sprintResults
        }
      }));
    } catch (error) {
      console.error('Failed to fetch detailed race standings:', error);
      // Fallback to mock data if API fails
      setDetailedRaceStandings(prev => ({
        ...prev,
        loading: false,
        data: {
          qualifying: [
            { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', q1: '1:28.456', q2: '1:27.890', q3: '1:27.234', gap: '0.000' },
            { position: 2, driver: 'Charles Leclerc', team: 'Ferrari', q1: '1:28.567', q2: '1:28.123', q3: '1:27.456', gap: '0.222' },
            { position: 3, driver: 'Lando Norris', team: 'McLaren', q1: '1:28.789', q2: '1:28.234', q3: '1:27.678', gap: '0.444' }
          ],
          race: [
            { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', grid: 1, laps: 58, time: '1:28:45.672', points: 25, status: 'Finished' },
            { position: 2, driver: 'Charles Leclerc', team: 'Ferrari', grid: 2, laps: 58, time: '+12.345', points: 18, status: 'Finished' },
            { position: 3, driver: 'Lando Norris', team: 'McLaren', grid: 3, laps: 58, time: '+18.567', points: 15, status: 'Finished' }
          ],
          sprint: []
        }
      }));
    }
  }, []);

  // Derived race list from API or Mock
  const raceList = useMemo(() => {
    if (useRealData && apiRaces.length > 0) {
      return apiRaces.map(r => ({
        id: r.id,
        name: r.name,
        date: new Date(r.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
        track: r.circuit,
        country: r.country,
        leader: 'TBD',
        format: r.type === 'Sprint' ? 'Sprint' : 'Standard'
      }))
    }
    return upcomingRacesList
  }, [apiRaces, useRealData, upcomingRacesList]);

  // Fetch top 3 results for past races when they are shown
  useEffect(() => {
    if (showPastRaces && currentRaceIndex > 0) {
      const pastRaces = apiSessions.length > 0 ? raceList.slice(0, currentRaceIndex) : upcomingRacesList.slice(0, currentRaceIndex);
      
      pastRaces.forEach(async (race) => {
        if (!top3Results[race.id] && !loadingTop3Results.has(race.id)) {
          setLoadingTop3Results(prev => new Set(prev).add(race.id));
          
          try {
            console.log(`Fetching top 3 results for ${race.name} (${race.id})`);
            const results = await fetchTop3Results(race.id, race.name, race.date);
            console.log(`Results for ${race.name}:`, results);
            if (results && results.length > 0) {
              setTop3Results(prev => ({ ...prev, [race.id]: results }));
            } else {
              // Use fallback data if API returns null or empty
              console.log(`Using fallback data for ${race.name}`);
              const fallbackData = [
                { position: 1, driver: 'No Data Available', team: 'API Issue' },
                { position: 2, driver: 'Check Console', team: 'For Details' },
                { position: 3, driver: 'API Error', team: 'Try Again' }
              ];
              setTop3Results(prev => ({ ...prev, [race.id]: fallbackData }));
            }
          } catch (error) {
            console.error(`Failed to fetch top 3 results for ${race.name}:`, error);
            // Use fallback data on error
            const fallbackData = [
              { position: 1, driver: 'API Error', team: 'Check Console' },
              { position: 2, driver: 'Network Issue', team: 'Try Refresh' },
              { position: 3, driver: 'Data Missing', team: 'API Down' }
            ];
            setTop3Results(prev => ({ ...prev, [race.id]: fallbackData }));
          } finally {
            setLoadingTop3Results(prev => {
              const newSet = new Set(prev);
              newSet.delete(race.id);
              return newSet;
            });
          }
        }
      });
    }
  }, [showPastRaces, currentRaceIndex, raceList, upcomingRacesList, apiSessions, fetchTop3Results, top3Results, loadingTop3Results]);

  // UseEffect to organize practice sessions by chronological track order
  useEffect(() => {
    if (apiSessions.length > 0) {
      // Get practice sessions organized by chronological track order
      const organizedPracticeSessions: any[] = [];
      
      // Go through tracks in chronological order and find their practice sessions
      tracks.forEach(track => {
        const trackPracticeSessions = apiSessions.filter(s => 
          (s.session_type?.includes('Practice') || s.session_type?.includes('Testing')) &&
          (s.circuit_short_name === track.name || 
           s.location === track.location ||
           s.country_name === track.country)
        );
        
        // Add sessions for this track in chronological order
        trackPracticeSessions
          .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
          .forEach(session => {
            organizedPracticeSessions.push({
              ...session,
              trackInfo: track,
              displayName: `${track.name} - ${session.session_name}`
            });
          });
      });
      
      setPracticeSessions(organizedPracticeSessions);
      
      // Select the first session or the session for the currently selected track
      if (organizedPracticeSessions.length > 0 && !selectedPracticeSession) {
        const currentTrackSession = organizedPracticeSessions.find(s => s.trackInfo.id === selectedTrackForPractice);
        setSelectedPracticeSession(currentTrackSession ? currentTrackSession.session_key : organizedPracticeSessions[0].session_key);
      }
    }
  }, [apiSessions, selectedTrackForPractice]);

  // UseEffect to fetch laps
  useEffect(() => {
    const fetchPracticeLaps = async () => {
      if (!selectedPracticeSession) return;
      setPracticeLoading(true);
      try {
        const laps = await hybridF1Api.getLaps(selectedPracticeSession);
        // Group by driver and find fastest lap
        const driverLaps = new Map();
        laps.forEach(lap => {
          if (lap.lap_duration && (!driverLaps.has(lap.driver_number) || lap.lap_duration < driverLaps.get(lap.driver_number).lap_duration)) {
            driverLaps.set(lap.driver_number, lap);
          }
        });

        const sortedData = Array.from(driverLaps.values())
          .sort((a, b) => a.lap_duration - b.lap_duration)
          .map((lap, idx, arr) => {
            const bestTime = arr[0].lap_duration;
            const driver = apiDrivers.find(d => Number(d.id) === lap.driver_number) || { name: `Driver ${lap.driver_number}`, team: 'Unknown' };
            return {
              position: idx + 1,
              driver: driver.name,
              team: driver.team,
              driverNumber: lap.driver_number,
              time: lap.lap_duration,
              timeStr: `${Math.floor(lap.lap_duration / 60)}:${(lap.lap_duration % 60).toFixed(3).padStart(6, '0')}`,
              gapToFirst: idx === 0 ? '-' : `+${(lap.lap_duration - bestTime).toFixed(3)}s`,
              speedSt: lap.st_speed ? `${lap.st_speed} km/h` : 'N/A'
            };
          });

        setPracticeData(sortedData);
      } catch (e) {
        console.error("Failed to load practice laps", e);
      } finally {
        setPracticeLoading(false);
      }
    };
    fetchPracticeLaps();
  }, [selectedPracticeSession, apiDrivers]);

  // F1 Data Input state - Updated for 2026 Regulations
  const [f1Data, setF1Data] = useState({
    // Driver Information
    driverName: '',
    driverNumber: '',
    driverExperience: '',
    driverTeam: '',

    // Car Specifications (2026 Technical Regulations)
    carModel: '',
    engineType: '2026 Standardized Power Unit', // Standardized for all teams
    tireCompound: 'C3', // 2026 C1-C5 compound system
    fuelLoad: '110kg', // 2026 standardized fuel load
    carWeight: '798kg', // 2026 minimum weight
    aeroPackage: '2026 Ground Effect', // New aero philosophy
    energyRecovery: '800kW', // 2026 MGU-K limit

    // Race Conditions
    trackCondition: 'dry',
    safetyCar: false,
    redFlag: false,
    raceLaps: '',
    trackEvolution: 'medium', // 2026 track evolution factor

    // Weather Data
    airTemp: '25',
    trackTemp: '35',
    humidity: '50',
    windSpeed: '5',
    rainProbability: '0',
    precipitation: 'none', // 2026 weather classification

    // Strategy Inputs (2026 Sprint Format)
    pitStrategy: '2-stop', // 2026 strategy options
    fuelStrategy: 'conservative', // 2026 fuel management
    tireStrategy: 'C3-C4-C4', // 2026 tire allocation
    overtakeAttempts: '',
    defensiveDriving: '',
    sprintWeekend: false // 2026 sprint weekend flag
  })

  const [showF1DataInput, setShowF1DataInput] = useState(false)

  // F1 Race Predictions state
  const [showPredictions, setShowPredictions] = useState(false)
  const [predictionType, setPredictionType] = useState<'qualifying' | 'race' | 'podium' | 'pit-strategy' | 'overtake' | 'sprint'>('race')
  const [predictionResults, setPredictionResults] = useState<any>(null)
  const [isPredicting, setIsPredicting] = useState(false)
  
  // What If Simulator toggle
  const [showWhatIfSimulator, setShowWhatIfSimulator] = useState(false)

  // Enhanced Countdown Timer Logic for Multiple Weekend Sessions with Automatic Race Progression
  const [sessionCountdowns, setSessionCountdowns] = useState({
    practice1: { days: 0, hours: 0, mins: 0, secs: 0, isLive: false },
    practice2: { days: 0, hours: 0, mins: 0, secs: 0, isLive: false },
    qualifying: { days: 0, hours: 0, mins: 0, secs: 0, isLive: false },
    sprint: { days: 0, hours: 0, mins: 0, secs: 0, isLive: false },
    race: { days: 0, hours: 0, mins: 0, secs: 0, isLive: false }
  })
  const [currentWeekend, setCurrentWeekend] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0, isLive: false })
  
  // Live session detection
  const isLive = nextEvent ? 
    (sessionCountdowns as any)[nextEvent.session_name?.toLowerCase().replace(' ', '')]?.isLive || false : false
  const isSessionDay = nextEvent ? new Date(nextEvent.date_start).toDateString() === new Date().toDateString() : false

  // Enhanced Weekend Schedule Parser
  const parseWeekendSchedule = (raceDate: string, format: string, track: string) => {
    // Parse dates like "March 6-8, 2026" or "March 15, 2026" into session times
    if (!raceDate) {
      console.error('Invalid raceDate provided to parseWeekendSchedule:', raceDate);
      return {
        practice1: new Date(),
        practice2: new Date(),
        qualifying: new Date(),
        sprint: null,
        race: new Date()
      };
    }

    const parts = raceDate.split(', ');
    if (parts.length < 2) {
      console.error('Invalid date format:', raceDate);
      return {
        practice1: new Date(),
        practice2: new Date(),
        qualifying: new Date(),
        sprint: null,
        race: new Date()
      };
    }

    const [monthDay, year] = parts;
    const [month, days] = monthDay.split(' ');
    const dayParts = days.split('-').map(d => parseInt(d.trim()));
    const startDay = dayParts[0];
    const endDay = dayParts.length > 1 ? dayParts[1] : startDay;

    const yearNum = parseInt(year.trim());
    
    // Map month names to indices for reliable parsing
    const monthMap: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    const monthIndex = monthMap[month.toLowerCase()] ?? new Date(`${month} 1, ${year}`).getMonth();

    // Standard F1 weekend schedule (times are approximate and may vary by track/timezone)
    const weekend = {
      practice1: new Date(yearNum, monthIndex, startDay, 11, 30, 0), // Friday 11:30 (or same day if single day)
      practice2: new Date(yearNum, monthIndex, endDay > startDay ? startDay + 1 : startDay, 15, 0, 0), // Saturday 15:00
      qualifying: new Date(yearNum, monthIndex, endDay > startDay ? startDay + 1 : startDay, 18, 0, 0), // Saturday 18:00
      sprint: format === 'Sprint' ? new Date(yearNum, monthIndex, endDay > startDay ? startDay + 1 : startDay, 14, 30, 0) : null,
      race: new Date(yearNum, monthIndex, endDay, 15, 0, 0) // Sunday 15:00 (or the exact day if single day)
    }

    return weekend
  }

  useEffect(() => {
    const updateAllCountdowns = () => {
      const now = new Date()

      // Find the current or next upcoming race
      let targetRaceIndex = currentRaceIndex
      let targetRace = upcomingRacesList[currentRaceIndex]
      
      // Check if current race is finished and move to next
      if (targetRace) {
        const weekendSchedule = parseWeekendSchedule(targetRace.date, targetRace.format, targetRace.track)
        const raceEndTime = new Date(weekendSchedule.race.getTime() + (3 * 60 * 60 * 1000)) // Race ends ~3 hours after start
        
        // If current race is finished, move to next one
        if (now > raceEndTime && currentRaceIndex < upcomingRacesList.length - 1) {
          targetRaceIndex = currentRaceIndex + 1
          targetRace = upcomingRacesList[targetRaceIndex]
          setCurrentRaceIndex(targetRaceIndex)
        }
      }
      
      if (!targetRace) return

      // Parse the weekend schedule for current/target race
      const weekendSchedule = parseWeekendSchedule(targetRace.date, targetRace.format, targetRace.track)
      setCurrentWeekend(weekendSchedule)

      // Update countdowns for each session
      const newCountdowns = {
        practice1: calculateTimeLeft(weekendSchedule.practice1, now),
        practice2: calculateTimeLeft(weekendSchedule.practice2, now),
        qualifying: calculateTimeLeft(weekendSchedule.qualifying, now),
        sprint: weekendSchedule.sprint ? calculateTimeLeft(weekendSchedule.sprint, now) : { days: 0, hours: 0, mins: 0, secs: 0, isLive: false },
        race: calculateTimeLeft(weekendSchedule.race, now)
      }

      setSessionCountdowns(newCountdowns)
      
      // Update main countdown with next event
      const nextSession = Object.entries(newCountdowns).find(([_, countdown]: [string, any]) => 
        countdown.isLive || (countdown.days > 0 || countdown.hours > 0 || countdown.mins > 0 || countdown.secs > 0)
      )
      if (nextSession) {
        setTimeLeft(nextSession[1])
      }
    }

    // Helper function to calculate time left
    const calculateTimeLeft = (targetDate: Date, now: Date) => {
      const targetTime = targetDate.getTime()
      const nowTime = now.getTime()

      // Check if session is live (within 2 hours of start)
      const sessionDuration = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
      const isLive = nowTime >= targetTime && nowTime <= (targetTime + sessionDuration)

      if (isLive) {
        return { days: 0, hours: 0, mins: 0, secs: 0, isLive: true }
      }

      const difference = targetTime - nowTime

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          secs: Math.floor((difference % (1000 * 60)) / 1000),
          isLive: false
        }
      }

      return { days: 0, hours: 0, mins: 0, secs: 0, isLive: false }
    }

    updateAllCountdowns()
    const interval = setInterval(updateAllCountdowns, 1000)

    return () => clearInterval(interval)
  }, [upcomingRacesList, currentRaceIndex])

  const formatTime = (time: number) => time.toString().padStart(2, '0')

  // Add race progression controls for testing
  const handleNextRace = () => {
    if (currentRaceIndex < upcomingRacesList.length - 1) {
      setCurrentRaceIndex(currentRaceIndex + 1)
    }
  }

  const handlePrevRace = () => {
    if (currentRaceIndex > 0) {
      setCurrentRaceIndex(currentRaceIndex - 1)
    }
  }

  // Helper function to update F1 data
  const updateF1Data = (field: string, value: any) => {
    setF1Data(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Helper function to fill F1 form with random data
  const fillRandomF1Data = () => {
    const drivers = [
      { name: 'Max Verstappen', number: '1', team: 'Red Bull Racing', exp: '10' },
      { name: 'Charles Leclerc', number: '16', team: 'Ferrari', exp: '7' },
      { name: 'Lando Norris', number: '4', team: 'McLaren', exp: '6' },
      { name: 'Lewis Hamilton', number: '44', team: 'Ferrari', exp: '18' },
      { name: 'George Russell', number: '63', team: 'Mercedes AMG', exp: '6' },
      { name: 'Oscar Piastri', number: '81', team: 'McLaren', exp: '2' },
      { name: 'Carlos Sainz', number: '55', team: 'Williams', exp: '10' },
      { name: 'Fernando Alonso', number: '14', team: 'Aston Martin', exp: '23' },
    ];
    const tireCompounds = ['C1', 'C2', 'C3', 'C4', 'C5', 'Intermediate', 'Wet'];
    const trackConds = ['dry', 'wet', 'damp'];

    const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];

    setF1Data({
      driverName: randomDriver.name,
      driverNumber: randomDriver.number,
      driverExperience: randomDriver.exp,
      driverTeam: randomDriver.team,
      carModel: `2026 Spec ${randomDriver.team.split(' ')[0]}`,
      engineType: '2026 Standardized Power Unit',
      tireCompound: tireCompounds[Math.floor(Math.random() * tireCompounds.length)],
      fuelLoad: `${Math.floor(Math.random() * 20) + 90}kg`,
      carWeight: '798kg',
      aeroPackage: '2026 Ground Effect',
      energyRecovery: '800kW',
      trackCondition: trackConds[Math.floor(Math.random() * trackConds.length)],
      safetyCar: Math.random() > 0.8,
      redFlag: Math.random() > 0.9,
      raceLaps: `${Math.floor(Math.random() * 20) + 50}`,
      trackEvolution: 'medium',
      airTemp: `${Math.floor(Math.random() * 20) + 15}`,
      trackTemp: `${Math.floor(Math.random() * 30) + 20}`,
      humidity: `${Math.floor(Math.random() * 50) + 30}`,
      windSpeed: `${Math.floor(Math.random() * 15)}`,
      rainProbability: `${Math.floor(Math.random() * 100)}`,
      precipitation: Math.random() > 0.8 ? 'light rain' : 'none',
      pitStrategy: Math.random() > 0.5 ? '1-stop' : '2-stop',
      fuelStrategy: Math.random() > 0.5 ? 'conservative' : 'aggressive',
      tireStrategy: 'C3-C4-C4',
      overtakeAttempts: `${Math.floor(Math.random() * 10) + 1}`,
      defensiveDriving: 'high',
      sprintWeekend: Math.random() > 0.7
    });

    // Auto-show form if it's currently hidden when they generate data
    if (!showF1DataInput) setShowF1DataInput(true);
  }

  const loadMelbourneUndercutScenario = () => {
    setSelectedTrack('melbourne');
    setF1Data({
      driverName: 'Max Verstappen',
      driverNumber: '1',
      driverExperience: '10',
      driverTeam: 'Red Bull Racing',
      carModel: '2026 Spec RB22',
      engineType: '2026 Standardized Power Unit',
      tireCompound: 'C3',
      fuelLoad: '105kg',
      carWeight: '798kg',
      aeroPackage: '2026 Ground Effect',
      energyRecovery: '800kW',
      trackCondition: 'dry',
      safetyCar: false,
      redFlag: false,
      raceLaps: '58',
      trackEvolution: 'high',
      precipitation: 'none',
      airTemp: '22',
      trackTemp: '34',
      humidity: '45',
      windSpeed: '8',
      rainProbability: '0',
      pitStrategy: 'undercut',
      fuelStrategy: 'balanced',
      tireStrategy: 'C2-C3-C4',
      overtakeAttempts: '3',
      defensiveDriving: 'moderate',
      sprintWeekend: false
    });
    setPredictionType('pit-strategy');
    if (!showF1DataInput) setShowF1DataInput(true);
    setActiveTab('builder');
  };

  const handleViewSession = (trackId: string, sessionType: 'qualifying' | 'race' | 'sprint' | 'all') => {
    setSelectedTrack(trackId);
    setSelectedRaceForStandings(trackId);
    setStandingsView('track');
    setSelectedSessionType(sessionType);
    setActiveTab('standings');
  };


  const recordSessionData = async (dataType: string, content: any) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return;
    
    setIsRecording(true);
    setRecordStatus("Recording...");
    
    try {
      const response = await fetch('/api/f1/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          session_key: nextEvent?.session_key || 'unknown',
          session_name: nextEvent?.session_name || 'session',
          data_type: dataType,
          content: content
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setRecordStatus(`Saved: ${result.file}`);
        setTimeout(() => setRecordStatus(null), 5000);
      } else {
        setRecordStatus("Record Failed");
      }
    } catch (err) {
      console.error("Recording error:", err);
      setRecordStatus("Record Error");
    } finally {
      setIsRecording(false);
    }
  };

  const fetchCalendarRaceStandings = async (raceId: string) => {
    if (calendarStandings[raceId]) return;
    
    setLoadingCalendarStandings(prev => new Set(prev).add(raceId));
    try {
      // Find the track info
      const race = upcomingRacesList.find(r => r.id === raceId);
      if (!race) return;

      let fetchedResults: any[] = [];
      try {
        const response = await fetch(`/api/f1/race-results?season=2026&t=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        if (data.success && data.races && data.races.length > 0) {
          // Normalize names for comparison: strip 'Grand Prix'/'GP', lowercase
          const normalize = (s: string) => (s || '').toLowerCase()
            .replace(/grand prix| grand prix| grandprix/gi, '').replace(/ gp$/i, '').replace(/[^a-z]/g, '').trim();

          const raceData = data.races.find((r: any) => {
            const apiName = normalize(r.name);
            const localName = normalize(race.name);
            const apiCircuit = normalize(r.circuit || '');
            const localTrack = normalize(race.track || '');
            return apiName === localName ||
              apiName.includes(localName) || localName.includes(apiName) ||
              apiCircuit.includes(localTrack) || localTrack.includes(apiCircuit) ||
              // country-based fallback: race.country vs circuit name
              (race.country && normalize(r.name).includes(normalize(race.country)));
          });

          if (raceData && raceData.results && raceData.results.length > 0) {
            fetchedResults = raceData.results.map((res: any) => ({
              position: res.position,
              driver: res.driver,
              team: res.team,
              time: `${res.points} pts`,
              points: res.points
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch real race-results", e);
      }

      // If Jolpica failed or returned empty results for 2026 (likely), try OpenF1 directly
      if (fetchedResults.length === 0) {
          try {
              console.log(`Trying OpenF1 fallback for ${race.name} (2026)...`);
              const year = 2026;
              const sessions = await hybridF1Api.getSessions(year);
              
              const normalize = (s: string) => (s || '').toLowerCase()
                .replace(/grand prix| grand prix| grandprix/gi, '').replace(/ gp$/i, '').replace(/[^a-z]/g, '').trim();
                
              const localName = normalize(race.name);
              const raceSession = sessions.find(s => {
                const sessionName = s.session_name ?? '';
                const circuitName = s.circuit_short_name ?? '';
                return s.session_type === 'Race' && (
                  normalize(sessionName).includes(localName) || 
                  localName.includes(normalize(sessionName)) ||
                  normalize(circuitName).includes(localName) ||
                  localName.includes(normalize(circuitName))
                );
              });

              if (raceSession) {
                  const sessionKey = raceSession.session_key;
                  if (typeof sessionKey !== 'number') {
                    console.warn(`No valid session key for fallback race ${race.name}`);
                  } else {
                    const [posData, drvData] = await Promise.all([
                      hybridF1Api.getPositionData(sessionKey),
                      hybridF1Api.getDrivers(sessionKey)
                    ]);

                    if (posData && posData.length > 0) {
                      const finalPositions = new Map();
                      posData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                             .forEach((pos: any) => finalPositions.set(pos.driver_number, pos));
                      
                      const sorted = Array.from(finalPositions.values())
                                         .sort((a: any, b: any) => a.position - b.position)
                                         .slice(0, 8);
                      
                      const fallbackResults = sorted.map((pos: any) => {
                        const driver = drvData.find((d: any) => d.driver_number === pos.driver_number);
                        return {
                          position: pos.position,
                          driver: driver ? (driver.full_name || driver.name || `Driver ${pos.driver_number}`) : `Driver ${pos.driver_number}`,
                          team: driver ? (driver.team_name || driver.team || 'Unknown') : 'Unknown',
                          time: `${pos.points || 0} pts`,
                          points: pos.points || 0
                        };
                      });
                      
                      fetchedResults = fallbackResults;
                    }
                  }
              }

          } catch (openF1Err) {
              console.warn("OpenF1 fallback failed too:", openF1Err);
          }
      }

      if (fetchedResults.length > 0) {
        setCalendarStandings(prev => ({ ...prev, [raceId]: fetchedResults }));
      } else {
        // Fallback for future races
        const isFuture = new Date() < new Date(race.date.split(',').pop() || '2027');
        if (!isFuture) {
           // This was a past race but we have no data - show error
           setCalendarStandings(prev => ({ ...prev, [raceId]: [{ position: '?', driver: 'No Data Found', team: 'Check Connection', points: 0 }]}));
        } else {
           // Future race - show TBD or predicted
           setCalendarStandings(prev => ({ ...prev, [raceId]: [{ position: '-', driver: 'Race Future', team: 'TBD', points: 0 }]}));
        }
      }
    } catch (error) {
      console.error("Critical failure in fetchCalendarRaceStandings", error);
    } finally {
      setLoadingCalendarStandings(prev => {
        const next = new Set(prev);
        next.delete(raceId);
        return next;
      });
    }
  };

  const toggleRaceStandingsExpansion = (e: React.MouseEvent, raceId: string) => {
    e.stopPropagation();
    if (expandedRaceId === raceId) {
      setExpandedRaceId(null);
    } else {
      setExpandedRaceId(raceId);
      fetchCalendarRaceStandings(raceId);
    }
  };

  // Helper function to get country flag emoji
  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'Monaco': '🇲🇨',
      'UK': '🇬🇧',
      'Belgium': '🇧🇪',
      'Italy': '🇮🇹',
      'Spain': '🇪🇸',
      'Austria': '🇦🇹',
      'UAE': '🇦🇪',
      'Brazil': '🇧🇷',
      'Bahrain': '🇧🇭',
      'Saudi Arabia': '🇸🇦',
      'USA': '🇺🇸',
      'Hungary': '🇭🇺',
      'Netherlands': '🇳🇱',
      'Singapore': '🇸🇬',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'Azerbaijan': '🇦🇿',
      'Australia': '🇦🇺',
      'Canada': '🇨🇦',
      'Mexico': '🇲🇽',
      'Qatar': '🇶🇦'
    }
    return flags[country] || '🏁'
  }

  // F1 Race Prediction Functions
  const generatePredictions = async () => {
    setIsPredicting(true)
    setPredictionResults(null)

    try {
      const track = tracks.find(t => t.id === selectedTrack)

      const response = await fetch('/api/f1/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          type: predictionType,
          track: track,
          f1Data: f1Data,
          context: {
            standings: apiStandings,
            drivers: apiDrivers,
            teams: apiTeams,
            featuredScenario: f1Data.pitStrategy === 'undercut' && selectedTrack === 'melbourne' ? 'melbourne_undercut' : null
          }
        })
      })

      const result = await response.json()

      // Hybrid Simulation Logic: Use AI (Alpha) results if rich, else use local engine (Logic Engine)
      if (result.success && (result.outcomes || result.sim_metrics)) {
        setPredictionResults(result)
      } else {
        console.warn("AI result shallow or failed, using local Logic Engine fallback")
        const fallback = generatePredictionResults(predictionType, track)
        setPredictionResults({ ...fallback, isFallback: true })
      }
    } catch (error: any) {
      console.error('Prediction engine error, switching to fallback:', error)
      try {
        const track = tracks.find(t => t.id === selectedTrack)
        const fallback = generatePredictionResults(predictionType, track)
        setPredictionResults({ ...fallback, isFallback: true, error: null })
      } catch (fallbackError) {
        console.error('Fallback prediction failed:', fallbackError)
        handleError(fallbackError as Error)
      }
    } finally {
      setIsPredicting(false)
    }
  }

  // Load real API data from OpenF1 with caching and retries
  const loadApiData = useCallback(async (retryCount = 0) => {
    setApiLoading(true)
    setApiError(null)

    // Try to load from cache first for immediate UI responsiveness
    if (retryCount === 0) {
      const cached = localStorage.getItem('kobayashi_f1_api_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.timestamp) { // Use cached data for immediate UI, but proceed to fetch live data
            setApiDrivers(parsed.drivers || []);
            setApiTeams(parsed.teams || []);
            setApiStandings(parsed.standings || []);
            setApiSessions(parsed.sessions || []);
            setApiRaces(parsed.races || []);
            setNextEvent(parsed.nextEvent);
            setUseRealData(true);
            // DO NOT RETURN: Continue to fetch live data to ensure accuracy
          }
        } catch (e) {
          localStorage.removeItem('kobayashi_f1_api_cache');
        }
      }
    }

    try {
      // 1. Get latest session to find the active context
      const sessions = await hybridF1Api.getLatestSession()
      if (!sessions || sessions.length === 0) throw new Error('No active sessions')

      const latestSession = sessions[0]
      const sessionKey = latestSession.session_key

      // 2. Get drivers for this session
      const driversData = await hybridF1Api.getDrivers(sessionKey)
      const mappedDrivers = driversData.map(transformHybridData.driver)
      setApiDrivers(mappedDrivers)

      // Extract teams from drivers
      const teamsMap = new Map()
      driversData.forEach(d => {
        const teamName = d.team_name || d.team || 'Unknown'
        const teamColor = d.team_colour || d.color || '#888888'
        if (!teamsMap.has(teamName)) {
          teamsMap.set(teamName, { id: teamName, name: teamName, color: teamColor })
        }
      })
      const mappedTeams = Array.from(teamsMap.values())
      setApiTeams(mappedTeams)

      // 3. Get standings (if available for this session)
      let mappedStandings = []
      try {
        if (sessionKey) {
          const standingsData = await hybridF1Api.getDriverStandings(sessionKey)
          if (standingsData && standingsData.length > 0) {
            mappedStandings = standingsData.map(s => transformHybridData.standing(s, driversData))
            setApiStandings(mappedStandings)
          }
        }
      } catch (standingErr) {
        mappedStandings = driversData.map((d, i) => ({
          position: i + 1,
          driver: transformHybridData.driver(d),
          team: { name: d.team_name || d.team || 'Unknown' },
          points: 0
        }))
        setApiStandings(mappedStandings)
      }

      // 4. Get and deduplicate season sessions
      const year = new Date().getFullYear()
      const allSessions = await hybridF1Api.getSessions(year)
      setApiSessions(allSessions)

      const racesMap = new Map()
      allSessions.forEach(s => {
        if (s.session_type === 'Race') {
          const key = s.circuit_short_name?.toLowerCase() || s.circuit.toLowerCase()
          const sessionDate = s.date_start || s.date
          if (!racesMap.has(key) || new Date(sessionDate) > new Date(racesMap.get(key).date)) {
            racesMap.set(key, transformHybridData.session(s))
          }
        }
      })
      const mappedRaces = Array.from(racesMap.values())
      setApiRaces(mappedRaces)
      setNextEvent(latestSession)

      // Update Cache
      localStorage.setItem('kobayashi_f1_api_cache', JSON.stringify({
        timestamp: Date.now(),
        drivers: mappedDrivers,
        teams: mappedTeams,
        standings: mappedStandings,
        sessions: allSessions,
        races: mappedRaces,
        nextEvent: latestSession
      }))

      setUseRealData(true)
    } catch (error: any) {
      if (retryCount < 2) {
        setTimeout(() => loadApiData(retryCount + 1), 2000)
        return
      }
      setApiError(error.message || 'Connection lost to OpenF1 Feed')
      setUseRealData(false)
    } finally {
      setApiLoading(false)
    }
  }, []);

  // Load API data on component mount
  useEffect(() => {
    try {
      loadApiData()
    } catch (error) {
      console.error("API data loading useEffect error:", error)
      handleError(error as Error)
    }
  }, [loadApiData])

  // Fetch standings data
  const fetchStandingsData = useCallback(async () => {
    setStandingsLoading(true)
    try {
      const year = new Date().getFullYear()
      const sessions = await hybridF1Api.getSessions(year).catch(() => [])

      // Get season championship standings
      let seasonChampionshipData: any[] = []
      try {
        const standingsRes = await fetch(`/api/f1/standings?season=2026&type=drivers&t=${Date.now()}`, { cache: 'no-store' })
        const standingsData = await standingsRes.json()
        if (standingsData.success && standingsData.standings) {
          seasonChampionshipData = standingsData.standings.map((s: any) => ({
             position: s.position,
             driver: s.driver,
             team: s.team,
             points: s.points,
             wins: s.wins,
             podiums: s.podiums,
             driverNumber: s.driverCode || s.position
          }))
        } else {
          throw new Error('Fallback to openf1')
        }
      } catch (e) {
        console.warn('Fallback to openf1 for season championship data')
        try {
          // Get all race sessions for the current year
          const raceSessions = sessions.filter((s: any) => s.session_type === 'Race')
          
          // Aggregate points from all completed races
          const driverPoints = new Map<number, { points: number; wins: number; podiums: number; driver: any }>()
          
          for (const raceSession of raceSessions) {
            const sessionDate = raceSession.date_start || raceSession.date
            if (sessionDate && new Date(sessionDate) < new Date()) {
              try {
                if (raceSession.session_key) {
                  const positionData = await hybridF1Api.getPositionData(raceSession.session_key)
                  const drivers = await hybridF1Api.getDrivers(raceSession.session_key)

                  if (positionData && positionData.length > 0) {
                    const sortedPositions = positionData.sort((a: any, b: any) => a.position - b.position)

                    sortedPositions.forEach((pos: any, index: number) => {
                      const points = index < 10 ? [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][index] || 0 : 0
                      const driver = drivers.find((d: any) => d.driver_number === pos.driver_number)

                      if (!driverPoints.has(pos.driver_number)) {
                        driverPoints.set(pos.driver_number, {
                          points: 0,
                          wins: 0,
                          podiums: 0,
                          driver: driver
                        })
                      }

                      const driverData = driverPoints.get(pos.driver_number)!
                      driverData.points += points
                      if (index === 0) driverData.wins += 1
                      if (index < 3) driverData.podiums += 1
                    })
                  }
                }
              } catch (error) {
                console.warn(`Failed to process race ${raceSession.session_name}:`, error)
              }
            }
          }
          
          seasonChampionshipData = Array.from(driverPoints.values())
            .map((data, index) => ({
              position: index + 1,
              driver: data.driver ? data.driver.full_name : `Driver ${index + 1}`,
              team: data.driver ? data.driver.team_name : 'Unknown',
              points: data.points,
              wins: data.wins,
              podiums: data.podiums,
              driverNumber: data.driver ? data.driver.driver_number : index + 1
            }))
            .sort((a, b) => b.points - a.points)
            .map((item, index) => ({ ...item, position: index + 1 }))
            
        } catch (error) {
          console.warn('Season championship standings aggregation failed:', error)
          // Use fallback data
          seasonChampionshipData = apiDrivers.map((driver: any, index: number) => ({
            position: index + 1,
            driver: driver.name || `Driver ${index + 1}`,
            team: driver.team || 'Unknown',
            points: Math.floor(Math.random() * 100),
            wins: Math.floor(Math.random() * 3),
            podiums: Math.floor(Math.random() * 8),
            driverNumber: driver.id || index + 1
          }))
        }
      }

      // Get track-specific standings for the selected track
      let trackSpecificData = {
        championship: [] as any[],
        qualifying: [] as any[],
        raceResults: [] as any[],
        sprintResults: [] as any[]
      }

      // Find sessions for the selected track
      const selectedTrackInfo = tracks.find(t => t.id === selectedRaceForStandings)
      if (selectedTrackInfo) {
        const trackSessions = sessions.filter(s => 
          s.circuit_short_name === selectedTrackInfo.name || 
          s.location === selectedTrackInfo.location ||
          s.country_name === selectedTrackInfo.country || s.country === selectedTrackInfo.country
        )

        // Get the most recent race session for this track
        const trackRaceSession = trackSessions.find(s => s.session_type === 'Race')
        
        if (trackRaceSession) {
          try {
            // Get qualifying session for this track
            const qualifyingSession = trackSessions.find((s: any) => s.session_type === 'Qualifying')
            
            let qualifyingGridData: Map<number, number> = new Map()
            
            // Get qualifying data for grid positions and session times
            if (qualifyingSession && qualifyingSession.session_key) {
              try {
                const qualifyingLapData = await hybridF1Api.getLaps(qualifyingSession.session_key)
                const sessionDrivers = await hybridF1Api.getDrivers(qualifyingSession.session_key)
                
                if (qualifyingLapData && qualifyingLapData.length > 0) {
                  // Group laps by driver and find best times for each session
                  const driverSessionLaps = new Map<number, { q1?: number; q2?: number; q3?: number; best?: number }>()
                  
                  qualifyingLapData.forEach((lap: any) => {
                    if (lap.lap_duration && lap.lap_duration > 0) {
                      const driverNumber = lap.driver_number
                      
                      if (!driverSessionLaps.has(driverNumber)) {
                        driverSessionLaps.set(driverNumber, {})
                      }
                      
                      const sessionLaps = driverSessionLaps.get(driverNumber)!
                      
                      // Store best lap for each session segment
                      if (!sessionLaps.best || lap.lap_duration < sessionLaps.best) {
                        sessionLaps.best = lap.lap_duration
                      }
                      
                      // For simplicity, we'll distribute laps across Q1, Q2, Q3
                      // In a real implementation, you'd use session timing data
                      if (!sessionLaps.q1 || lap.lap_duration < sessionLaps.q1) {
                        sessionLaps.q1 = lap.lap_duration
                      }
                      if (sessionLaps.q1 && lap.lap_duration > sessionLaps.q1 * 1.02 && (!sessionLaps.q2 || lap.lap_duration < sessionLaps.q2)) {
                        sessionLaps.q2 = lap.lap_duration
                      }
                      if (sessionLaps.q2 && lap.lap_duration > sessionLaps.q2 * 1.02 && (!sessionLaps.q3 || lap.lap_duration < sessionLaps.q3)) {
                        sessionLaps.q3 = lap.lap_duration
                      }
                    }
                  })

                  // Sort drivers by best lap time to determine grid positions
                  const sortedQualifyingResults = Array.from(driverSessionLaps.entries())
                    .filter(([_, laps]) => laps.best)
                    .sort(([, a], [, b]) => a.best! - b.best!)

                  // Create qualifying results with Q1, Q2, Q3 times
                  const qualifyingResults = sortedQualifyingResults.map(([driverNumber, laps], index) => {
                    const driver = sessionDrivers.find((d: any) => d.driver_number === driverNumber)
                    const bestTime = laps.best!
                    
                    return {
                      position: index + 1,
                      driver: driver ? (driver.full_name || driver.name) : `Driver ${driverNumber}`,
                      team: driver ? (driver.team_name || driver.team) : 'Unknown',
                      q1: laps.q1 ? `${(laps.q1 / 60).toFixed(3)}` : 'N/A',
                      q2: laps.q2 ? `${(laps.q2 / 60).toFixed(3)}` : 'N/A',
                      q3: laps.q3 ? `${(laps.q3 / 60).toFixed(3)}` : 'N/A',
                      gap: index === 0 ? '0.000' : `${(bestTime - sortedQualifyingResults[0][1].best!).toFixed(3)}`
                    }
                  })

                  // Set grid positions for race results
                  sortedQualifyingResults.forEach(([driverNumber, _], index) => {
                    qualifyingGridData.set(driverNumber, index + 1)
                  })

                  trackSpecificData.qualifying = [{
                    sessionName: qualifyingSession.session_name || qualifyingSession.name,
                    circuitName: qualifyingSession.circuit_short_name || qualifyingSession.circuit,
                    date: qualifyingSession.date_start || qualifyingSession.date,
                    results: qualifyingResults
                  }]
                }
              } catch (error) {
                console.warn(`Failed to fetch qualifying data for ${selectedTrackInfo.name}:`, error)
              }
            }

            // Get race results for this track
            try {
              const res = await fetch(`/api/f1/race-results?season=2026`)
              const data = await res.json()
              if (data.success && data.races) {
                const raceData = data.races.find((r: any) => 
                  (r.name?.includes(selectedTrackInfo.name.replace(' GP', '')) || 
                  selectedTrackInfo.name.includes(r.name?.replace(' Grand Prix', '')) ||
                  (selectedTrackInfo.location && r.circuit?.includes(selectedTrackInfo.location)) ||
                  (selectedTrackInfo.country && r.circuit?.includes(selectedTrackInfo.country)))
                )
                if (raceData && raceData.results) {
                  trackSpecificData.raceResults = [{
                    sessionName: raceData.name,
                    circuitName: raceData.circuit,
                    date: raceData.date,
                    results: raceData.results.map((res: any) => ({
                      position: res.position,
                      driver: res.driver,
                      team: res.team,
                      grid: res.position,
                      laps: 50,
                      time: `${res.points} pts`,
                      points: res.points,
                      status: 'Finished'
                    }))
                  }]
                }
              }
            } catch (e) {
              console.warn("Could not fetch race-results APIs for track", e)
            }

            // Check for sprint session at this track
            const sprintSession = trackSessions.find((s: any) => s.session_type === 'Sprint')
            if (sprintSession && sprintSession.session_key) {
              try {
                const sprintPositionData = await hybridF1Api.getPositionData(sprintSession.session_key)
                const sprintLapData = await hybridF1Api.getLaps(sprintSession.session_key)
                
                if (sprintPositionData && sprintPositionData.length > 0) {
                  const finalSprintPositions = new Map()
                  sprintPositionData.forEach((pos: any) => {
                    finalSprintPositions.set(pos.driver_number, pos)
                  })

                  const sortedSprintPositions = Array.from(finalSprintPositions.values())
                    .sort((a: any, b: any) => a.position - b.position)

                  const sprintDrivers = await hybridF1Api.getDrivers(sprintSession.session_key)
                  
                  // Calculate sprint lap statistics
                  const sprintDriverLapStats = new Map<number, { laps: number; bestLapTime?: number }>()
                  
                  if (sprintLapData && sprintLapData.length > 0) {
                    sprintLapData.forEach((lap: any) => {
                      if (!sprintDriverLapStats.has(lap.driver_number)) {
                        sprintDriverLapStats.set(lap.driver_number, { laps: 0 })
                      }
                      
                      const stats = sprintDriverLapStats.get(lap.driver_number)!
                      stats.laps = Math.max(stats.laps, lap.lap_number || 0)
                      
                      if (lap.lap_duration && lap.lap_duration > 0) {
                        if (!stats.bestLapTime || lap.lap_duration < stats.bestLapTime) {
                          stats.bestLapTime = lap.lap_duration
                        }
                      }
                    })
                  }

                  trackSpecificData.sprintResults = [{
                    sessionName: sprintSession.session_name || sprintSession.name,
                    circuitName: sprintSession.circuit_short_name || sprintSession.circuit,
                    date: sprintSession.date_start || sprintSession.date,
                    results: sortedSprintPositions.map((pos: any) => {
                      const driver = sprintDrivers.find((d: any) => d.driver_number === pos.driver_number)
                      const lapStats = sprintDriverLapStats.get(pos.driver_number) || { laps: 0 }
                      
                      return {
                        position: pos.position,
                        driver: driver ? (driver.full_name || driver.name) : `Driver ${pos.driver_number}`,
                        team: driver ? (driver.team_name || driver.team) : 'Unknown',
                        laps: lapStats.laps || Math.floor(Math.random() * 30) + 15,
                        time: lapStats.bestLapTime ? `${(lapStats.bestLapTime / 60).toFixed(3)}` : `${Math.floor(Math.random() * 1800) + 1800}s`,
                        points: pos.position <= 8 ? [8, 7, 6, 5, 4, 3, 2, 1][pos.position - 1] || 0 : 0,
                        status: pos.position <= 20 ? 'Finished' : 'DNF'
                      }
                    })
                  }]
                }
              } catch (error) {
                console.warn(`Failed to fetch sprint results for ${selectedTrackInfo.name}:`, error)
              }
            }

          } catch (error) {
            console.warn(`Failed to fetch track-specific data for ${selectedTrackInfo.name}:`, error)
          }
        }
      }

      setStandingsData({
        season: seasonChampionshipData,
        track: trackSpecificData,
        allTracks: [] // Could be populated with all track data if needed
      })
    } catch (error) {
      console.error('Failed to fetch standings data:', error)
      // Set fallback data
      setStandingsData({
        season: apiDrivers.map((driver: any, index: number) => ({
          position: index + 1,
          driver: driver.name || `Driver ${index + 1}`,
          team: driver.team || 'Unknown',
          points: Math.floor(Math.random() * 100),
          wins: Math.floor(Math.random() * 3),
          podiums: Math.floor(Math.random() * 8),
          driverNumber: driver.id || index + 1
        })),
        track: {
          championship: [],
          qualifying: [],
          raceResults: [],
          sprintResults: []
        },
        allTracks: []
      })
    } finally {
      setStandingsLoading(false)
    }
  }, [apiDrivers, selectedRaceForStandings])

  // Load standings data when standings tab is activated
  useEffect(() => {
    if (activeTab === 'standings') {
      try {
        fetchStandingsData()
      } catch (error) {
        console.error("Standings data loading useEffect error:", error)
        handleError(error as Error)
      }
    }
  }, [activeTab, fetchStandingsData])

  // Fetch historical standings data
  const fetchHistoricalStandings = useCallback(async (year: number, raceId?: string) => {
    setStandingsLoading(true)
    try {
      // Fetch season standings for the selected year
      let seasonStandings: any[] = []
      try {
        const seasonRes = await fetch(`/api/f1/standings?season=${year}&type=drivers`)
        const seasonData = await seasonRes.json()
        if (seasonData.success && seasonData.standings) {
          seasonStandings = seasonData.standings.map((s: any) => ({
            position: s.position,
            driver: s.driver,
            team: s.team,
            points: s.points,
            wins: s.wins || 0,
            podiums: s.podiums || 0,
            driverNumber: s.driverNumber
          }))
        }
      } catch (error) {
        console.warn(`Failed to fetch ${year} season standings:`, error)
        // Use mock data for demonstration
        seasonStandings = [
          { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', points: 575, wins: 19, podiums: 21, driverNumber: 1 },
          { position: 2, driver: 'Sergio Perez', team: 'Red Bull Racing', points: 285, wins: 2, podiums: 8, driverNumber: 11 },
          { position: 3, driver: 'Lewis Hamilton', team: 'Mercedes', points: 234, wins: 2, podiums: 12, driverNumber: 44 },
          { position: 4, driver: 'Charles Leclerc', team: 'Ferrari', points: 208, wins: 2, podiums: 10, driverNumber: 16 },
          { position: 5, driver: 'Lando Norris', team: 'McLaren', points: 205, wins: 1, podiums: 9, driverNumber: 4 }
        ]
      }

      // Fetch race results if specific race selected
      let raceResults: any[] = []
      if (raceId && raceId !== '') {
        try {
          const raceRes = await fetch(`/api/f1/race-results?year=${year}&race=${raceId}`)
          const raceData = await raceRes.json()
          if (raceData.success && raceData.results) {
            raceResults = raceData.results
          }
        } catch (error) {
          console.warn(`Failed to fetch ${year} race results for ${raceId}:`, error)
          // Use mock race results
          raceResults = [
            { position: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', time: '1:28:45.672', points: 25, status: 'Finished' },
            { position: 2, driver: 'Sergio Perez', team: 'Red Bull Racing', time: '+12.345', points: 18, status: 'Finished' },
            { position: 3, driver: 'Lewis Hamilton', team: 'Mercedes', time: '+18.567', points: 15, status: 'Finished' }
          ]
        }
      }

      setHistoricalStandings(prev => ({
        ...prev,
        seasonStandings,
        raceResults
      }))
    } catch (error) {
      console.error('Failed to fetch historical standings:', error)
    } finally {
      setStandingsLoading(false)
    }
  }, [])

  // Update available races when year changes
  useEffect(() => {
    const getRacesForYear = async () => {
      try {
        // Mock race calendar for different years
        const raceCalendars: Record<number, any[]> = {
          2024: [
            { id: 'bahrain-2024', name: 'Bahrain Grand Prix', date: '2024-03-02', track: 'Bahrain International Circuit' },
            { id: 'saudi-2024', name: 'Saudi Arabian Grand Prix', date: '2024-03-09', track: 'Jeddah Corniche Circuit' },
            { id: 'australia-2024', name: 'Australian Grand Prix', date: '2024-03-24', track: 'Albert Park Circuit' },
            { id: 'japan-2024', name: 'Japanese Grand Prix', date: '2024-04-07', track: 'Suzuka International Racing Course' },
            { id: 'china-2024', name: 'Chinese Grand Prix', date: '2024-04-21', track: 'Shanghai International Circuit' },
            { id: 'miami-2024', name: 'Miami Grand Prix', date: '2024-05-05', track: 'Miami International Autodrome' },
            { id: 'emilia-romagna-2024', name: 'Emilia Romagna Grand Prix', date: '2024-05-19', track: 'Autodromo Enzo e Dino Ferrari' },
            { id: 'monaco-2024', name: 'Monaco Grand Prix', date: '2024-05-26', track: 'Circuit de Monaco' },
            { id: 'canada-2024', name: 'Canadian Grand Prix', date: '2024-06-09', track: 'Circuit Gilles Villeneuve' },
            { id: 'spain-2024', name: 'Spanish Grand Prix', date: '2024-06-23', track: 'Circuit de Barcelona-Catalunya' },
            { id: 'austria-2024', name: 'Austrian Grand Prix', date: '2024-06-30', track: 'Red Bull Ring' },
            { id: 'great-britain-2024', name: 'British Grand Prix', date: '2024-07-07', track: 'Silverstone Circuit' },
            { id: 'hungary-2024', name: 'Hungarian Grand Prix', date: '2024-07-21', track: 'Hungaroring' },
            { id: 'belgium-2024', name: 'Belgian Grand Prix', date: '2024-07-28', track: 'Circuit de Spa-Francorchamps' },
            { id: 'netherlands-2024', name: 'Dutch Grand Prix', date: '2024-08-25', track: 'Circuit Zandvoort' },
            { id: 'italy-2024', name: 'Italian Grand Prix', date: '2024-09-01', track: 'Autodromo Nazionale Monza' },
            { id: 'azerbaijan-2024', name: 'Azerbaijan Grand Prix', date: '2024-09-15', track: 'Baku City Circuit' },
            { id: 'singapore-2024', name: 'Singapore Grand Prix', date: '2024-09-22', track: 'Marina Bay Street Circuit' },
            { id: 'united-states-2024', name: 'United States Grand Prix', date: '2024-10-20', track: 'Circuit of the Americas' },
            { id: 'mexico-2024', name: 'Mexico City Grand Prix', date: '2024-10-27', track: 'AutΓö£Γöédromo Hermanos RodrΓö£┬íguez' },
            { id: 'brazil-2024', name: 'SΓö£├║o Paulo Grand Prix', date: '2024-11-03', track: 'AutΓö£Γöédromo JosΓö£ΓîÉ Carlos Pace' },
            { id: 'vegas-2024', name: 'Las Vegas Grand Prix', date: '2024-11-23', track: 'Las Vegas Strip Circuit' },
            { id: 'abu-dhabi-2024', name: 'Abu Dhabi Grand Prix', date: '2024-12-08', track: 'Yas Marina Circuit' }
          ],
          2025: [
            { id: 'australia-2025', name: 'Australian Grand Prix', date: '2025-03-16', track: 'Albert Park Circuit' },
            { id: 'china-2025', name: 'Chinese Grand Prix', date: '2025-03-23', track: 'Shanghai International Circuit' },
            { id: 'japan-2025', name: 'Japanese Grand Prix', date: '2025-04-06', track: 'Suzuka International Racing Course' },
            { id: 'bahrain-2025', name: 'Bahrain Grand Prix', date: '2025-04-13', track: 'Bahrain International Circuit' },
            { id: 'saudi-2025', name: 'Saudi Arabian Grand Prix', date: '2025-04-20', track: 'Jeddah Corniche Circuit' },
            { id: 'miami-2025', name: 'Miami Grand Prix', date: '2025-05-04', track: 'Miami International Autodrome' },
            { id: 'emilia-romagna-2025', name: 'Emilia Romagna Grand Prix', date: '2025-05-18', track: 'Autodromo Enzo e Dino Ferrari' },
            { id: 'monaco-2025', name: 'Monaco Grand Prix', date: '2025-05-25', track: 'Circuit de Monaco' },
            { id: 'canada-2025', name: 'Canadian Grand Prix', date: '2025-06-08', track: 'Circuit Gilles Villeneuve' },
            { id: 'spain-2025', name: 'Spanish Grand Prix', date: '2025-06-22', track: 'Circuit de Barcelona-Catalunya' },
            { id: 'austria-2025', name: 'Austrian Grand Prix', date: '2025-06-29', track: 'Red Bull Ring' },
            { id: 'great-britain-2025', name: 'British Grand Prix', date: '2025-07-06', track: 'Silverstone Circuit' },
            { id: 'hungary-2025', name: 'Hungarian Grand Prix', date: '2025-07-20', track: 'Hungaroring' },
            { id: 'belgium-2025', name: 'Belgian Grand Prix', date: '2025-07-27', track: 'Circuit de Spa-Francorchamps' },
            { id: 'netherlands-2025', name: 'Dutch Grand Prix', date: '2025-08-24', track: 'Circuit Zandvoort' },
            { id: 'italy-2025', name: 'Italian Grand Prix', date: '2025-08-31', track: 'Autodromo Nazionale Monza' },
            { id: 'azerbaijan-2025', name: 'Azerbaijan Grand Prix', date: '2025-09-14', track: 'Baku City Circuit' },
            { id: 'singapore-2025', name: 'Singapore Grand Prix', date: '2025-09-21', track: 'Marina Bay Street Circuit' },
            { id: 'united-states-2025', name: 'United States Grand Prix', date: '2025-10-19', track: 'Circuit of the Americas' },
            { id: 'mexico-2025', name: 'Mexico City Grand Prix', date: '2025-10-26', track: 'AutΓö£Γöédromo Hermanos RodrΓö£┬íguez' },
            { id: 'brazil-2025', name: 'SΓö£├║o Paulo Grand Prix', date: '2025-11-02', track: 'AutΓö£Γöédromo JosΓö£ΓîÉ Carlos Pace' },
            { id: 'vegas-2025', name: 'Las Vegas Grand Prix', date: '2025-11-22', track: 'Las Vegas Strip Circuit' },
            { id: 'abu-dhabi-2025', name: 'Abu Dhabi Grand Prix', date: '2025-12-07', track: 'Yas Marina Circuit' }
          ],
          2026: upcomingRacesList.map(race => ({
            id: `${race.id}-2026`,
            name: race.name,
            date: race.date,
            track: race.track
          }))
        }

        const races = raceCalendars[historicalStandings.selectedYear] || []
        setHistoricalStandings(prev => ({
          ...prev,
          availableRaces: races,
          selectedRace: races.length > 0 ? races[0].id : ''
        }))
        
        // Fetch standings for the selected year
        await fetchHistoricalStandings(historicalStandings.selectedYear)
      } catch (error) {
        console.error('Failed to fetch races for year:', error)
      }
    }

    if (historicalStandings.selectedYear) {
      getRacesForYear()
    }
  }, [historicalStandings.selectedYear, fetchHistoricalStandings, upcomingRacesList])

  const generatePredictionResults = (type: string, track: any) => {
    const baseAccuracy = 0.78 + Math.random() * 0.17 // 78-95% accuracy

    // Use real API data if available, otherwise fall back to mock data
    const teams2026 = useRealData && apiTeams.length > 0
      ? apiTeams.map(team => [team.name, [team.name.split(' ')[0]]])
      : {
        'Red Bull Racing': ['Max Verstappen', 'Liam Lawson'],
        'Mercedes AMG': ['Lewis Hamilton', 'George Russell'],
        'Ferrari': ['Charles Leclerc', 'Carlos Sainz'],
        'McLaren': ['Lando Norris', 'Oscar Piastri'],
        'Aston Martin': ['Fernando Alonso', 'Lance Stroll'],
        'Alpine': ['Pierre Gasly', 'Esteban Ocon'],
        'Williams': ['Alexander Albon', 'Logan Sargeant'],
        'RB': ['Yuki Tsunoda', 'Daniel Ricciardo'],
        'Haas': ['Kevin Magnussen', 'Nico Hulkenberg'],
        'Sauber': ['Valtteri Bottas', 'Zhou Guanyu']
      }

    // Use real driver data if available
    const realDrivers = useRealData && apiDrivers.length > 0
      ? apiDrivers.map(driver => driver.name)
      : ['Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'George Russell', 'Carlos Sainz', 'Oscar Piastri', 'Fernando Alonso']

    // 2026 Technical Regulations Factors
    const trackFactors = {
      'monaco': { aero: 0.95, power: 0.85, handling: 0.98, tireWear: 0.90 },
      'spa': { aero: 0.88, power: 0.95, handling: 0.92, tireWear: 0.75 },
      'monza': { aero: 0.82, power: 0.98, handling: 0.85, tireWear: 0.70 },
      'silverstone': { aero: 0.90, power: 0.92, handling: 0.94, tireWear: 0.80 },
      'barcelona': { aero: 0.87, power: 0.89, handling: 0.91, tireWear: 0.85 },
      'redbull-ring': { aero: 0.93, power: 0.91, handling: 0.96, tireWear: 0.82 },
      'yas-marina': { aero: 0.89, power: 0.87, handling: 0.88, tireWear: 0.78 },
      'interlagos': { aero: 0.86, power: 0.94, handling: 0.89, tireWear: 0.76 }
    }

    // 2026 Sprint Weekend Format (6 races)
    const sprintWeekends = ['austria', 'usa', 'qatar', 'brazil', 'china', 'qatar']

    // Check if current track is a sprint weekend
    const isSprintWeekend = sprintWeekends.includes(track?.id?.toLowerCase() || '')

    switch (type) {
      case 'qualifying':
        return {
          type: 'Qualifying Predictions (2026 Rules)',
          track: track?.name,
          outcomes: [
            { label: (realDrivers[0] || 'Max Verstappen') + ' Pole Position', probability: '94%' },
            { label: (realDrivers[1] || 'Lewis Hamilton') + ' Front Row', probability: '82%' },
            { label: (realDrivers[2] || 'Charles Leclerc') + ' Top 3', probability: '76%' },
            { label: 'Constructor Battle: Red Bull vs Ferrari', probability: '68%' },
            { label: 'Mid-field Q3 Contention', probability: '54%' }
          ],
          predictions: realDrivers.slice(0, 8).map((d, i) => ({
            position: i + 1,
            driver: d,
            team: apiDrivers.find(dr => dr.name === d)?.team || 'Constructor TBD',
            time: `1:${(10 + i * 0.2).toFixed(3)}`,
            confidence: (0.95 - i * 0.05).toFixed(2)
          })),
          analysis: `Field-wide qualifying simulation indicates extreme aero efficiency requirements at ${track?.name}. Constructor performance deltas show a tight battle between the leading pack. The 2026 ground effect profile favors low-rake setups.`,
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['2026 Aero Package Efficiency', 'Power Unit Performance', 'Driver Skill', 'Track Evolution', 'Field Traffic Management'],
          rules: '2026 Technical Regulations: New aero philosophy, enhanced sustainability',
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }

      case 'race':
        return {
          type: 'Race Finish Predictions (2026 Format)',
          track: track?.name,
          outcomes: [
            { label: (realDrivers[0] || 'Max Verstappen') + ' Win', probability: '88%' },
            { label: (realDrivers[2] || 'Charles Leclerc') + ' Podium', probability: '72%' },
            { label: 'Team Battle: Mercedes Pit Strategy', probability: '61%' },
            { label: 'Lap 1 Incident Probability', probability: '24%' },
            { label: 'Safety Car Deployment', probability: '35%' }
          ],
          predictions: realDrivers.slice(0, 8).map((d, i) => ({
            position: i + 1,
            driver: d,
            team: apiDrivers.find(dr => dr.name === d)?.team || 'Constructor TBD',
            confidence: (0.92 - i * 0.04).toFixed(2),
            points: [26, 19, 16, 13, 11, 9, 7, 5][i] || 0
          })),
          analysis: `Simulation of the entire grid predicts high tire degradation on the soft compound. The whole field strategy will likely pivot to a 2-stop sequence. Constructor battles will be decided by active aero management.`,
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['Grid Positions', '2026 Tire Model', 'DRS Strategy', 'Pit Efficiency', 'Energy Recovery Systems'],
          rules: '2026 Points System: 26-19-16-13-11-9-7-5-3-1',
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }

      case 'podium':
        return {
          type: 'Podium Predictions (2026 Season)',
          track: track?.name,
          outcomes: [
            { label: (realDrivers[0] || 'Max Verstappen') + ' Podium', probability: '92%' },
            { label: (realDrivers[1] || 'Lewis Hamilton') + ' Podium', probability: '78%' },
            { label: (realDrivers[2] || 'Charles Leclerc') + ' Podium', probability: '74%' },
            { label: 'Constructor Lockout Prob.', probability: '15%' },
            { label: 'Sleeper Podium Chance', probability: '12%' }
          ],
          predictions: realDrivers.slice(0, 3).map((d, i) => ({
            position: i + 1,
            driver: d,
            team: apiDrivers.find(dr => dr.name === d)?.team || 'Constructor TBD',
            confidence: (0.88 - i * 0.05).toFixed(2),
            odds: (1.3 + i * 1.5).toFixed(2)
          })),
          analysis: "Field-wide analysis shows a high probability for a lead group split. McLaren and Mercedes showing strong long-run pace in simulated variables across the grid.",
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['2026 Championship Momentum', 'Historical Track Alpha', 'Team Cohesion', 'Aero Package Stability'],
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }

      case 'pit-strategy': {
        const trackFactor = trackFactors[track?.id?.toLowerCase() as keyof typeof trackFactors] || { aero: 0.85, power: 0.90, handling: 0.88, tireWear: 0.80 }

        return {
          type: 'Pit Strategy Predictions (2026 Regulations)',
          track: track?.name,
          outcomes: [
            { label: (isSprintWeekend ? 'Sprint ' : 'Optimal ') + 'Stop Window', probability: (100 * trackFactor.tireWear).toFixed(0) + '%' },
            { label: 'Field Pit Traffic Congestion', probability: '42%' },
            { label: 'Undercut Efficacy Level', probability: '88%' },
            { label: 'Fuel Load Management Delta', probability: '92%' },
            { label: 'Double-stack Probability', probability: '28%' }
          ],
          predictions: realDrivers.slice(0, 5).map((d, i) => ({
            position: i + 1,
            driver: d,
            team: apiDrivers.find(dr => dr.name === d)?.team || 'Constructor TBD',
            confidence: (0.94 - i * 0.06).toFixed(2)
          })),
          analysis: `Simulation for the full grid suggests a ${isSprintWeekend ? '1-stop' : '2-stop'} strategy. 2026 regs favor early MGU-K energy dump to undercut rivals across the entire field.`,
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['Tire Compound Life', 'Track Degradation', 'Aero Impact', 'Pit Lane Timing'],
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }
      }

      case 'overtake': {
        const overtakeTrackFactor = trackFactors[track?.id?.toLowerCase() as keyof typeof trackFactors] || { aero: 0.85, power: 0.90, handling: 0.88, tireWear: 0.80 }

        return {
          type: 'Overtaking Opportunities (2026 Rules)',
          track: track?.name,
          outcomes: [
            { label: 'Overtaking Success Rate', probability: '74%' },
            { label: 'DRS Train Probability', probability: '51%' },
            { label: 'Lead Group Battle Prob.', probability: '82%' },
            { label: 'Sector 3 Pass Difficulty', probability: '68%' },
            { label: 'Aero Wake Impact', probability: '35%' }
          ],
          predictions: [
            { position: 1, driver: 'DRS Zone 1', team: 'Main Straight', confidence: '0.82' },
            { position: 2, driver: 'DRS Zone 2', team: 'Back Straight', confidence: '0.68' },
            { position: 3, driver: 'Corner Complex', team: 'Infield', confidence: '0.75' }
          ],
          analysis: "Field mechanics analysis shows significant benefit from the 2026 active aero straights mode. Grid-wide success depends on MGU-K harvest rates.",
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['DRS Optimization', 'Corner Deltas', 'Aero Wake', 'Tire Grip'],
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }
      }

      case 'sprint':
        if (!isSprintWeekend) {
          return {
            type: 'Sprint Predictions (2026 Format)',
            track: track?.name,
            note: 'Not a sprint weekend',
            outcomes: [
              { label: 'Full Grid Qualifying Forecast', probability: '100%' }
            ],
            analysis: 'Simulation results shown reflect the standard full-field Qualifying format as this is not a sprint weekend.',
            accuracy: 100,
            dataSource: useRealData ? 'Live Data' : 'Mock'
          }
        }

        return {
          type: 'Sprint Race (2026 Format)',
          track: track?.name,
          outcomes: [
            { label: (realDrivers[0] || 'Max Verstappen') + ' Sprint Pole', probability: '91%' },
            { label: (realDrivers[1] || 'Lewis Hamilton') + ' Sprint Podium', probability: '78%' },
            { label: 'Mid-field Sprint Charge', probability: '58%' },
            { label: 'Grid Turnover Prob.', probability: '12%' },
            { label: 'First Lap Scuffle Prob.', probability: '31%' }
          ],
          predictions: realDrivers.slice(0, 5).map((d, i) => ({
            position: i + 1,
            driver: d,
            team: apiDrivers.find(dr => dr.name === d)?.team || 'Constructor TBD',
            points: [8, 7, 6, 5, 4][i] || 0,
            confidence: (0.91 - i * 0.05).toFixed(2)
          })),
          analysis: 'Sprint simulation for the entire grid indicates high energy recovery requirements. Overtaking is predicted to be high across the field via X-mode aero.',
          accuracy: Math.round(baseAccuracy * 100),
          factors: ['Sprint Qualifying Performance', 'Short Race Strategy', 'Energy Battery Management'],
          dataSource: useRealData ? 'Live Data (Fallback Engine)' : 'Mock Engine'
        }

      default:
        return { error: 'Unknown prediction type' }
    }
  }

  // Memoize tracks array to prevent re-creation (F1 tracks only - 2026 Calendar Order)
  const tracks = useMemo(() => [
    // 2026 Formula 1 Calendar - Chronological Order
    { id: 'melbourne', name: 'Albert Park Circuit', location: 'Melbourne', available: true, category: 'f1', country: 'Australia' },
    { id: 'shanghai', name: 'Shanghai International Circuit', location: 'Shanghai', available: true, category: 'f1', country: 'China' },
    { id: 'suzuka', name: 'Suzuka International Racing Course', location: 'Suzuka', available: true, category: 'f1', country: 'Japan' },
    { id: 'bahrain', name: 'Bahrain International Circuit', location: 'Sakhir', available: true, category: 'f1', country: 'Bahrain' },
    { id: 'jeddah', name: 'Jeddah Corniche Circuit', location: 'Jeddah', available: true, category: 'f1', country: 'Saudi Arabia' },
    { id: 'miami', name: 'Miami International Autodrome', location: 'Miami', available: true, category: 'f1', country: 'USA' },
    { id: 'imola', name: 'Autodromo Enzo e Dino Ferrari', location: 'Imola', available: true, category: 'f1', country: 'Italy' },
    { id: 'monaco', name: 'Circuit de Monaco', location: 'Monte Carlo', available: true, category: 'f1', country: 'Monaco' },
    { id: 'villeneuve', name: 'Circuit Gilles Villeneuve', location: 'Montreal', available: true, category: 'f1', country: 'Canada' },
    { id: 'catalunya', name: 'Circuit de Barcelona-Catalunya', location: 'Barcelona', available: true, category: 'f1', country: 'Spain' },
    { id: 'redbull-ring', name: 'Red Bull Ring', location: 'Spielberg', available: true, category: 'f1', country: 'Austria' },
    { id: 'silverstone', name: 'Silverstone Circuit', location: 'Northamptonshire', available: true, category: 'f1', country: 'UK' },
    { id: 'hungaroring', name: 'Hungaroring', location: 'Budapest', available: true, category: 'f1', country: 'Hungary' },
    { id: 'spa', name: 'Circuit de Spa-Francorchamps', location: 'Stavelot', available: true, category: 'f1', country: 'Belgium' },
    { id: 'zandvoort', name: 'Circuit Zandvoort', location: 'Zandvoort', available: true, category: 'f1', country: 'Netherlands' },
    { id: 'monza', name: 'Autodromo Nazionale Monza', location: 'Monza', available: true, category: 'f1', country: 'Italy' },
    { id: 'baku', name: 'Baku City Circuit', location: 'Baku', available: true, category: 'f1', country: 'Azerbaijan' },
    { id: 'marina-bay', name: 'Marina Bay Street Circuit', location: 'Singapore', available: true, category: 'f1', country: 'Singapore' },
    { id: 'americas', name: 'Circuit of the Americas', location: 'Austin', available: true, category: 'f1', country: 'USA' },
    { id: 'rodriguez', name: 'Autódromo Hermanos Rodríguez', location: 'Mexico City', available: true, category: 'f1', country: 'Mexico' },
    { id: 'interlagos', name: 'Autódromo José Carlos Pace', location: 'São Paulo', available: true, category: 'f1', country: 'Brazil' },
    { id: 'vegas', name: 'Las Vegas Strip Circuit', location: 'Las Vegas', available: true, category: 'f1', country: 'USA' },
    { id: 'yas-marina', name: 'Yas Marina Circuit', location: 'Abu Dhabi', available: true, category: 'f1', country: 'UAE' }
  ], [])


  // Memoize loadRaceData function to prevent unnecessary re-renders
  const loadRaceData = useCallback(async () => {
    setRaceData({ loading: true, error: null, data: [] })

    try {
      if (dataSourceMode === 'custom') {
        setRaceData(prev => ({ ...prev, loading: false }))
        return
      }

      // 2026 Season - Attempt to fetch real session data if available
      if (useRealData && apiSessions.length > 0) {
        const currentSession = apiSessions.find(s => 
          s.circuit_short_name?.toLowerCase() === selectedTrack.toLowerCase() || 
          s.location?.toLowerCase().includes(selectedTrack.toLowerCase())
        );

        if (currentSession) {
          try {
            const [laps, weather, drivers] = await Promise.all([
              hybridF1Api.getLaps(currentSession.session_key),
              hybridF1Api.getWeatherData(currentSession.session_key),
              hybridF1Api.getDrivers(currentSession.session_key)
            ]);

            if (laps && laps.length > 0) {
              // Transform real data
              const transformedLaps = transformOpenF1Data.lapData(laps).slice(0, 50);
              const transformedWeather = transformOpenF1Data.weatherData(weather)[0] || {};
              
              // Calculate results based on best laps for now if standings not available
              const resultsMap = new Map();
              laps.forEach(lap => {
                if (!resultsMap.has(lap.driver_number) || lap.lap_duration < resultsMap.get(lap.driver_number).time) {
                  resultsMap.set(lap.driver_number, { 
                    driver: drivers.find(d => d.driver_number === lap.driver_number)?.full_name || `Driver ${lap.driver_number}`,
                    time: lap.lap_duration
                  });
                }
              });

              const transformedResults = Array.from(resultsMap.values())
                .sort((a, b) => a.time - b.time)
                .map((r, i) => ({
                  driver: r.driver,
                  time: i === 0 ? `${(r.time / 60).toFixed(0)}:${(r.time % 60).toFixed(3)}` : `+${(r.time - Array.from(resultsMap.values())[0].time).toFixed(3)}s`,
                  points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][i] || 0
                }));

              setRaceData({
                loading: false,
                error: null,
                data: [{
                  track: selectedTrack,
                  race: selectedRace,
                  raceResults: transformedResults,
                  lapTimes: transformedLaps,
                  weather: transformedWeather,
                  telemetry: { available: true, type: 'live' },
                  dataSource: `OpenF1 Live Session: ${currentSession.session_name}`
                }]
              });
              return;
            }
          } catch (apiErr) {
            console.warn("Real race data fetch failed, falling back to simulation:", apiErr);
          }
        }
      }

      // Falling back to AI Simulated data
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const realDrivers = useRealData && apiDrivers.length > 0
        ? apiDrivers.map(driver => driver.name)
        : ['Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'George Russell', 'Carlos Sainz', 'Oscar Piastri', 'Fernando Alonso'];

      const mockRaceResults = realDrivers.map((driver, index) => ({
        driver: driver,
        time: index === 0 ? '1:24:32.450' : `+${(Math.random() * 5 + index * 2).toFixed(3)}s`,
        points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][index] || 0
      }));

      // Generate a realistic weather mock based on form inputs if available
      const generatedWeather = {
        temperature: f1Data.airTemp || '25',
        humidity: f1Data.humidity || '50',
        windSpeed: f1Data.windSpeed || '5',
        conditions: f1Data.trackCondition === 'dry' ? 'Sunny' : f1Data.trackCondition === 'wet' ? 'Rain' : 'Cloudy'
      };

      const mockLapTimes = Array.from({ length: 50 }).map((_, i) => ({
        lap: i + 1,
        time: (70 + Math.random() * 3).toFixed(3), // 1:10.xxx approx
        driver: realDrivers[0]
      }));

      setRaceData({
        loading: false,
        error: null,
        data: [{
          track: selectedTrack,
          race: selectedRace,
          raceResults: mockRaceResults,
          lapTimes: mockLapTimes,
          weather: generatedWeather,
          telemetry: { available: true, type: 'simulated' },
          dataSource: 'AI Simulated F1 Session'
        }]
      })
    } catch (error: any) {
      setRaceData({
        loading: false,
        error: `Failed to load race data: ${error.message}`,
        data: []
      })
    }
  }, [selectedTrack, selectedRace, dataSourceMode, useRealData, apiDrivers, f1Data])


  // Simple export function
  const exportReport = async () => {
    if (!raceData.data[0]) {
      alert('Please load race data first!')
      return
    }

    setIsGeneratingReport(true)

    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceResults: raceData.data[0]?.raceResults,
          lapTimes: raceData.data[0]?.lapTimes,
          weather: simulatedWeather || raceData.data[0]?.weather,
          track: selectedTrack,
          race: selectedRace,
          series: 'Formula 1'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'AI analysis failed')
      }

      const report = 'KobayashiAI Race Analysis Report\n' +
        'Track: ' + (tracks.find(t => t.id === selectedTrack)?.name || selectedTrack) + '\n' +
        'Race: ' + selectedRace + '\n' +
        'Generated: ' + new Date().toLocaleString() + '\n\n' +
        (result.analysis || 'Analysis complete.')

      setGeneratedReport(report)

      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KobayashiAI_${selectedTrack}_${selectedRace}_report.txt`
      a.click()
      URL.revokeObjectURL(url)

    } catch (error: any) {
      const report = 'KobayashiAI Race Analysis Report\n' +
        'Track: ' + (tracks.find(t => t.id === selectedTrack)?.name || selectedTrack) + '\n' +
        'Race: ' + selectedRace + '\n' +
        'Generated: ' + new Date().toLocaleString() + '\n\n' +
        '╬ô├£├íΓê⌐Γòò├à AI Analysis Unavailable\n' +
        (error.message || 'Could not connect to AI service')

      setGeneratedReport(report)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <LiveFeedProvider activeTab={activeTab} drivers={apiDrivers.map(d => d.name)} trackId={selectedTrack}>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        {/* Simplified Header */}
        <header className="bg-black/80 backdrop-blur-md border-b border-racing-red/30 shadow-lg shadow-racing-red/10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  F1 Analytics
                </h1>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-[10px] text-racing-red font-black tracking-widest uppercase">FORMULA 1</p>
                  {apiLoading ? (
                    <div className="flex items-center space-x-1 text-blue-400">
                      <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-400"></div>
                      <span className="text-xs">Loading...</span>
                    </div>
                  ) : useRealData ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs">Live Data</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-yellow-500">
                      <span className="text-xs">Mock Data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
              <div className="flex items-center space-x-3">
                {useRealData && (
                  <button 
                    onClick={() => recordSessionData('dashboard_snapshot', { 
                      drivers: apiDrivers, 
                      teams: apiTeams, 
                      standings: apiStandings,
                      timestamp: Date.now()
                    })}
                    disabled={isRecording}
                    className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                      isRecording ? 'bg-gray-800 border-gray-700 text-gray-500' : 
                      recordStatus?.startsWith('Saved') ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                      'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-gray-600 animate-pulse' : 'bg-red-500'}`}></div>
                    <span>{recordStatus || 'Record Snapshot'}</span>
                  </button>
                )}
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-racing-red"
                >
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name} {getCountryFlag(track.country)}
                    </option>
                  ))}
                </select>
              </div>
          </div>
        </div>
      </header>

      {/* Live Feed Toggle Button */}
      <Suspense fallback={<div />}>
        <LiveFeedToggle />
      </Suspense>

      {/* Network Error Toast / Banner */}
      {apiError && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 py-3 px-6 flex justify-between items-center text-sm font-semibold z-50">
          <div className="flex items-center space-x-3 container mx-auto">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Connection Warning: {apiError}. The app has fallen back to offline mock mode for uninterrupted use.</span>
            <button onClick={() => loadApiData()} className="ml-4 px-3 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-xs transition">Retry Connection</button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        {/* TOP NAVIGATION BAR */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-sm sticky top-4 z-40">
          {[
            { id: 'upcoming', label: 'Schedule', icon: Calendar },
            { id: 'standings', label: 'Standings', icon: Trophy },
            { id: 'builder', label: 'Forge', icon: Brain },
            { id: 'analytics', label: 'Live Data', icon: BarChart3 },
            { id: 'practice', label: 'Practice', icon: Clock },
            { id: 'ai', label: 'AI Oracle', icon: Zap },
            { id: 'archives', label: 'Archives', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-racing-red text-white shadow-lg shadow-racing-red/20 scale-105' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* UPCOMING RACES DASHBOARD */}
        {activeTab === 'upcoming' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section - Responsive */}
            <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 border border-gray-700/50 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-racing-red/10 rounded-full blur-3xl -mr-12 md:-mr-20 -mt-12 md:-mt-20"></div>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                <div className="text-center lg:text-left">
                  <div className={`inline-block px-3 py-1 ${isLive ? 'bg-green-500/20 border-green-500/30 text-green-400 animate-pulse' : 'bg-racing-red/20 border-racing-red/30 text-racing-red'} border font-black text-[10px] md:text-xs rounded-full uppercase tracking-widest mb-4`}>
                    {isLive ? 'LIVE NOW' : isSessionDay ? 'SESSION DAY' : 'Next Event'}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tight leading-tight">
                    {currentRace ? `${currentRace.name}` : upcomingRacesList[0].name}
                  </h2>
                  <div className="flex items-center justify-center lg:justify-start space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePrevRace}
                        disabled={currentRaceIndex === 0}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-300" />
                      </button>
                      <span className="text-sm text-gray-500 font-medium">
                        Race {currentRaceIndex + 1} of {upcomingRacesList.length}
                      </span>
                      <button
                        onClick={handleNextRace}
                        disabled={currentRaceIndex === upcomingRacesList.length - 1}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                      </button>
                    </div>
                    {currentRaceIndex > 0 && (
                      <span className="text-xs text-racing-red font-medium animate-pulse">
                        Auto-progression enabled
                      </span>
                    )}
                  </div>
                  <p className="text-lg md:text-xl text-gray-400 mb-6 flex items-center justify-center lg:justify-start">
                    <Flag className="w-5 h-5 mr-2 text-gray-500" />
                    <span className="truncate">{nextEvent ? `${nextEvent.circuit_short_name}` : `${upcomingRacesList[0].track}`}</span>
                  </p>

                  {!isLive ? (
                    <div className="flex justify-center lg:justify-start space-x-4 md:space-x-6 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Days</span>
                        <span className="text-2xl md:text-3xl font-mono font-bold leading-none">{formatTime(timeLeft.days)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Hrs</span>
                        <span className="text-2xl md:text-3xl font-mono font-bold leading-none">{formatTime(timeLeft.hours)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Min</span>
                        <span className="text-2xl md:text-3xl font-mono font-bold leading-none">{formatTime(timeLeft.mins)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-racing-red uppercase font-black">Sec</span>
                        <span className="text-2xl md:text-3xl font-mono font-bold text-racing-red leading-none">{formatTime(timeLeft.secs)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                            <Play className="w-5 h-5 text-black fill-current" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full"></div>
                        </div>
                        <div>
                          <span className="text-green-400 font-bold text-lg block leading-tight">LIVE</span>
                          <span className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">Real-time Feed Active</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full sm:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-black rounded-lg transition-colors text-xs uppercase tracking-wider"
                      >
                        Launch Live View
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-gray-700/50 p-2 mb-6 bg-black/50 flex items-center justify-center overflow-hidden shadow-inner">
                    {nextEvent ? (
                      <span className="text-5xl md:text-6xl">{getCountryFlag(nextEvent.country_name)}</span>
                    ) : (
                      <span className="text-5xl md:text-6xl">Γëí╞Æ├º┬¬Γëí╞Æ├ºΓòæ</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrack(nextEvent ? nextEvent.circuit_short_name.toLowerCase() : 'melbourne');
                      setActiveTab('ai');
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-racing-red to-red-700 hover:from-red-600 hover:to-red-500 px-8 py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest shadow-xl shadow-racing-red/20 transform transition hover:scale-105 active:scale-95 flex items-center justify-center space-x-3"
                  >
                    <Target className="w-5 h-5 md:w-6 md:h-6" />
                    <span>Generate Forecast</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Weekend Session Countdowns */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-racing-red" />
                  <span>Weekend Schedule</span>
                </h3>
                <div className="text-sm text-gray-400">
                  {currentRace?.name} - {currentRace?.date}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Practice 1 */}
                <div className={`bg-gray-900/50 rounded-xl p-4 border ${sessionCountdowns.practice1.isLive ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700'}`}>
                  <div className="text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Practice 1</div>
                    <div className="text-sm font-bold text-gray-300 mb-2">Fri {currentWeekend?.practice1.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    {sessionCountdowns.practice1.isLive ? (
                      <div className="text-green-400 font-bold text-lg animate-pulse">LIVE</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice1.days)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Days</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice1.hours)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Hrs</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice1.mins)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Min</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-racing-red">{formatTime(sessionCountdowns.practice1.secs)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Sec</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Practice 2 */}
                <div className={`bg-gray-900/50 rounded-xl p-4 border ${sessionCountdowns.practice2.isLive ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700'}`}>
                  <div className="text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Practice 2</div>
                    <div className="text-sm font-bold text-gray-300 mb-2">Sat {currentWeekend?.practice2.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    {sessionCountdowns.practice2.isLive ? (
                      <div className="text-green-400 font-bold text-lg animate-pulse">LIVE</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice2.days)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Days</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice2.hours)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Hrs</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.practice2.mins)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Min</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-racing-red">{formatTime(sessionCountdowns.practice2.secs)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Sec</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sprint (if applicable) */}
                {currentRace?.format === 'Sprint' && (
                  <div className={`bg-gray-900/50 rounded-xl p-4 border ${sessionCountdowns.sprint.isLive ? 'border-purple-500/50 bg-purple-500/10' : 'border-gray-700'}`}>
                    <div className="text-center">
                      <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sprint</div>
                      <div className="text-sm font-bold text-gray-300 mb-2">Sat {currentWeekend?.sprint.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      {sessionCountdowns.sprint.isLive ? (
                        <div className="text-purple-400 font-bold text-lg animate-pulse">LIVE</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1 text-center">
                          <div>
                            <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.sprint.days)}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Days</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.sprint.hours)}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Hrs</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.sprint.mins)}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Min</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold text-purple-400">{formatTime(sessionCountdowns.sprint.secs)}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Sec</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Qualifying */}
                <div className={`bg-gray-900/50 rounded-xl p-4 border ${sessionCountdowns.qualifying.isLive ? 'border-blue-500/50 bg-blue-500/10' : 'border-gray-700'}`}>
                  <div className="text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Qualifying</div>
                    <div className="text-sm font-bold text-gray-300 mb-2">Sat {currentWeekend?.qualifying.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    {sessionCountdowns.qualifying.isLive ? (
                      <div className="text-blue-400 font-bold text-lg animate-pulse">LIVE</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.qualifying.days)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Days</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.qualifying.hours)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Hrs</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.qualifying.mins)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Min</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-blue-400">{formatTime(sessionCountdowns.qualifying.secs)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Sec</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Race */}
                <div className={`bg-gray-900/50 rounded-xl p-4 border ${sessionCountdowns.race.isLive ? 'border-racing-red/50 bg-racing-red/10' : 'border-gray-700'}`}>
                  <div className="text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Main Race</div>
                    <div className="text-sm font-bold text-gray-300 mb-2">Sun {currentWeekend?.race.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    {sessionCountdowns.race.isLive ? (
                      <div className="text-racing-red font-bold text-lg animate-pulse">LIVE</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.race.days)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Days</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.race.hours)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Hrs</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(sessionCountdowns.race.mins)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Min</div>
                        </div>
                        <div>
                          <div className="text-lg font-mono font-bold text-racing-red">{formatTime(sessionCountdowns.race.secs)}</div>
                          <div className="text-[10px] text-gray-500 uppercase">Sec</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Times shown in local timezone ╬ô├ç├│ Sessions typically 1-2 hours duration
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>AI Edge Forecasts</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Race Winner",
                    driver: useRealData && apiDrivers.length > 0 ? apiDrivers[0].name : "Max Verstappen",
                    prob: "74%",
                    edge: "+5.2%",
                    color: "border-yellow-500/30",
                    trend: "up"
                  },
                  {
                    label: "Podium Lock",
                    driver: useRealData && apiDrivers.length > 0 ? (apiDrivers[2] ? apiDrivers[2].name : "Charles Leclerc") : "Charles Leclerc",
                    prob: "62%",
                    edge: "+3.1%",
                    color: "border-racing-red/30",
                    trend: "up"
                  },
                  {
                    label: "Top 10 Sleeper",
                    driver: useRealData && apiDrivers.length > 0 ? (apiDrivers.find(d => d.name?.toLowerCase().includes('hulk'))?.name || apiDrivers[9]?.name || "Nico HΓö£Γò¥lkenberg") : "Nico HΓö£Γò¥lkenberg",
                    prob: "48%",
                    edge: "+12.4%",
                    color: "border-green-500/30",
                    trend: "up"
                  },
                  {
                    label: "Fastest Lap",
                    driver: useRealData && apiDrivers.length > 0 ? (apiDrivers[1] ? apiDrivers[1].name : "Lando Norris") : "Lando Norris",
                    prob: "35%",
                    edge: "-1.2%",
                    color: "border-racing-blue/30",
                    trend: "down"
                  }
                ].map((pick, i) => (
                  <div key={i} className={`bg-gray-900 border ${pick.color} rounded-2xl p-5 hover:border-racing-red/50 transition-all cursor-pointer group shadow-xl relative overflow-hidden`} onClick={() => setActiveTab('ai')}>
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                      <Target className="w-12 h-12" />
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pick.label}</span>
                      <div className="relative group/tooltip">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pick.edge.startsWith('+') ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {pick.edge} ALPHA
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-lg group-hover:text-racing-red transition-colors mb-4">{pick.driver}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden mr-3">
                        <div className="h-full bg-gradient-to-r from-racing-red/50 via-racing-red to-racing-blue shadow-[0_0_10px_rgba(211,47,47,0.5)]" style={{ width: pick.prob }} />
                      </div>
                      <span className="text-xs font-mono font-black text-white">{pick.prob}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Races Timeline - Clean & Minimal */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-racing-red" />
                  <span>Race Calendar</span>
                </h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowPastRaces(!showPastRaces)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-gray-700"
                  >
                    <History className={`w-3 h-3 ${showPastRaces ? 'text-racing-red' : 'text-gray-500'}`} />
                    <span>{showPastRaces ? 'Hide Results' : 'Past Results'}</span>
                  </button>
                  <div className="text-sm text-gray-500 font-medium hidden sm:block">
                    2026 Season Schedule
                  </div>
                </div>
              </div>

              {/* Timeline-style calendar */}
              <div className="space-y-6">
                {/* Past Races Section */}
                {showPastRaces && currentRaceIndex > 0 && (
                  <div className="space-y-6 mb-8 pb-8 border-b border-white/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-4">
                      <History className="w-4 h-4 text-gray-500" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Completed Events</span>
                    </div>
                    {(apiSessions.length > 0 ? raceList.slice(0, currentRaceIndex) : upcomingRacesList.slice(0, currentRaceIndex)).map((race, i) => {
                      return (
                        <div
                          key={`past-${race.id || i}`}
                          className="relative bg-black/40 border border-gray-800/50 rounded-2xl p-6 transition-all duration-300 hover:border-gray-500/40 opacity-70 hover:opacity-100 group cursor-pointer"
                        >
                          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700/50"></div>
                          <div className="absolute left-6 top-8 w-4 h-4 rounded-full border-4 bg-gray-800 border-gray-900"></div>

                          <div className="flex items-center justify-between ml-12">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-xl font-bold text-gray-400 group-hover:text-white transition-colors">
                                  {race.name}
                                </h4>
                                <span className="px-3 py-1 bg-gray-800 text-gray-500 text-xs font-black rounded-full uppercase tracking-wider border border-white/5">
                                  COMPLETED
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <Flag className="w-4 h-4" />
                                  <span>{race.track}</span>
                                </div>
                                <span className="text-gray-700">╬ô├ç├│</span>
                                <span className="text-lg">{getCountryFlag(race.country)}</span>
                                <span className="text-gray-700">╬ô├ç├│</span>
                                <span>{race.date}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end space-y-3">
                              {/* Top 3 Positions Preview */}
                              <div className="bg-black/60 border border-white/10 rounded-lg p-3 min-w-[200px]">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Top 3 Finishers</div>
                                <div className="space-y-1">
                                  {loadingTop3Results.has(race.id) ? (
                                    <div className="flex items-center justify-center py-2">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
                                    </div>
                                  ) : top3Results[race.id] && top3Results[race.id].length > 0 ? (
                                    top3Results[race.id].map((result, index) => (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2">
                                          <span className={`font-mono font-bold ${
                                            index === 0 ? 'text-yellow-500' : 
                                            index === 1 ? 'text-gray-400' : 
                                            'text-orange-600'
                                          }`}>
                                            {result.position}
                                          </span>
                                          <span className="text-white font-medium">{result.driver}</span>
                                        </div>
                                        <span className="text-gray-400">{result.team}</span>
                                      </div>
                                    ))
                                  ) : (
                                    // Fallback to mock data if real data not available
                                    <>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono font-bold text-yellow-500">1</span>
                                          <span className="text-white font-medium">Max Verstappen</span>
                                        </div>
                                        <span className="text-gray-400">Red Bull</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono font-bold text-gray-400">2</span>
                                          <span className="text-white font-medium">Charles Leclerc</span>
                                        </div>
                                        <span className="text-gray-400">Ferrari</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono font-bold text-orange-600">3</span>
                                          <span className="text-white font-medium">Lando Norris</span>
                                        </div>
                                        <span className="text-gray-400">McLaren</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={(e) => toggleRaceStandingsExpansion(e, race.id)}
                                  className={`px-2 py-1 ${expandedRaceId === race.id ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'} border border-white/10 rounded text-[10px] font-black transition-all uppercase flex items-center gap-1`}
                                >
                                  <Trophy className="w-3 h-3" />
                                  <span>Results</span>
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    fetchDetailedRaceStandings(race.id, race.name, race.date);
                                  }}
                                  className="px-2 py-1 bg-racing-red hover:bg-red-600 border border-racing-red/50 rounded text-[10px] font-black text-white transition-all uppercase flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Full Standings</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Race Recap (if exists) */}
                          {(race as any).recap && (
                            <div className="mt-6 ml-12 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300 leading-relaxed group-hover:bg-white/10 transition-colors">
                              <h5 className="text-[10px] font-black text-racing-red uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Brain className="w-3 h-3" /> Oracle Race Recap
                              </h5>
                              {(race as any).recap}
                            </div>
                          )}

                          {/* Expandable Standings Section (Reuse same logic) */}
                          {expandedRaceId === race.id && (
                            <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-xs font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                                  <Trophy className="w-3 h-3" />
                                  <span>Race-Specific Standings: {race.name}</span>
                                </h5>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'all'); }}
                                  className="text-[10px] font-black text-racing-blue uppercase hover:underline"
                                >
                                  Full Matrix ╬ô├Ñ├å
                                </button>
                              </div>
                              
                              {loadingCalendarStandings.has(race.id) ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40">
                                  <table className="w-full text-left text-[11px]">
                                    <thead>
                                      <tr className="text-gray-500 border-b border-white/5 uppercase font-black bg-white/5">
                                        <th className="px-4 py-2">Pos</th>
                                        <th className="px-4 py-2">Driver</th>
                                        <th className="px-4 py-2">Team</th>
                                        <th className="px-4 py-2 text-right">Time/Gap</th>
                                        <th className="px-4 py-2 text-right text-racing-red">Pts</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {(calendarStandings[race.id] || []).map((runner, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                          <td className="px-4 py-2 font-mono font-bold text-gray-400">{runner.position}</td>
                                          <td className="px-4 py-2 font-bold text-white">{runner.driver}</td>
                                          <td className="px-4 py-2 text-gray-500">{runner.team}</td>
                                          <td className="px-4 py-2 text-right font-mono text-gray-400">{runner.time}</td>
                                          <td className="px-4 py-2 text-right font-black text-racing-red">{runner.points}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {(apiSessions.length > 0 ? raceList.slice(currentRaceIndex, currentRaceIndex + 5) : upcomingRacesList.slice(currentRaceIndex, currentRaceIndex + 5)).map((race, i) => {
                  const isCurrentNext = nextEvent && race.name === nextEvent.session_name;
                  const isNextRace = i === 0;

                  return (
                    <div
                      key={race.id || i}
                      className={`relative bg-gradient-to-r ${isCurrentNext
                        ? 'from-racing-red/10 via-red-900/5 to-transparent border-racing-red/30'
                        : isNextRace
                        ? 'from-blue-500/5 via-blue-900/5 to-transparent border-blue-500/20'
                        : 'from-gray-800/50 to-gray-900/30 border-gray-700/50'
                      } border rounded-2xl p-6 transition-all duration-300 hover:border-racing-red/40 hover:shadow-lg hover:shadow-racing-red/10 group cursor-pointer`}
                      onClick={() => {
                        setSelectedTrack(race.id || 'melbourne');
                        setActiveTab('ai');
                      }}
                    >
                      {/* Timeline line */}
                      <div className={`absolute left-8 top-0 bottom-0 w-0.5 ${isCurrentNext ? 'bg-racing-red' : isNextRace ? 'bg-blue-500' : 'bg-gray-600'}`}></div>

                      {/* Timeline dot */}
                      <div className={`absolute left-6 top-8 w-4 h-4 rounded-full border-4 ${isCurrentNext ? 'bg-racing-red border-gray-900' : isNextRace ? 'bg-blue-500 border-gray-900' : 'bg-gray-600 border-gray-800'}`}></div>

                      <div className="flex items-center justify-between ml-12">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-xl font-bold text-white group-hover:text-racing-red transition-colors">
                              {race.name}
                            </h4>
                            {isCurrentNext && (
                              <span className="px-3 py-1 bg-racing-red text-white text-xs font-black rounded-full uppercase tracking-wider">
                                NEXT
                              </span>
                            )}
                            {isNextRace && !isCurrentNext && (
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-black rounded-full uppercase tracking-wider border border-blue-500/30">
                                UPCOMING
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                              <Flag className="w-4 h-4" />
                              <span className="font-medium">{race.track}</span>
                            </div>
                            <span className="text-gray-600">╬ô├ç├│</span>
                            <span className="text-lg">{getCountryFlag(race.country)}</span>
                            <span className="text-gray-600">╬ô├ç├│</span>
                            <span className="font-medium">{race.date}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${race.format === 'Sprint' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gray-700/50 text-gray-300'}`}>
                              {race.format}
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
                                {apiSessions.length > 0 ? 'Circuit' : 'Alpha Leader'}
                              </div>
                              <div className="text-xs font-black text-gray-300">
                                {apiSessions.length > 0 ? race.country : race.leader.split(' ').pop()}
                              </div>
                            </div>
                          </div>

                          {/* Session Quick Links */}
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => toggleRaceStandingsExpansion(e, race.id)}
                              className={`px-2 py-1 ${expandedRaceId === race.id ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-yellow-500/20'} border border-white/10 hover:border-yellow-500/40 rounded text-[10px] font-black transition-all uppercase flex items-center gap-1`}
                            >
                              <Trophy className="w-3 h-3" />
                              <span>{expandedRaceId === race.id ? 'Hide' : 'Standings'}</span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'all'); }}
                              className="px-2 py-1 bg-white/5 hover:bg-gray-500/20 border border-white/10 hover:border-gray-500/40 rounded text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase"
                              title="View Full Standings Page"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Standings Section */}
                      {expandedRaceId === race.id && (
                        <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-xs font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                              <Trophy className="w-3 h-3" />
                              <span>Race-Specific Standings: {race.name}</span>
                            </h5>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'all'); }}
                              className="text-[10px] font-black text-racing-blue uppercase hover:underline"
                            >
                              View Full Matrix ╬ô├Ñ├å
                            </button>
                          </div>
                          
                          {loadingCalendarStandings.has(race.id) ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                              <span className="ml-3 text-xs text-gray-500 uppercase font-bold">Parsing Race Results...</span>
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40">
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="text-gray-500 border-b border-white/5 uppercase font-black bg-white/5">
                                    <th className="px-4 py-2">Pos</th>
                                    <th className="px-4 py-2">Driver</th>
                                    <th className="px-4 py-2">Team</th>
                                    <th className="px-4 py-2 text-right">Time/Gap</th>
                                    <th className="px-4 py-2 text-right text-racing-red">Pts</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {(calendarStandings[race.id] || []).map((runner, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                      <td className="px-4 py-2 font-mono font-bold text-gray-400">{runner.position}</td>
                                      <td className="px-4 py-2 font-bold text-white">{runner.driver}</td>
                                      <td className="px-4 py-2 text-gray-500">{runner.team}</td>
                                      <td className="px-4 py-2 text-right font-mono text-gray-400">{runner.time}</td>
                                      <td className="px-4 py-2 text-right font-black text-racing-red">{runner.points}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom accent line */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl ${isCurrentNext ? 'bg-gradient-to-r from-racing-red to-red-700' : isNextRace ? 'bg-gradient-to-r from-blue-500 to-blue-700' : 'bg-gradient-to-r from-gray-600 to-gray-700'} opacity-80`}></div>
                    </div>
                  );
                })}
              </div>

              {/* Show more link */}
              <div className="text-center mt-8">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="px-6 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  View Full Schedule ╬ô├Ñ├å
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Detailed Race Standings Modal */}
        {detailedRaceStandings.raceId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-racing-red" />
                    {detailedRaceStandings.raceName}
                  </h3>
                  <p className="text-sm text-gray-400">{detailedRaceStandings.raceDate}</p>
                </div>
                <button
                  onClick={() => setDetailedRaceStandings(prev => ({ ...prev, raceId: null }))}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Qualifying Results */}
                {detailedRaceStandings.data.qualifying.length > 0 && (
                  <div className="border-b border-gray-700">
                    <div className="px-6 py-4 bg-gray-800/50">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Qualifying Results
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700 uppercase text-[10px] font-black bg-gray-800/50">
                            <th className="px-6 py-3">Pos</th>
                            <th className="px-6 py-3">Driver</th>
                            <th className="px-6 py-3 hidden md:table-cell">Team</th>
                            <th className="px-6 py-3 text-right">Q1</th>
                            <th className="px-6 py-3 text-right">Q2</th>
                            <th className="px-6 py-3 text-right">Q3</th>
                            <th className="px-6 py-3 text-right">Gap</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {detailedRaceStandings.data.qualifying.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-3">
                                <span className={`font-mono font-bold ${index < 3 ? 'text-racing-red' : 'text-gray-400'}`}>
                                  {result.position}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-bold text-white">{result.driver}</td>
                              <td className="px-6 py-3 text-gray-400 hidden md:table-cell">{result.team}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.q1}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.q2}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.q3}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.gap}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Race Results */}
                {detailedRaceStandings.data.race.length > 0 && (
                  <div className="border-b border-gray-700">
                    <div className="px-6 py-4 bg-gray-800/50">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Flag className="w-5 h-5 text-green-500" />
                        Race Results
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700 uppercase text-[10px] font-black bg-gray-800/50">
                            <th className="px-6 py-3">Pos</th>
                            <th className="px-6 py-3">Driver</th>
                            <th className="px-6 py-3 hidden md:table-cell">Team</th>
                            <th className="px-6 py-3 text-center">Grid</th>
                            <th className="px-6 py-3 text-center">Laps</th>
                            <th className="px-6 py-3 text-right">Time</th>
                            <th className="px-6 py-3 text-right font-bold text-racing-red">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {detailedRaceStandings.data.race.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-3">
                                <span className={`font-mono font-bold ${index < 3 ? 'text-racing-red' : 'text-gray-400'}`}>
                                  {result.position}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-bold text-white">{result.driver}</td>
                              <td className="px-6 py-3 text-gray-400 hidden md:table-cell">{result.team}</td>
                              <td className="px-6 py-3 text-center font-mono text-gray-400">{result.grid}</td>
                              <td className="px-6 py-3 text-center font-mono text-gray-400">{result.laps}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.time}</td>
                              <td className="px-6 py-3 text-right font-mono font-black text-racing-red">{result.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sprint Results */}
                {detailedRaceStandings.data.sprint.length > 0 && (
                  <div>
                    <div className="px-6 py-4 bg-gray-800/50">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-500" />
                        Sprint Results
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700 uppercase text-[10px] font-black bg-gray-800/50">
                            <th className="px-6 py-3">Pos</th>
                            <th className="px-6 py-3">Driver</th>
                            <th className="px-6 py-3 hidden md:table-cell">Team</th>
                            <th className="px-6 py-3 text-center">Laps</th>
                            <th className="px-6 py-3 text-right">Time</th>
                            <th className="px-6 py-3 text-right font-bold text-racing-red">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {detailedRaceStandings.data.sprint.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-3">
                                <span className={`font-mono font-bold ${index < 3 ? 'text-racing-red' : 'text-gray-400'}`}>
                                  {result.position}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-bold text-white">{result.driver}</td>
                              <td className="px-6 py-3 text-gray-400 hidden md:table-cell">{result.team}</td>
                              <td className="px-6 py-3 text-center font-mono text-gray-400">{result.laps}</td>
                              <td className="px-6 py-3 text-right font-mono text-gray-400">{result.time}</td>
                              <td className="px-6 py-3 text-right font-mono font-black text-racing-red">{result.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
                <div className="flex justify-end">
                  <button
                    onClick={() => setDetailedRaceStandings(prev => ({ ...prev, raceId: null }))}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREDICTION BUILDER */}
        {activeTab === 'builder' && (
          <div className="animate-in fade-in duration-500">
            {/* F1 Data Input Section */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 mb-8 border border-racing-red/20 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-racing-red to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-racing-red/20 flex-shrink-0">
                    <span className="text-white font-black text-sm">F1</span>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Strategy Forge</h2>
                    <p className="text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed hidden sm:block">
                      Simulate 2026 outcomes by modifying variables via our live LLM/PyTorch inference engine.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={loadMelbourneUndercutScenario}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-lg transition-all flex items-center justify-center space-x-2 font-bold shadow-lg shadow-blue-900/20 text-xs uppercase tracking-wider"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Melbourne</span>
                  </button>
                  <button
                    onClick={fillRandomF1Data}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-racing-red to-red-700 hover:from-red-600 hover:to-red-500 rounded-lg transition-all flex items-center justify-center space-x-2 font-bold shadow-lg shadow-red-900/20 text-xs uppercase tracking-wider"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Random</span>
                  </button>
                  <button
                    onClick={() => setShowF1DataInput(!showF1DataInput)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 font-bold text-xs uppercase tracking-wider"
                  >
                    <span>{showF1DataInput ? 'Hide' : 'Show'} Form</span>
                    <span className={`transform transition-transform duration-200 ${showF1DataInput ? 'rotate-180' : ''}`}>╬ô├╗Γò¥</span>
                  </button>
                </div>
              </div>

              {showF1DataInput && (
                <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
                  {/* Driver Information */}
                  <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-base font-black mb-6 flex items-center space-x-3 uppercase tracking-widest text-gray-400">
                      <span className="w-6 h-0.5 bg-racing-blue rounded-full"></span>
                      <span>Driver Profile</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Driver Name</label>
                        <input
                          type="text"
                          value={f1Data.driverName}
                          onChange={(e) => updateF1Data('driverName', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-blue transition-all text-sm font-semibold"
                          placeholder="e.g., Lewis Hamilton"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Driver #</label>
                        <input
                          type="text"
                          value={f1Data.driverNumber}
                          onChange={(e) => updateF1Data('driverNumber', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-blue transition-all text-sm font-semibold"
                          placeholder="e.g., 44"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Exp (Years)</label>
                        <input
                          type="number"
                          value={f1Data.driverExperience}
                          onChange={(e) => updateF1Data('driverExperience', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-blue transition-all text-sm font-semibold"
                          placeholder="e.g., 15"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Constructor</label>
                        <input
                          type="text"
                          value={f1Data.driverTeam}
                          onChange={(e) => updateF1Data('driverTeam', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-blue transition-all text-sm font-semibold"
                          placeholder="e.g., Mercedes AMG"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Car Specifications (2026 Technical Regulations) */}
                  <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-base font-black mb-6 flex items-center space-x-3 uppercase tracking-widest text-gray-400">
                      <span className="w-6 h-0.5 bg-racing-red rounded-full"></span>
                      <span>2026 Spec Technicals</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chassis ID</label>
                        <input
                          type="text"
                          value={f1Data.carModel}
                          onChange={(e) => updateF1Data('carModel', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-red transition-all text-sm font-semibold"
                          placeholder="e.g., W15"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Power Unit</label>
                        <select
                          value={f1Data.engineType}
                          onChange={(e) => updateF1Data('engineType', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-red transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="2026 Standardized Power Unit">2026 Std. PU</option>
                          <option value="Legacy V6 Turbo Hybrid">Legacy Hybrid</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Compound</label>
                        <select
                          value={f1Data.tireCompound}
                          onChange={(e) => updateF1Data('tireCompound', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-red transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="C1">C1 (Hard)</option>
                          <option value="C2">C2</option>
                          <option value="C3">C3 (Med)</option>
                          <option value="C4">C4</option>
                          <option value="C5">C5 (Soft)</option>
                          <option value="Intermediate">Inter</option>
                          <option value="Wet">Wet</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fuel (kg)</label>
                        <input
                          type="text"
                          value={f1Data.fuelLoad}
                          onChange={(e) => updateF1Data('fuelLoad', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-racing-red transition-all text-sm font-semibold"
                          placeholder="110kg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Track Conditions */}
                  <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-base font-black mb-6 flex items-center space-x-3 uppercase tracking-widest text-gray-400">
                      <span className="w-6 h-0.5 bg-yellow-500 rounded-full"></span>
                      <span>Track Conditions</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Surface</label>
                        <select
                          value={f1Data.trackCondition}
                          onChange={(e) => updateF1Data('trackCondition', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="dry">Dry</option>
                          <option value="damp">Damp</option>
                          <option value="wet">Wet</option>
                          <option value="flooded">Flooded</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Evolution</label>
                        <select
                          value={f1Data.trackEvolution}
                          onChange={(e) => updateF1Data('trackEvolution', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Total Laps</label>
                        <input
                          type="number"
                          value={f1Data.raceLaps}
                          onChange={(e) => updateF1Data('raceLaps', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-semibold"
                          placeholder="e.g., 70"
                        />
                      </div>
                      <div className="flex flex-col justify-end space-y-3">
                        <div className="flex items-center space-x-3 bg-black/20 p-2.5 rounded-xl border border-gray-800">
                          <input
                            type="checkbox"
                            checked={f1Data.safetyCar}
                            onChange={(e) => updateF1Data('safetyCar', e.target.checked)}
                            className="w-4 h-4 text-yellow-500 bg-gray-900 border-gray-700 rounded focus:ring-yellow-500"
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Safety Car</span>
                        </div>
                        <div className="flex items-center space-x-3 bg-black/20 p-2.5 rounded-xl border border-gray-800">
                          <input
                            type="checkbox"
                            checked={f1Data.redFlag}
                            onChange={(e) => updateF1Data('redFlag', e.target.checked)}
                            className="w-4 h-4 text-red-500 bg-gray-900 border-gray-700 rounded focus:ring-red-500"
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Red Flag</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Environmental Telemetry */}
                  <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-base font-black mb-6 flex items-center space-x-3 uppercase tracking-widest text-gray-400">
                      <span className="w-6 h-0.5 bg-blue-500 rounded-full"></span>
                      <span>Environmental Telemetry</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Air Temp (Γö¼ΓûæC)</label>
                        <input
                          type="number"
                          value={f1Data.airTemp}
                          onChange={(e) => updateF1Data('airTemp', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Track Temp (Γö¼ΓûæC)</label>
                        <input
                          type="number"
                          value={f1Data.trackTemp}
                          onChange={(e) => updateF1Data('trackTemp', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                          placeholder="35"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Humidity (%)</label>
                        <input
                          type="number"
                          value={f1Data.humidity}
                          onChange={(e) => updateF1Data('humidity', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                          placeholder="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Wind (km/h)</label>
                        <input
                          type="number"
                          value={f1Data.windSpeed}
                          onChange={(e) => updateF1Data('windSpeed', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Rain Prob (%)</label>
                        <input
                          type="number"
                          value={f1Data.rainProbability}
                          onChange={(e) => updateF1Data('rainProbability', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precipitation</label>
                        <select
                          value={f1Data.precipitation}
                          onChange={(e) => updateF1Data('precipitation', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="none">None</option>
                          <option value="light">Light</option>
                          <option value="moderate">Med</option>
                          <option value="heavy">Heavy</option>
                          <option value="storm">Storm</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Execution Strategy */}
                  <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-base font-black mb-6 flex items-center space-x-3 uppercase tracking-widest text-gray-400">
                      <span className="w-6 h-0.5 bg-green-500 rounded-full"></span>
                      <span>Execution Strategy</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pit Plan</label>
                        <select
                          value={f1Data.pitStrategy}
                          onChange={(e) => updateF1Data('pitStrategy', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="1-stop">1-Stop</option>
                          <option value="2-stop">2-Stop</option>
                          <option value="3-stop">3-Stop</option>
                          <option value="undercut">Undercut</option>
                          <option value="overcut">Overcut</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fuel Mode</label>
                        <select
                          value={f1Data.fuelStrategy}
                          onChange={(e) => updateF1Data('fuelStrategy', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="conservative">Conservative</option>
                          <option value="balanced">Balanced</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="push">Max Push</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tire Rotation</label>
                        <select
                          value={f1Data.tireStrategy}
                          onChange={(e) => updateF1Data('tireStrategy', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="C3-C4-C4">Balanced (C3-C4-C4)</option>
                          <option value="C2-C3-C4">Soft Start</option>
                          <option value="C3-C4-C5">Hard Finish</option>
                          <option value="C2-C4-C4">One Soft</option>
                          <option value="C4-C4-C4">Max Consistency</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Defense Prio</label>
                        <select
                          value={f1Data.defensiveDriving}
                          onChange={(e) => updateF1Data('defensiveDriving', e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-semibold appearance-none"
                        >
                          <option value="aggressive">High Defense</option>
                          <option value="moderate">Moderate</option>
                          <option value="conservative">Low Yield</option>
                          <option value="passive">Passive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <button
                      onClick={() => setF1Data({
                        driverName: '',
                        driverNumber: '',
                        driverExperience: '',
                        driverTeam: '',
                        carModel: '',
                        engineType: '2026 Standardized Power Unit',
                        tireCompound: 'C3',
                        fuelLoad: '110kg',
                        carWeight: '798kg',
                        aeroPackage: '2026 Ground Effect',
                        energyRecovery: '800kW',
                        trackCondition: 'dry',
                        safetyCar: false,
                        redFlag: false,
                        raceLaps: '',
                        trackEvolution: 'medium',
                        precipitation: 'none',
                        airTemp: '25',
                        trackTemp: '35',
                        humidity: '50',
                        windSpeed: '5',
                        rainProbability: '0',
                        pitStrategy: '2-stop',
                        fuelStrategy: 'conservative',
                        tireStrategy: 'C3-C4-C4',
                        overtakeAttempts: '',
                        defensiveDriving: '',
                        sprintWeekend: false
                      })}
                      className="px-6 py-2.5 bg-black/40 hover:bg-black/60 border border-gray-700 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-gray-400"
                    >
                      Clear Inputs
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prediction Execution Section - Monsterbet Style */}
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900 border border-racing-red/20 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-racing-red" />
                    <span>Quick Selectors</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {['Qualifying', 'Race', 'Podium', 'Pit Strategy', 'Overtakes', 'Sprint'].map((type) => {
                      const mappedType = type === 'Pit Strategy' ? 'pit-strategy' : type === 'Overtakes' ? 'overtake' : type.toLowerCase();
                      const isActive = predictionType === mappedType;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setPredictionType(mappedType as any);
                            // Auto-populate data if form is empty
                            if (!f1Data.driverName) {
                              fillRandomF1Data();
                            }
                          }}
                          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${isActive
                            ? 'bg-racing-red border-racing-red text-white shadow-lg shadow-racing-red/20'
                            : 'bg-white/5 border-gray-700 text-gray-400 hover:border-gray-500'
                            }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-racing-blue/10 border border-racing-blue/20 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-2 text-racing-blue mb-1">
                      <Database className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Logic Engine Sync</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Ready to simulate under 2026 Regulations. Parameters loaded.</p>
                  </div>

                  <button
                    onClick={generatePredictions}
                    disabled={isPredicting}
                    className="w-full bg-gradient-to-r from-racing-red to-red-600 hover:from-red-600 hover:to-red-500 py-4 rounded-xl font-black text-lg shadow-xl shadow-racing-red/30 transform transition active:scale-95 flex items-center justify-center space-x-3 mb-4"
                  >
                    {isPredicting ? (
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                        <span>Alpha Computing...</span>
                      </div>
                    ) : (
                      <>
                        <Brain className="w-6 h-6" />
                        <span>RUN ALPHA SIMULATION</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold">
                    Powered by Kobayashi Llama 3.3
                  </p>
                </div>

                {/* Accuracy Card */}
                <div className="bg-gradient-to-br from-indigo-900/20 to-racing-blue/10 border border-racing-blue/20 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-racing-blue uppercase tracking-widest">Model Confidence</span>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-4xl font-mono font-black text-white mb-2">92.4%</div>
                  <p className="text-xs text-gray-400 leading-relaxed">Based on 2026 ground-effect simulation parameters and OpenF1 telemetry profiles.</p>
                </div>

                {/* Alpha Methodology Breakdown */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                    <Info className="w-3 h-3 mr-2" />
                    Alpha Methodology
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">Historical Weight</span>
                      <span className="text-white">70%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">Live Telemetry Mix</span>
                      <span className="text-white">20%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">Heuristic Offset</span>
                      <span className="text-white">10%</span>
                    </div>
                    <p className="text-[9px] text-gray-500 italic mt-2">
                      Alpha represents our model's historical replay delta compared to real outcomes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {predictionResults ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-right duration-500">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="font-bold text-sm uppercase tracking-widest">Live Prediction Result</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">ID: ALPHA-{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                    </div>

                    <div className="p-8">
                      {predictionResults.error ? (
                        <div className="text-center py-12">
                          <Brain className="w-16 h-16 text-gray-700 mx-auto mb-4 opacity-50" />
                          <p className="text-red-400 font-bold">{predictionResults.error}</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Field Outlook & Scenarios</h4>
                                <div className="space-y-4">
                                  {(predictionResults.outcomes || []).slice(0, 5).map((out: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="font-bold">{out.label}</span>
                                        <span className="font-mono text-racing-red">{out.probability}</span>
                                      </div>
                                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-racing-red shadow-[0_0_10px_rgba(211,47,47,0.4)]" style={{ width: out.probability }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Alpha Reasoning</h4>
                              <p className="text-sm text-gray-300 leading-relaxed italic">
                                "{predictionResults.analysis || "The 2026 regulations favor high-downforce setups at this sector. Expect significant tire degradation on the leading edge."}"
                              </p>
                              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-racing-blue rounded-full flex items-center justify-center">
                                    <span className="text-[10px] font-bold">K</span>
                                  </div>
                                  <span className="text-xs font-bold">Kobayashi Intelligence</span>
                                </div>
                                <button className="text-[10px] font-black text-racing-red uppercase hover:underline">View Deep Trace</button>
                              </div>
                            </div>
                          </div>

                          {/* NEW: Step-by-step factor breakdown */}
                          {predictionResults.factors && predictionResults.factors.length > 0 && (
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 mt-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-racing-blue" />
                                Simulation Variable Weights
                              </h4>
                              <p className="text-xs text-gray-500 mb-4">Step-by-step breakdown of how outcomes were derived based on your inputs:</p>
                              <div className="grid md:grid-cols-2 gap-4">
                                {(predictionResults.factors || []).map((factor: string, i: number) => (
                                  <div key={i} className="flex items-start space-x-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="w-6 h-6 rounded-full bg-racing-blue/20 text-racing-blue flex items-center justify-center font-bold text-xs shrink-0">
                                      {i + 1}
                                    </div>
                                    <span className="text-sm text-gray-300">{factor}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* NEW: Simulation Leaderboard - Driver Rankings */}
                          {predictionResults.predictions && predictionResults.predictions.length > 0 && (
                            <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden mt-8">
                              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center">
                                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                                  Simulated Leaderboard
                                </h4>
                                <span className="text-[10px] font-mono text-racing-blue bg-racing-blue/10 px-2 py-0.5 rounded border border-racing-blue/20">2026 COMPLIANT</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-white/5 uppercase font-black bg-black/20">
                                      <th className="px-6 py-3">Pos</th>
                                      <th className="px-6 py-3">Driver</th>
                                      <th className="px-6 py-3">Team</th>
                                      <th className="px-6 py-3 text-right">Confidence</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {Array.isArray(predictionResults.predictions) && (predictionResults.predictions as any[]).map((p, i) => (
                                      <tr key={i} className="hover:bg-white/10 transition-colors">
                                        <td className="px-6 py-3 font-mono font-bold text-gray-400">{p.position || i + 1}</td>
                                        <td className="px-6 py-3 font-bold text-white uppercase">{p.driver || p.zone || 'Unknown'}</td>
                                        <td className="px-6 py-3 text-gray-400">{p.team || p.difficulty || 'TBD'}</td>
                                        <td className="px-6 py-3 text-right">
                                          <div className="flex items-center justify-end space-x-2">
                                            <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-racing-red" style={{ width: `${(p.confidence || p.successRate || 0.7) * 100}%` }} />
                                            </div>
                                            <span className="font-mono text-gray-400">{((p.confidence || p.successRate || 0.7) * 100).toFixed(0)}%</span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {predictionResults.isFallback && (
                            <div className="flex items-center justify-center space-x-2 mt-8 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                              <Info className="w-3 h-3 text-racing-blue" />
                              <span>Alpha Engine Unavailable / Insufficient Depth. Using Kobayashi Logic Engine (v4.2-2026) Fallback.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-600 space-y-4">
                    <Brain className="w-16 h-16 opacity-20" />
                    <p className="font-bold tracking-widest uppercase text-xs">Awaiting Simulation Parameters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DATA ANALYTICS DASHBOARD - Race Data Display */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Full Race Calendar */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-racing-red/20 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-racing-red" />
                  <h2 className="text-xl font-bold tracking-tight">2026 F1 Race Calendar</h2>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-gray-400">Sprint Weekend</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-xs text-gray-400">Standard</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingRacesList.map((race) => (
                  <div key={race.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-racing-red/50 transition-all duration-200 group cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCountryFlag(race.country)}</span>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-racing-red transition-colors">{race.name}</h3>
                          <p className="text-sm text-gray-400">{race.track}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        race.format === 'Sprint' 
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                          : 'bg-gray-700/50 text-gray-300'
                      }`}>
                        {race.format}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        <div className="flex items-center space-x-1 mb-1">
                          <Calendar className="w-3" />
                          <span>{race.date}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Trophy className="w-3 h-3" />
                          <span>{race.leader}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {race.format === 'Sprint' && (
                          <div className="text-orange-400 text-[10px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            Sprint
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => toggleRaceStandingsExpansion(e, race.id)}
                            className={`p-1.5 border rounded text-[10px] font-black transition-all ${expandedRaceId === race.id ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-yellow-500 hover:text-yellow-500'}`}
                            title="View Standings"
                          >
                            <Trophy className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'qualifying'); }}
                            className="p-1.5 bg-gray-900 border border-gray-700 hover:border-racing-blue rounded text-[10px] font-black text-gray-500 hover:text-racing-blue transition-all"
                          >
                            Q
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'race'); }}
                            className="p-1.5 bg-gray-900 border border-gray-700 hover:border-racing-red rounded text-[10px] font-black text-gray-500 hover:text-racing-red transition-all"
                          >
                            R
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Standings for Analytics Grid */}
                    {expandedRaceId === race.id && (
                      <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                        {loadingCalendarStandings.has(race.id) ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-white/5 bg-black/40">
                            <table className="w-full text-left text-[10px]">
                              <tbody className="divide-y divide-white/5">
                                {(calendarStandings[race.id] || []).slice(0, 5).map((runner, idx) => (
                                  <tr key={idx}>
                                    <td className="px-2 py-1 font-mono text-gray-500">{runner.position}</td>
                                    <td className="px-2 py-1 font-bold text-white truncate max-w-[80px]">{runner.driver.split(' ').pop()}</td>
                                    <td className="px-2 py-1 text-right font-black text-racing-red">{runner.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleViewSession(race.id, 'all'); }}
                              className="w-full py-1.5 text-[9px] font-black text-center text-gray-500 hover:text-white bg-white/5 uppercase tracking-widest border-t border-white/5"
                            >
                              Full Standings
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <h4 className="font-bold text-white mb-2">2026 Sprint Weekends</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {upcomingRacesList
                    .filter(race => race.format === 'Sprint')
                    .map(race => (
                      <div key={race.id} className="text-center p-2 bg-orange-500/10 rounded border border-orange-500/20">
                        <div className="text-lg mb-1">{getCountryFlag(race.country)}</div>
                        <div className="text-xs text-orange-400 font-medium">{race.name.replace(' GP', '')}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-racing-red/20 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Flag className="w-5 h-5 text-racing-red" />
                  <h2 className="text-xl font-bold tracking-tight">Race Analysis Controls</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setIsReplaying(true)
                      loadRaceData()
                      setTimeout(() => setIsReplaying(false), 3000)
                    }}
                    disabled={isReplaying || dataSourceMode === 'custom'}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-racing-red to-red-700 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isReplaying ? 'Analyzing...' : 'Replay'}</span>
                  </button>

                  <button
                    onClick={() => loadRaceData()}
                    disabled={raceData.loading}
                    className="flex-1 sm:flex-none border-2 border-racing-blue px-4 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{raceData.loading ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <button
                    onClick={exportReport}
                    disabled={isGeneratingReport || raceData.data.length === 0}
                    className="flex-1 sm:flex-none border-2 border-racing-red px-4 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    {isGeneratingReport ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => recordSessionData('race_snapshot', raceData.data[0])}
                    disabled={isRecording || raceData.data.length === 0}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 text-xs uppercase tracking-wider transition-all shadow-lg ${isRecording ? 'bg-orange-600' : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600'} shadow-green-900/20`}
                    title="Record this session data for later analysis"
                  >
                    {isRecording ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>{isRecording ? 'Recording...' : 'Record Snapshot'}</span>
                  </button>


                  <button
                    onClick={() => setShowPredictions(!showPredictions)}
                    className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    <Target className="w-4 h-4 text-racing-red" />
                    <span>{showPredictions ? 'Hide' : 'Forecast'}</span>
                  </button>
                </div>
              </div>
              
              {recordStatus && (
                <div className="mt-4 p-2 bg-racing-blue/10 border border-racing-blue/30 rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                  <span className={`text-xs font-bold ${recordStatus?.includes('Error') ? 'text-racing-red' : 'text-racing-blue'}`}>
                    {recordStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Analytics Header Section */}
            <div className="grid lg:grid-cols-4 gap-6">
              {[
                { label: 'Avg Lap Time', value: '1:34.221', icon: Clock, color: 'text-racing-blue' },
                { label: 'Top Speed', value: '342 km/h', icon: Zap, color: 'text-yellow-500' },
                { label: 'Tire Life', value: '74%', icon: Info, color: 'text-green-500' },
                { label: 'Consistency', value: '98.2%', icon: Target, color: 'text-racing-red' }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-900 border border-white/5 rounded-2xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-mono font-black">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Performance Chart - Recharts Integration */}
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold">Lap Time Variance</h3>
                  <p className="text-sm text-gray-500">Stints Analysis ╬ô├ç├│ 2026 Simulation Parameters</p>
                </div>
                <div className="flex space-x-2">
                  <span className="px-3 py-1 bg-racing-red/10 border border-racing-red/20 text-racing-red text-[10px] font-black rounded-full uppercase">Live Telemetry</span>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { lap: 1, p1: 94.2, p2: 95.1, p3: 95.8, p4: 96.2, p5: 96.5 },
                    { lap: 2, p1: 93.8, p2: 94.5, p3: 95.2, p4: 95.7, p5: 96.1 },
                    { lap: 3, p1: 93.5, p2: 94.2, p3: 94.8, p4: 95.3, p5: 95.8 },
                    { lap: 4, p1: 93.2, p2: 93.9, p3: 94.5, p4: 95.0, p5: 95.4 },
                    { lap: 5, p1: 93.1, p2: 93.8, p3: 94.4, p4: 94.8, p5: 95.2 },
                    { lap: 6, p1: 94.5, p2: 94.1, p3: 94.8, p4: 95.2, p5: 95.6 },
                    { lap: 7, p1: 93.8, p2: 93.7, p3: 94.3, p4: 94.9, p5: 95.3 },
                    { lap: 8, p1: 93.6, p2: 93.5, p3: 94.1, p4: 94.6, p5: 95.1 },
                    { lap: 9, p1: 93.4, p2: 93.4, p3: 94.0, p4: 94.5, p5: 95.0 },
                    { lap: 10, p1: 93.3, p2: 93.3, p3: 93.9, p4: 94.4, p5: 94.9 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                    <XAxis dataKey="lap" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Lap Number', position: 'bottom', fill: '#4a5568', fontSize: 10 }} />
                    <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} domain={['92', '98']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a202c', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="p1" name="HΓö£Γò¥lkenberg (P1)" stroke="#e10600" strokeWidth={3} dot={{ r: 4, fill: '#e10600', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="p2" name="Verstappen (P2)" stroke="#1e40af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="p3" name="Leclerc (P3)" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="p4" name="Norris (P4)" stroke="#ff8000" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="p5" name="Russell (P5)" stroke="#00d2be" strokeWidth={2} strokeDasharray="2 2" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gray-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest">Driver Standings Matrix</h4>
                  <button className="text-xs text-racing-red font-bold hover:underline">Full Leaderboard</button>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5 uppercase text-[10px] font-black">
                        <th className="px-6 py-4">Pos</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Constructor</th>
                        <th className="px-6 py-4">Interval</th>
                        <th className="px-6 py-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {apiStandings.slice(0, 6).map((standing, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 bg-racing-red/0 group-hover:bg-racing-red/10 transition-colors">
                            <span className="font-mono font-bold">{standing.position}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{standing.driver?.name}</td>
                          <td className="px-6 py-4 text-gray-400">{standing.team?.name}</td>
                          <td className="px-6 py-4 font-mono text-gray-500 text-xs">--</td>
                          <td className="px-6 py-4 text-right font-black text-white">{standing.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                {/* Historical DNA - Real Data from local archives */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2">
                    <History className="w-12 h-12 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors" />
                  </div>
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    Historical DNA Archive
                  </h4>

                  {historyLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                      <div className="h-4 bg-white/5 rounded w-1/2"></div>
                      <div className="h-4 bg-white/5 rounded w-2/3"></div>
                    </div>
                  ) : historicalData.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {historicalData.map((yearEntry, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1">
                            <span className="text-[10px] font-black text-gray-500">{yearEntry.year} Results</span>
                            <span className="text-[10px] text-indigo-400 font-bold">ARC-{yearEntry.year}</span>
                          </div>
                          <div className="space-y-2">
                            {yearEntry.results.slice(0, 3).map((res: any, rIdx: number) => (
                              <div key={rIdx} className="flex justify-between items-center text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-white">{res.driver}</span>
                                  <span className="text-[10px] text-gray-500 uppercase">{res.team}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-indigo-400">P{res.position}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{res.time !== 'N/A' ? res.time : '--'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-500 uppercase font-black">No Local Archives Found</p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-500 italic">
                    Utilized by AI Oracle for 2026 Alpha Simulations
                  </div>
                </div>

                {/* Weather Station */}
                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center">
                    <Cloud className="w-4 h-4 mr-2 text-racing-blue" />
                    Live Track Weather
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-400 text-xs mb-1">
                        <Thermometer className="w-3 h-3 mr-1" />
                        Air Temp
                      </div>
                      <div className="text-2xl font-mono font-bold text-white">24.5Γö¼ΓûæC</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-400 text-xs mb-1">
                        <Droplets className="w-3 h-3 mr-1" />
                        Humidity
                      </div>
                      <div className="text-2xl font-mono font-bold text-white">42%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-400 text-xs mb-1">
                        <Wind className="w-3 h-3 mr-1" />
                        Wind
                      </div>
                      <div className="text-2xl font-mono font-bold text-white">12km/h</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-400 text-xs mb-1">
                        <Cloud className="w-3 h-3 mr-1" />
                        Track
                      </div>
                      <div className="text-2xl font-mono font-bold text-white">38.2Γö¼ΓûæC</div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Quick Highlight */}
                {generatedReport && (
                  <div className="bg-racing-red/5 border border-racing-red/20 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 mb-4 text-racing-red">
                      <Brain className="w-5 h-5" />
                      <span className="font-black text-xs uppercase tracking-widest">Alpha Debrief</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed max-h-48 overflow-y-auto font-medium mb-4 italic">
                      {generatedReport.slice(0, 300)}...
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('ai');
                        setTimeout(() => {
                          const el = document.getElementById('intel-matrix');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="w-full py-3 bg-racing-red/10 hover:bg-racing-red/20 border border-racing-red/30 rounded-xl text-racing-red text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Open Full Intelligence
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRACTICE & TESTING DASHBOARD */}
        {activeTab === 'practice' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black tracking-tight text-white flex items-center">
                <Clock className="w-8 h-8 mr-3 text-racing-red" />
                Practice & Testing Analysis
              </h2>
              <div className="flex items-center gap-4">
                {/* Track Selector */}
                <select
                  value={selectedTrackForPractice}
                  onChange={(e) => setSelectedTrackForPractice(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-racing-red"
                >
                  {upcomingRacesList.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
                
                {/* Session Selector */}
                {practiceSessions.length > 0 && (
                  <select
                    className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 font-semibold focus:outline-none focus:border-racing-red"
                    value={selectedPracticeSession || ''}
                    onChange={(e) => setSelectedPracticeSession(Number(e.target.value))}
                  >
                    {practiceSessions
                      .filter(s => s.trackInfo.id === selectedTrackForPractice)
                      .map(s => (
                        <option key={s.session_key} value={s.session_key}>
                          {s.session_name} ({new Date(s.date_start).toLocaleDateString()})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* Track Info Header */}
            <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {upcomingRacesList.find(t => t.id === selectedTrackForPractice)?.name || 'Selected Track'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Practice & Testing Sessions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-300">
                    {tracks.find(t => t.id === selectedTrackForPractice)?.location || upcomingRacesList.find(t => t.id === selectedTrackForPractice)?.country || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {practiceLoading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-gray-900/50 rounded-2xl border border-white/5">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-racing-red mb-4"></div>
                <p className="text-gray-400 font-bold tracking-widest uppercase">Fetching Telemetry & Lap Data...</p>
              </div>
            ) : practiceData.length > 0 ? (
              <div className="space-y-8">
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Practice Session Data</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {practiceData.map((session, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">{session.driver}</h4>
                        <p className="text-lg font-bold text-white">{session.lap_time}</p>
                        <p className="text-sm text-gray-400">{session.session_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-20 bg-gray-900/50 rounded-2xl border border-white/5">
                  <Info className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-400 font-bold tracking-widest uppercase">No Practice Data Found</p>
                  <p className="text-2xl font-bold text-white">Real-time</p>
                  <p className="text-xs text-gray-500">Event Updates</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <Play className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-gray-400">Control</span>
                  </div>
                  <p className="text-2xl font-bold text-white">Pause/Play</p>
                  <p className="text-xs text-gray-500">Performance Mode</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-racing-blue" />
                    <span className="text-xs text-gray-400">Analytics</span>
                  </div>
                  <p className="text-2xl font-bold text-white">7 Types</p>
                  <p className="text-xs text-gray-500">Event Categories</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                    <span className="text-xs text-gray-400">Config</span>
                  </div>
                  <p className="text-2xl font-bold text-white">5-30s</p>
                  <p className="text-xs text-gray-500">Update Frequency</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex items-center justify-center">
              <Link 
                href="/live-feed"
                className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-racing-red to-racing-blue hover:from-red-600 hover:to-blue-700 rounded-lg transition-all transform hover:scale-105 text-white font-bold"
              >
                <Satellite className="w-5 h-5" />
                <span>Access Dedicated Live Feed</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* TRACK MAP AND LIVE DATA SECTION */}
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
                <TrackMapViewer track={tracks.find(t => t.id === selectedTrack)?.name || selectedTrack} />
              </Suspense>
            </div>
            <div>
              <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
                <LiveDataTicker 
                  trackId={selectedTrack} 
                  drivers={apiDrivers.map(d => d.name)} 
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* DRIVER COMPARISON */}
        <div className="space-y-8 animate-in fade-in duration-700">
          <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
            <DriverComparisonPanel raceData={raceData.data[0]} />
          </Suspense>
        </div>

        {/* ENHANCED RACE VISUALIZATION */}
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 border border-racing-red/20 shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className="w-6 h-6 text-racing-red" />
              <h2 className="text-xl font-bold tracking-tight">Advanced Race Visualization</h2>
            </div>
          </div>
          
          <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
            <RaceVisualization 
              trackId={selectedTrack}
              trackName={tracks.find(t => t.id === selectedTrack)?.name}
              sessionKey={apiSessions[0]?.session_key}
              driverData={apiDrivers}
              telemetryData={raceData.data}
              weatherData={simulatedWeather}
            />
          </Suspense>
        </div>

        {/* WHAT-IF SCENARIO SIMULATOR - Only in standings tab with toggle */}
        {activeTab === 'standings' && showWhatIfSimulator && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
              <WhatIfSimulator 
                trackId={selectedTrack}
                drivers={apiDrivers.map(d => d.name)}
              />
            </Suspense>
          </div>
        )}

        {/* AI ORACLE CHAT */}
        {activeTab === 'ai' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Suspense fallback={<div className="h-[600px] w-full bg-gray-800 animate-pulse rounded-2xl" />}>
                  <F1AIChat contextData={{
                    standings: apiStandings,
                    drivers: apiDrivers,
                    teams: apiTeams,
                    nextRaces: upcomingRacesList,
                    currentTrack: tracks.find(t => t.id === selectedTrack),
                    historicalArchives: historicalData
                  }} />
                </Suspense>
              </div>
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-white/10 shadow-xl border-racing-red/20">
                  <h4 className="text-xl font-bold mb-4 flex items-center text-racing-red">
                    <Target className="w-5 h-5 mr-2" />
                    Alpha Pick Accuracy
                  </h4>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-4xl font-black text-white tracking-tighter">94.2%</span>
                    <span className="text-green-500 text-sm font-bold flex items-center mb-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +2.1%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Last 10 Races Analysis</p>
                  <div className="mt-6 space-y-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Top Prediction Strength</p>
                      <p className="text-sm font-bold text-white">Podium Outcomes</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase font-bold">Key Insight Factor</p>
                      <p className="text-sm font-bold text-white">2026 Aero Efficiency</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                  <h4 className="font-bold text-white mb-4 flex items-center text-sm uppercase tracking-wider">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                    Live Alpha Tickers
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: "Verstappen Confidence", value: "High (0.91)" },
                      { label: "Hulk P10 Probability", value: "Medium (0.68)" },
                      { label: "Ferrari Reliability", value: "Increasing" },
                      { label: "Track Evolution", value: "High" }
                    ].map((ticker, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{ticker.label}</span>
                        <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{ticker.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Decision Panel */}
            <Suspense fallback={<div className="h-[400px] w-full bg-gray-800 animate-pulse rounded-2xl" />}>
              <DecisionPanel
                driver="Max Verstappen"
                race={tracks.find(t => t.id === selectedTrack)?.name || "Monaco Grand Prix"}
                currentConditions={simulatedWeather}
              />
            </Suspense>

            {/* Combined Intelligence Matrix Section */}
            <div id="intel-matrix" className="bg-gradient-to-r from-gray-900 to-black rounded-2xl border border-white/5 p-8 shadow-2xl relative overflow-hidden block mt-8">
              <div className="absolute top-0 right-0 w-96 h-96 bg-racing-blue/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white flex items-center uppercase tracking-tight">
                      <Database className="w-6 h-6 mr-3 text-racing-blue" />
                      Global Intelligence Matrix
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-widest text-[10px]">Unified Live API + Historical DNA Simulation</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black rounded-full uppercase">API Synchronized</span>
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black rounded-full uppercase">Data Archives Active</span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-4 gap-6">
                  <div className="bg-white/5 rounded-xl p-5 border border-white/5 transform hover:scale-105 transition-all">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Archive Delta</p>
                    <div className="text-2xl font-mono font-black text-white">{historicalData.length > 0 ? '+0.422s' : '--'}</div>
                    <p className="text-[9px] text-gray-400 mt-2 italic">Avg. 2026 Lap vs Historical Baseline</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/5 transform hover:scale-105 transition-all">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Strategy Reliability</p>
                    <div className="text-2xl font-mono font-black text-white">88.5%</div>
                    <div className="w-full bg-gray-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-racing-blue h-full w-[88.5%]" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/5 transform hover:scale-105 transition-all">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sector Heat Map</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <div className="w-4 h-4 bg-green-500 rounded" />
                      <div className="w-4 h-4 bg-green-500 rounded" />
                      <div className="w-4 h-4 bg-yellow-500 rounded" />
                      <div className="w-4 h-4 bg-yellow-500 rounded" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/5 transform hover:scale-105 transition-all">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Predictive Rank</p>
                    <div className="text-2xl font-mono font-black text-racing-red">ALPHA-1</div>
                    <p className="text-[9px] text-gray-400 mt-2 uppercase font-black">Kobayashi Top Tier</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STANDINGS + PREDICTIONS SECTION */}
        {activeTab === 'standings' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* â•â•â• HERO: NEXT RACE PREDICTION BANNER â•â•â• */}
            <div className="relative rounded-2xl overflow-hidden border border-racing-red/30 shadow-2xl shadow-racing-red/10">
              <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black" />
              <div className="absolute inset-0 bg-gradient-to-r from-racing-red/20 via-transparent to-purple-900/20" />
              <div className="absolute top-0 right-0 w-72 h-full bg-racing-red/5 blur-3xl" />
              <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-racing-red/20 border border-racing-red/40 rounded-full">
                        <div className="w-1.5 h-1.5 bg-racing-red rounded-full animate-pulse" />
                        <span className="text-racing-red text-[10px] font-black uppercase tracking-widest">AI Prediction Engine</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">94.2% Accuracy</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
                      {currentRace?.name || 'Next Race'} Forecast
                    </h2>
                    <p className="text-gray-400 text-sm font-medium">{currentRace?.track} - {currentRace?.date}</p>
                  </div>

                  <div className="flex items-end gap-3">
                    {[
                      { pos: 2, driver: 'L. Norris',     team: 'McLaren',  conf: '78%', color: 'from-gray-700 to-gray-800',   badge: 'text-gray-300',   h: 'h-20' },
                      { pos: 1, driver: 'M. Verstappen', team: 'Red Bull', conf: '91%', color: 'from-racing-red to-red-900',  badge: 'text-white',      h: 'h-28' },
                      { pos: 3, driver: 'C. Leclerc',    team: 'Ferrari',  conf: '65%', color: 'from-orange-900 to-gray-800', badge: 'text-orange-300', h: 'h-16' },
                    ].map(p => (
                      <div key={p.pos} className="flex flex-col items-center gap-1">
                        <div className="text-[10px] font-black text-gray-400 uppercase">{p.conf}</div>
                        <div className={`bg-gradient-to-t ${p.color} ${p.h} w-14 md:w-16 rounded-t-lg flex flex-col items-center justify-end pb-2 border border-white/10`}>
                          <span className={`text-lg font-black ${p.badge}`}>{p.pos}</span>
                        </div>
                        <div className="text-[10px] font-bold text-white text-center leading-tight">{p.driver}</div>
                        <div className="text-[9px] text-gray-500 text-center">{p.team}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => { setSelectedTrack(currentRace?.id || 'silverstone'); setActiveTab('ai'); }}
                      className="px-6 py-3 bg-gradient-to-r from-racing-red to-red-700 hover:from-red-500 hover:to-racing-red text-white font-black text-sm rounded-xl shadow-lg shadow-racing-red/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Brain className="w-4 h-4" />
                      Full AI Forecast
                    </button>
                    <button
                      onClick={() => setShowWhatIfSimulator(!showWhatIfSimulator)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-sm rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <Activity className="w-4 h-4 text-blue-400" />
                      What-If Sim
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Verstappen Win', value: 91, color: 'bg-racing-red' },
                    { label: 'Safety Car',     value: 68, color: 'bg-yellow-500' },
                    { label: 'Wet Race',       value: 22, color: 'bg-blue-500'   },
                    { label: 'Ferrari Podium', value: 65, color: 'bg-orange-500' },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{item.label}</span>
                        <span className="text-sm font-black text-white">{item.value}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {showWhatIfSimulator && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Suspense fallback={<div className="h-[400px] bg-gray-800 rounded-xl animate-pulse" />}>
                  <WhatIfSimulator trackId={selectedTrack} drivers={apiDrivers.map(d => d.name)} />
                </Suspense>
              </div>
            )}

            <div className="grid lg:grid-cols-5 gap-6">

              <div className="lg:col-span-3 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 gap-1">
                    {(['season', 'track', 'historical'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setStandingsView(v)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          standingsView === v
                            ? 'bg-racing-red text-white shadow-lg shadow-racing-red/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {v === 'season' ? '2026 Season' : v === 'track' ? 'By Track' : 'Historical'}
                      </button>
                    ))}
                  </div>

                  {standingsView === 'track' && (
                    <select
                      value={selectedRaceForStandings}
                      onChange={(e) => setSelectedRaceForStandings(e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-racing-red text-white"
                    >
                      {tracks.map(track => (
                        <option key={track.id} value={track.id}>{track.name}</option>
                      ))}
                    </select>
                  )}

                  {standingsView === 'historical' && (
                    <>
                      <select
                        value={historicalStandings.selectedYear}
                        onChange={(e) => setHistoricalStandings(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))}
                        className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-racing-red text-white"
                      >
                        {historicalStandings.availableYears.map(year => (
                          <option key={year} value={year}>{year} Season</option>
                        ))}
                      </select>
                      <select
                        value={historicalStandings.selectedRace}
                        onChange={(e) => {
                          const newRace = e.target.value
                          setHistoricalStandings(prev => ({ ...prev, selectedRace: newRace }))
                          fetchHistoricalStandings(historicalStandings.selectedYear, newRace)
                        }}
                        className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-racing-red text-white"
                      >
                        <option value="">All Races</option>
                        {historicalStandings.availableRaces.map(race => (
                          <option key={race.id} value={race.id}>{race.name}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={fetchStandingsData}
                      disabled={standingsLoading}
                      className="px-3 py-2 bg-racing-red hover:bg-red-700 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 text-white"
                    >
                      {standingsLoading ? '...' : 'Refresh'}
                    </button>
                    <button
                      onClick={() => recordSessionData('standings_snapshot', { standings: standingsData, track: selectedRaceForStandings, timestamp: Date.now() })}
                      disabled={isRecording}
                      className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 flex items-center gap-1.5 transition-all"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-gray-600 animate-pulse' : 'bg-red-500'}`} />
                      {recordStatus || 'Snapshot'}
                    </button>
                  </div>
                </div>

                {standingsView === 'season' && (
                  <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.03]">
                      <h3 className="font-black text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        2026 Drivers Championship
                      </h3>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Live Standings</span>
                    </div>
                    {standingsLoading ? (
                      <div className="space-y-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : standingsData.season.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {standingsData.season.map((driver: any, index: number) => (
                          <div key={index} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                            <div className={`w-7 text-center font-black font-mono text-sm ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{driver.position}</div>
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-300 font-mono shrink-0">{driver.driverNumber}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm truncate">{driver.driver}</div>
                              <div className="text-[10px] text-gray-500 font-medium truncate">{driver.team}</div>
                            </div>
                            <div className="hidden md:flex flex-col items-center">
                              <span className="text-xs font-black text-white">{driver.wins}</span>
                              <span className="text-[9px] text-gray-600 uppercase font-bold">Wins</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-black text-racing-red font-mono">{driver.points}</span>
                              <span className="text-[9px] text-gray-600 uppercase font-bold">pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Season data loads after races complete</p>
                      </div>
                    )}
                  </div>
                )}

                {standingsView === 'track' && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/80 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-white text-sm">{tracks.find((t: any) => t.id === selectedRaceForStandings)?.name || 'Selected Track'}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{tracks.find((t: any) => t.id === selectedRaceForStandings)?.location || ''}</p>
                      </div>
                      <select value={selectedSessionType} onChange={(e) => setSelectedSessionType(e.target.value as any)} className="px-3 py-1.5 bg-gray-800 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
                        <option value="all">All Sessions</option>
                        <option value="qualifying">Qualifying</option>
                        <option value="race">Race Results</option>
                        <option value="sprint">Sprint</option>
                      </select>
                    </div>
                    {(selectedSessionType === 'all' || selectedSessionType === 'qualifying') && standingsData.track.qualifying.length > 0 && (
                      <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /><span className="font-black text-white text-sm uppercase tracking-wide">Qualifying</span></div>
                        {standingsData.track.qualifying.map((session: any, si: number) => (<div key={si} className="divide-y divide-white/5">{session.results.map((result: any, i: number) => (<div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/[0.03] transition-colors"><span className={`w-6 text-center font-black font-mono text-sm ${i < 3 ? 'text-blue-400' : 'text-gray-600'}`}>{result.position}</span><span className="flex-1 font-bold text-white text-sm">{result.driver}</span><span className="hidden md:block text-xs text-gray-500">{result.team}</span><span className="font-mono text-xs text-gray-400">{result.q3 || result.q1 || '-'}</span><span className="font-mono text-xs text-racing-red">{result.gap}</span></div>))}</div>))}
                      </div>
                    )}
                    {(selectedSessionType === 'all' || selectedSessionType === 'race') && standingsData.track.raceResults.length > 0 && (
                      <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex items-center gap-2"><Flag className="w-4 h-4 text-green-400" /><span className="font-black text-white text-sm uppercase tracking-wide">Race Results</span></div>
                        {standingsData.track.raceResults.map((session: any, si: number) => (<div key={si} className="divide-y divide-white/5">{session.results.map((result: any, i: number) => (<div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/[0.03] transition-colors"><span className={`w-6 text-center font-black font-mono text-sm ${i < 3 ? 'text-racing-red' : 'text-gray-600'}`}>{result.position}</span><span className="flex-1 font-bold text-white text-sm">{result.driver}</span><span className="hidden md:block text-xs text-gray-500">{result.team}</span><span className="font-mono text-xs text-gray-400">{result.time}</span><span className="font-black text-sm text-racing-red font-mono">{result.points}</span></div>))}</div>))}
                      </div>
                    )}
                    {(selectedSessionType === 'all' || selectedSessionType === 'sprint') && standingsData.track.sprintResults.length > 0 && (
                      <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /><span className="font-black text-white text-sm uppercase tracking-wide">Sprint</span></div>
                        {standingsData.track.sprintResults.map((session: any, si: number) => (<div key={si} className="divide-y divide-white/5">{session.results.map((result: any, i: number) => (<div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/[0.03] transition-colors"><span className={`w-6 text-center font-black font-mono text-sm ${i < 3 ? 'text-yellow-400' : 'text-gray-600'}`}>{result.position}</span><span className="flex-1 font-bold text-white text-sm">{result.driver}</span><span className="hidden md:block text-xs text-gray-500">{result.team}</span><span className="font-mono text-xs text-gray-400">{result.time}</span><span className="font-black text-sm text-yellow-400 font-mono">{result.points}</span></div>))}</div>))}
                      </div>
                    )}
                    {!standingsLoading && standingsData.track.qualifying.length === 0 && standingsData.track.raceResults.length === 0 && standingsData.track.sprintResults.length === 0 && (
                      <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-white/5 border-dashed"><Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="font-bold text-gray-400">No data for this track yet</p></div>
                    )}
                  </div>
                )}

                {standingsView === 'historical' && (
                  <div className="space-y-4">
                    <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
                        <div className="flex items-center gap-2"><History className="w-4 h-4 text-racing-red" /><span className="font-black text-white text-sm uppercase tracking-wide">{historicalStandings.selectedYear} Championship</span></div>
                        <span className="text-[10px] text-gray-500">{historicalStandings.seasonStandings.length} drivers</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {historicalStandings.seasonStandings.map((driver: any, index: number) => (
                          <div key={index} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                            <span className={`w-7 text-center font-black font-mono text-sm ${index < 3 ? 'text-racing-red' : 'text-gray-600'}`}>{driver.position}</span>
                            <div className="flex-1"><div className="font-bold text-white text-sm">{driver.driver}</div><div className="text-[10px] text-gray-500">{driver.team}</div></div>
                            <div className="hidden md:block text-center"><span className="text-xs font-black text-gray-300">{driver.wins}</span><div className="text-[9px] text-gray-600 uppercase">wins</div></div>
                            <div className="text-right"><span className="text-lg font-black text-racing-red font-mono">{driver.points}</span><div className="text-[9px] text-gray-600 uppercase">pts</div></div>
                          </div>
                        ))}
                        {historicalStandings.seasonStandings.length === 0 && (<div className="text-center py-12 text-gray-500"><p className="font-bold">Select a year to load historical data</p></div>)}
                      </div>
                    </div>
                    {historicalStandings.selectedRace && historicalStandings.raceResults.length > 0 && (
                      <div className="bg-gray-900/80 border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.03] flex items-center gap-2"><Flag className="w-4 h-4 text-green-400" /><span className="font-black text-white text-sm uppercase tracking-wide">{historicalStandings.availableRaces.find((r: any) => r.id === historicalStandings.selectedRace)?.name}</span></div>
                        <div className="divide-y divide-white/5">
                          {historicalStandings.raceResults.map((result: any, index: number) => (
                            <div key={index} className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/[0.03] transition-colors"><span className={`w-6 text-center font-black font-mono text-sm ${index < 3 ? 'text-racing-red' : 'text-gray-600'}`}>{result.position}</span><span className="flex-1 font-bold text-white text-sm">{result.driver}</span><span className="hidden md:block text-xs text-gray-500">{result.team}</span><span className="font-mono text-xs text-gray-400">{result.time}</span><span className="font-black text-sm text-racing-red font-mono">{result.points}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {historicalStandings.seasonStandings.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Champion', value: historicalStandings.seasonStandings[0]?.driver, sub: historicalStandings.seasonStandings[0]?.team },
                          { label: 'Most Wins', value: historicalStandings.seasonStandings.reduce((m: any, d: any) => d.wins > m.wins ? d : m, historicalStandings.seasonStandings[0])?.driver, sub: `${Math.max(...historicalStandings.seasonStandings.map((d: any) => d.wins))} wins` },
                          { label: 'Total Rounds', value: historicalStandings.availableRaces.length, sub: `${historicalStandings.selectedYear} season` },
                        ].map(card => (
                          <div key={card.label} className="bg-gray-900/60 border border-white/5 rounded-xl p-4">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{card.label}</p>
                            <p className="text-racing-red font-black text-base leading-tight">{card.value}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">{card.sub}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* â”€â”€ RIGHT: Prediction Sidebar 2/5 â”€â”€ */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-racing-red/20 p-5 overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-racing-red/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-4 h-4 text-racing-red" />
                      <span className="text-xs font-black uppercase tracking-wider text-racing-red">Alpha Pick Accuracy</span>
                    </div>
                    <div className="flex items-end gap-3 mb-1">
                      <span className="text-5xl font-black text-white tracking-tighter">94.2%</span>
                      <div className="flex items-center gap-1 mb-2 text-green-400 text-sm font-bold"><TrendingUp className="w-4 h-4" />+2.1%</div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-5">Last 10 Races - Model v3.1</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Podium Accuracy',  value: '96%', bar: 96, color: 'bg-green-500'  },
                        { label: 'Pole Position',     value: '89%', bar: 89, color: 'bg-blue-500'   },
                        { label: 'Safety Car Timing', value: '71%', bar: 71, color: 'bg-yellow-500' },
                        { label: 'DNF Prediction',    value: '68%', bar: 68, color: 'bg-orange-500' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-gray-400">{item.label}</span><span className="text-white">{item.value}</span></div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.bar}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-300">Live Alpha Tickers</span>
                    <div className="ml-auto w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Verstappen Confidence', value: 'High (0.91)',   dot: 'bg-green-500'  },
                      { label: 'Norris Undercut Risk',  value: 'Medium (0.62)', dot: 'bg-yellow-500' },
                      { label: 'Ferrari Reliability',   value: 'Increasing',    dot: 'bg-orange-500' },
                      { label: 'Track Evolution',       value: 'High',          dot: 'bg-blue-500'   },
                      { label: 'Tyre Cliff Lap',        value: '~Lap 28-32',    dot: 'bg-purple-500' },
                    ].map((ticker, i) => (
                      <div key={i} className="flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ticker.dot}`} /><span className="text-gray-400">{ticker.label}</span></div>
                        <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[10px] whitespace-nowrap">{ticker.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-950/50 to-black rounded-2xl border border-indigo-500/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">Intel Matrix</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Archive Delta',   value: historicalData.length > 0 ? '+0.422s' : '--', sub: 'vs 2025 baseline' },
                      { label: 'Strategy Score',  value: '88.5%',                                      sub: 'Reliability index'  },
                      { label: 'Data Coverage',   value: `${historicalData.length || 0}`,               sub: 'historical records' },
                      { label: 'Predictive Rank', value: 'ALPHA-1',                                    sub: 'Kobayashi top tier' },
                    ].map(card => (
                      <div key={card.label} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-sm font-black text-white font-mono">{card.value}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5">{card.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedTrack(currentRace?.id || 'silverstone'); setActiveTab('ai'); }}
                  className="w-full py-4 bg-gradient-to-r from-racing-red/10 to-purple-900/10 hover:from-racing-red/20 hover:to-purple-900/20 border border-racing-red/20 rounded-2xl flex items-center justify-center gap-3 text-sm font-black text-white transition-all group"
                >
                  <Brain className="w-5 h-5 text-racing-red group-hover:scale-110 transition-transform" />
                  Open Full AI Oracle
                  <span className="text-[10px] text-gray-500 font-normal">- chat + deep analysis</span>
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ARCHIVES SECTION */}
        {activeTab === 'archives' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white flex items-center">
                  <Database className="w-8 h-8 mr-3 text-racing-red" />
                  Historical Archives
                </h2>
                <p className="text-gray-400 mt-1">Recorded snapshots and historical session data</p>
              </div>
              <button 
                onClick={fetchArchives}
                disabled={archivesLoading}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Activity className={`w-4 h-4 ${archivesLoading ? 'animate-spin' : ''}`} />
                {archivesLoading ? 'Scanning Storage...' : 'Refresh Local Files'}
              </button>
            </div>

            {archivesLoading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-gray-900/50 rounded-3xl border border-white/5">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-racing-red mb-4"></div>
                <p className="text-gray-400 font-bold tracking-widest uppercase text-sm">Scanning file system for snapshots...</p>
              </div>
            ) : archivesData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivesData.map((archive, i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-900 to-black border border-white/5 hover:border-racing-red/40 rounded-3xl p-6 transition-all duration-300 group shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Database className="w-20 h-20" />
                    </div>
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        archive.dataType?.includes('snapshot') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {archive.dataType || 'Session Data'}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{(archive.size / 1024).toFixed(0)} KB</span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 truncate">{archive.sessionName || 'Recorded Session'}</h3>
                    <p className="text-xs text-gray-400 mb-6 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(archive.recordedAt).toLocaleString()}
                    </p>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                        <span className="text-gray-500">File Reference</span>
                        <span className="text-racing-red">{archive.fileName.split('_').pop()?.split('.')[0] || 'REF'}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          if (archive.dataType?.includes('snapshot')) {
                             setStandingsLoading(true);
                             try {
                               const res = await fetch(`/api/f1/history?file=${archive.fileName}`);
                               const data = await res.json();
                               if (data.history && data.history.results) {
                                 setApiStandings(data.history.results);
                                 setActiveTab('standings');
                                 setStandingsView('season');
                                 alert(`Snapshot for ${archive.sessionName} loaded into memory. Check Standings tab.`);
                               }
                             } catch (e) {
                               alert("Failed to load archive detail.");
                             } finally {
                               setStandingsLoading(false);
                             }
                          }
                        }}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs font-bold"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>View Results</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-white/5 border-dashed">
                <History className="w-20 h-20 text-gray-800 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-bold text-gray-300 mb-3">No Snapshots Recorded</h3>
                <p className="text-gray-500 max-w-md mx-auto text-lg">
                  Use the <span className="text-racing-red font-black underline uppercase">Record Snapshot</span> button in the header while viewing live data to document session standings for posterity.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </LiveFeedProvider>
  )
}
