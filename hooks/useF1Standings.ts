'use client'

import { useState, useEffect } from 'react'

interface Driver {
  position: number
  driver: string
  driverCode: string
  team: string
  teamColor?: string
  nationality: string
  countryFlag: string
  points: number
  wins: number
  podiums: number
  image?: string
}

interface Constructor {
  position: number
  team: string
  teamColor?: string
  nationality: string
  countryFlag: string
  points: number
  wins: number
  podiums: number
  drivers: string[]
}

interface StandingsResponse {
  success: boolean
  season: string
  type: 'drivers' | 'constructors'
  lastUpdated: string
  standings: Driver[] | Constructor[]
  totalDrivers?: number
  totalTeams?: number
  error?: string
  message?: string
  source?: string
}

export function useF1Standings(season: string = '2025') {
  const [driverStandings, setDriverStandings] = useState<Driver[]>([])
  const [constructorStandings, setConstructorStandings] = useState<Constructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [actualSeason, setActualSeason] = useState<string>(season)
  const [dataNote, setDataNote] = useState<string>('')
  const [isLiveData, setIsLiveData] = useState<boolean>(false)

  const fetchStandings = async (targetSeason: string, isRetry = false) => {
    try {
      setLoading(true)
      if (!isRetry) {
        setError(null)
        setDataNote('')
      }

      const driverResponse = await fetch(`/api/f1/standings?season=${targetSeason}&type=drivers`)
      if (!driverResponse.ok) throw new Error('Driver standings fetch failed')
      
      const driverData: StandingsResponse = await driverResponse.json()
      if (!driverData.success) throw new Error(driverData.error || 'Driver standings error')

      const constructorResponse = await fetch(`/api/f1/standings?season=${targetSeason}&type=constructors`)
      if (!constructorResponse.ok) throw new Error('Constructor standings fetch failed')
      
      const constructorData: StandingsResponse = await constructorResponse.json()
      if (!constructorData.success) throw new Error(constructorData.error || 'Constructor standings error')

      // Success path - real data
      setDriverStandings(driverData.standings as Driver[])
      setConstructorStandings(constructorData.standings as Constructor[])
      setLastUpdated(driverData.lastUpdated)
      setActualSeason(targetSeason)
      setIsLiveData(true)

      if (targetSeason !== season) {
        setDataNote(`Showing ${targetSeason} data — ${season} standings not yet available`)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useF1Standings] Error:', errorMessage)

      // Auto fallback for future seasons
      if (!isRetry && (targetSeason === '2026' || targetSeason === '2025')) {
        console.log('[useF1Standings] Falling back to 2024 for real data')
        return fetchStandings('2024', true)
      }

      // Only use mock as absolute last resort
      setError(errorMessage)
      setIsLiveData(false)
      setDataNote('Using demo data — live API unavailable')
      
      setDriverStandings([
        { position: 1, driver: 'Max Verstappen', driverCode: 'VER', team: 'Red Bull', teamColor: '#1E41FF', nationality: 'Netherlands', countryFlag: '🇳🇱', points: 437, wins: 9, podiums: 14 },
        { position: 2, driver: 'Lando Norris', driverCode: 'NOR', team: 'McLaren', teamColor: '#FF8700', nationality: 'United Kingdom', countryFlag: '🇬🇧', points: 374, wins: 3, podiums: 12 },
        { position: 3, driver: 'Charles Leclerc', driverCode: 'LEC', team: 'Ferrari', teamColor: '#DC143C', nationality: 'Monaco', countryFlag: '🇲🇨', points: 356, wins: 3, podiums: 11 },
      ])
      setConstructorStandings([
        { position: 1, team: 'McLaren', teamColor: '#FF8700', nationality: 'United Kingdom', countryFlag: '🇬🇧', points: 666, wins: 5, podiums: 20, drivers: ['L. Norris', 'O. Piastri'] },
        { position: 2, team: 'Ferrari', teamColor: '#DC143C', nationality: 'Italy', countryFlag: '🇮🇹', points: 652, wins: 5, podiums: 19, drivers: ['C. Leclerc', 'C. Sainz'] },
      ])
      setLastUpdated(new Date().toISOString())
      setActualSeason(targetSeason)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings(season)
  }, [season])

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStandings(actualSeason || season)
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [actualSeason, season])

  return {
    driverStandings,
    constructorStandings,
    loading,
    error,
    lastUpdated,
    actualSeason,
    dataNote,
    isLiveData,
    refetch: () => fetchStandings(actualSeason || season)
  }
}

export function getTopDrivers(drivers: Driver[], count: number = 10): Driver[] {
  return [...drivers].sort((a, b) => a.position - b.position).slice(0, count)
}

export function getTopConstructors(constructors: Constructor[], count: number = 10): Constructor[] {
  return [...constructors].sort((a, b) => a.position - b.position).slice(0, count)
}

export function findDriverByPosition(drivers: Driver[], position: number): Driver | undefined {
  return drivers.find(driver => driver.position === position)
}

export function findConstructorByPosition(constructors: Constructor[], position: number): Constructor | undefined {
  return constructors.find(constructor => constructor.position === position)
}