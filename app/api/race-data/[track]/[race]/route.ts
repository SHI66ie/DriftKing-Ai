import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Disable caching
export const dynamic = 'force-dynamic'

// Map track IDs to folder names
const TRACK_FOLDERS: Record<string, string> = {
  'barber': 'barber',
  'cota': 'COTA',
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
    
    // Check if Data directory exists
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ 
        error: 'Data not found',
        message: 'Please download the data from Google Drive and place it in the Data/ folder',
        link: 'https://drive.google.com/drive/folders/1AvpoKZzY7CVtcSBX8wA7Oq8JfAWo-oou?usp=sharing'
      }, { status: 404 })
    }

    // Load race results - try multiple file patterns
    const raceNum = race.slice(1) // "R1" -> "1"
    const raceFiles = [
      `03_Results GR Cup Race ${raceNum} Official_Anonymized.json`,
      `03_Provisional Results_Race ${raceNum}_Anonymized.json`,
      `05_Results by Class GR Cup Race ${raceNum} Official_Anonymized.json`,
      `${race}_${track}_race_results.json`
    ]
    
    let raceResults = null
    for (const file of raceFiles) {
      const filePath = path.join(dataDir, file)
      if (fs.existsSync(filePath)) {
        raceResults = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        console.log(`✓ Loaded race results from: ${file}`)
        break
      }
    }

    // Load lap times
    const lapTimeFile = path.join(dataDir, `${race}_${track}_lap_time.json`)
    let lapTimes = null
    if (fs.existsSync(lapTimeFile)) {
      lapTimes = JSON.parse(fs.readFileSync(lapTimeFile, 'utf-8'))
      console.log(`✓ Loaded lap times: ${lapTimes.length} entries`)
    }

    // Load weather data
    const weatherFiles = [
      `26_Weather_Race ${raceNum}_Anonymized.json`,
      `${race}_${track}_weather.json`
    ]
    let weather = null
    for (const file of weatherFiles) {
      const filePath = path.join(dataDir, file)
      if (fs.existsSync(filePath)) {
        weather = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        console.log(`✓ Loaded weather data from: ${file}`)
        break
      }
    }

    // Check for telemetry index
    const telemetryIndexFile = path.join(dataDir, `${race}_${track}_telemetry_data_index.json`)
    let telemetryInfo = null
    if (fs.existsSync(telemetryIndexFile)) {
      telemetryInfo = JSON.parse(fs.readFileSync(telemetryIndexFile, 'utf-8'))
      console.log(`Telemetry available: ${telemetryInfo.totalRows} rows in ${telemetryInfo.totalChunks} chunks`)
    }

    return NextResponse.json({
      track,
      race,
      raceResults,
      lapTimes,
      weather,
      telemetry: telemetryInfo ? {
        available: true,
        totalRows: telemetryInfo.totalRows,
        totalChunks: telemetryInfo.totalChunks,
        chunkSize: telemetryInfo.chunkSize
      } : { available: false }
    })

  } catch (error) {
    console.error('Error loading race data:', error)
    return NextResponse.json(
      { error: 'Failed to load data', details: String(error) },
      { status: 500 }
    )
  }
}
