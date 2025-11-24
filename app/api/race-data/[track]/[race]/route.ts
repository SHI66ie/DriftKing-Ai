import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchRaceData, isAWSConfigured, getAWSInfo } from '@/lib/aws-data'

// Disable caching for dynamic data
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

// Map track IDs to folder names in the local Data directory
const TRACK_FOLDERS: Record<string, string> = {
  'barber': 'barber',
  // Local folder name uses full circuit name instead of shorthand "COTA"
  'cota': 'circuit-of-the-americas',
  'indianapolis': 'indianapolis',
  'road-america': 'road-america',
  'sebring': 'sebring',
  'sonoma': 'sonoma',
  'vir': 'virginia-international-raceway'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { track: string; race: string } }
) {
  try {
    const { track, race } = params
    const trackFolder = TRACK_FOLDERS[track] || track
    const dataDir = path.join(process.cwd(), 'Data', trackFolder)

    console.log(`Loading race data for ${track} - ${race}`)

    // Check if we should use AWS or local data
    const awsConfigured = isAWSConfigured()
    
    if (!awsConfigured && !fs.existsSync(dataDir)) {
      return NextResponse.json({ 
        error: 'Data not found',
        message: process.env.NODE_ENV === 'production' 
          ? 'Local data is not available in production. This feature requires local development environment.'
          : 'Please download the data from Google Drive and place it in the Data/ folder',
        link: process.env.NODE_ENV === 'production' 
          ? null 
          : 'https://drive.google.com/drive/folders/1AvpoKZzY7CVtcSBX8wA7Oq8JfAWo-oou?usp=sharing'
      }, { status: 404 })
    }
    
    if (awsConfigured) {
      console.log(`🌐 Using AWS CloudFront for race data: ${getAWSInfo().domain}`)
    } else {
      console.log(`📂 Using local filesystem for race data`)
    }

    // Helper function to load data from AWS or local filesystem
    const loadDataFile = async (filename: string): Promise<any> => {
      if (awsConfigured) {
        return await fetchRaceData(trackFolder, filename)
      } else {
        const filePath = path.join(dataDir, filename)
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        }
        return null
      }
    }

    // Get available files for fallback search (local only)
    const allFiles = !awsConfigured && fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : []

    // Load race results - try common file patterns first
    const raceNum = race.slice(1) // "R1" -> "1"
    const raceFiles = awsConfigured
      ? [
          // In AWS we expect a consistent naming scheme; keep patterns minimal
          `03_Results GR Cup Race ${raceNum} Official_Anonymized.json`,
          `${race}_${track}_race_results.json`
        ]
      : [
          // Local dev: be more forgiving and try many historical variants
          `03_Results GR Cup Race ${raceNum} Official_Anonymized.json`,
          `03_Results GR Cup Race ${raceNum} Official1_Anonymized.json`,
          `03_GR Cup Race ${raceNum} Official Results.json`,
          `00_Results GR Race ${raceNum} Official_Anonymized.json`,
          `00_Results GR Cup Race ${raceNum} Official_Anonymized.json`,
          `03_Provisional Results_Race ${raceNum}_Anonymized.json`,
          `03_Provisional Results_Race ${raceNum}.json`,
          `03_Provisional_Results_Race ${raceNum}_Anonymized.json`,
          `${race}_${track}_race_results.json`
        ]

    let raceResults = null
    for (const file of raceFiles) {
      raceResults = await loadDataFile(file)
      if (raceResults) {
        console.log(`✓ Loaded race results from: ${file}`)
        break
      }
    }

    // Fallback: fuzzy search for any results file mentioning this race (local only)
    if (!raceResults && !awsConfigured) {
      const raceKeyword = `race ${raceNum}`
      const candidate = allFiles.find(f => {
        const name = f.toLowerCase()
        return name.endsWith('.json') &&
          name.includes('result') &&
          (name.includes(raceKeyword) || (!name.includes('race') && raceNum === '1'))
      })

      if (candidate) {
        raceResults = await loadDataFile(candidate)
        if (raceResults) {
          console.log(`✓ Loaded race results from fallback: ${candidate}`)
        }
      }
    }

    if (!raceResults) {
      console.warn('⚠️ No race results file found for', track, race)
    }

    // Load lap times (exact pattern first)
    const lapTimeFile = `${race}_${track}_lap_time.json`
    let lapTimes = await loadDataFile(lapTimeFile)
    if (lapTimes) {
      console.log(`✓ Loaded lap times from: ${lapTimeFile} (${lapTimes.length} entries)`)      
    } else {
      // Fallback: search for any lap_time file starting with race ID (local only)
      if (!awsConfigured) {
        const lapCandidate = allFiles.find(f => {
          const name = f.toLowerCase()
          return name.endsWith('.json') &&
            name.startsWith(race.toLowerCase()) &&
            name.includes('lap_time')
        })

        if (lapCandidate) {
          lapTimes = await loadDataFile(lapCandidate)
          if (lapTimes) {
            console.log(`✓ Loaded lap times from fallback: ${lapCandidate} (${lapTimes.length} entries)`)        
          }
        }
      }
    }

    // Load weather data
    const weatherFiles = awsConfigured
      ? [
          `26_Weather_Race ${raceNum}_Anonymized.json`,
          `${race}_${track}_weather.json`
        ]
      : [
          `26_Weather_Race ${raceNum}_Anonymized.json`,
          `26_Weather_Race ${raceNum}.json`,
          `26_Weather_ Race ${raceNum}_Anonymized.json`,
          `${race}_${track}_weather.json`
        ]
    let weather = null
    for (const file of weatherFiles) {
      weather = await loadDataFile(file)
      if (weather) {
        console.log(`✓ Loaded weather data from: ${file}`)
        break
      }
    }

    // Fallback: search for any weather file mentioning this race (local only)
    if (!weather && !awsConfigured) {
      const raceKeyword = `race ${raceNum}`
      const candidate = allFiles.find(f => {
        const name = f.toLowerCase()
        return name.endsWith('.json') &&
          name.includes('weather') &&
          (name.includes(raceKeyword) || (!name.includes('race') && raceNum === '1'))
      })

      if (candidate) {
        weather = await loadDataFile(candidate)
        if (weather) {
          console.log(`✓ Loaded weather data from fallback: ${candidate}`)
        }
      }
    }

    if (!weather) {
      console.warn('⚠️ No weather file found for', track, race)
    }

    // Check for telemetry data
    const telemetryIndexFile = `${race}_${track}_telemetry_data_index.json`
    let telemetry: any = { available: false }

    // Prefer chunked telemetry when an index is available
    const telemetryInfo = await loadDataFile(telemetryIndexFile)
    if (telemetryInfo) {
      telemetry = {
        available: true,
        type: 'chunked',
        totalRows: telemetryInfo.totalRows,
        totalChunks: telemetryInfo.totalChunks,
        chunkSize: telemetryInfo.chunkSize
      }
      console.log(`Telemetry available (chunked): ${telemetry.totalRows} rows in ${telemetry.totalChunks} chunks`)
    } else {
      // Fallback: detect single-file telemetry JSONs (local only for now)
      if (!awsConfigured) {
        const telemetryCandidate = allFiles.find(f => {
          const name = f.toLowerCase()
          return name.endsWith('.json') && name.includes('telemetry')
        })

        if (telemetryCandidate) {
          telemetry = {
            available: true,
            type: 'single-file',
            fileName: telemetryCandidate
          }
          console.log(`Telemetry available (single-file): ${telemetryCandidate}`)
        } else {
          console.log('No telemetry file detected for', track, race)
        }
      } else {
        // For AWS, try common telemetry file patterns
        const telemetryCandidates = [
          `${race}_${track}_telemetry_data.json`,
          `${race}_${track}_telemetry.json`,
          `${track}_telemetry_data.json`
        ]
        
        for (const candidate of telemetryCandidates) {
          const testInfo = await loadDataFile(candidate)
          if (testInfo) {
            telemetry = {
              available: true,
              type: 'single-file',
              fileName: candidate
            }
            console.log(`Telemetry available (single-file): ${candidate}`)
            break
          }
        }
        
        if (!telemetry.available) {
          console.log('No telemetry file detected for', track, race)
        }
      }
    }

    const dataSource = awsConfigured ? 'aws' : 'local'

    return NextResponse.json({
      track,
      race,
      raceResults,
      lapTimes,
      weather,
      telemetry,
      dataSource
    })

  } catch (error) {
    console.error('Error loading race data:', error)
    return NextResponse.json(
      { error: 'Failed to load data', details: String(error) },
      { status: 500 }
    )
  }
}
