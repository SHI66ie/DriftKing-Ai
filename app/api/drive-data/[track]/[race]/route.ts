import { NextRequest, NextResponse } from 'next/server'

// Disable caching for dynamic data
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

// Cloudflare Worker proxy URL (update if different)
const DRIVE_PROXY_URL = 'https://drive-proxy.blockmusic.workers.dev'
// Use the 'json' folder ID which contains the track folders
const DRIVE_FOLDER_ID = '1oYgl8SFNEvqpEdqRXsR_cGeRqCjjvpfQ'

// Map track names to their folder names in Google Drive
const TRACK_FOLDERS: Record<string, string> = {
  'barber': 'barber',
  'cota': 'COTA', 
  'indianapolis': 'indianapolis',
  'road-america': 'road-america',
  'sebring': 'sebring',
  'sonoma': 'sonoma',
  'vir': 'virginia-international-raceway'
}

// Cache for Google Drive file listings
const driveCache = new Map<string, any[]>()

async function listGoogleDriveFiles(folderId: string): Promise<any[]> {
  if (driveCache.has(folderId)) {
    console.log(`📦 Cache hit for folder: ${folderId}`)
    return driveCache.get(folderId)!
  }

  try {
    // Use Cloudflare Worker proxy to list files
    const url = `${DRIVE_PROXY_URL}/list?folderId=${folderId}`
    console.log(`🔍 Fetching from worker: ${url}`)
    
    // Add 8-second timeout to prevent serverless function timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    console.log(`📡 Worker response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Worker error response: ${errorText}`)
      throw new Error(`Drive proxy error: ${response.statusText} - ${errorText}`)
    }

    const data: any = await response.json()
    console.log(`📂 Worker returned ${data.files?.length || 0} items for folder ${folderId}`)
    console.log(`📋 Items:`, JSON.stringify(data.files?.map((f: any) => ({ name: f.name, type: f.mimeType })) || [], null, 2))
    
    driveCache.set(folderId, data.files || [])
    return data.files || []
  } catch (error) {
    console.error('❌ Error listing Google Drive files:', error)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    throw error // Propagate the error instead of returning empty array
  }
}

async function downloadGoogleDriveFile(fileId: string): Promise<string | null> {
  try {
    const response = await fetch(`${DRIVE_PROXY_URL}/download/${fileId}`)

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error('Error downloading Google Drive file:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { track: string; race: string } }
) {
  try {
    const { track, race } = params
    
    console.log(`🌐 API Route Called: /api/drive-data/${track}/${race}`)
    console.log(`📍 Cloudflare Worker URL: ${DRIVE_PROXY_URL}`)
    console.log(`📁 Drive Folder ID: ${DRIVE_FOLDER_ID}`)
    
    const trackFolder = TRACK_FOLDERS[track] || track
    console.log(`🗂️ Track folder mapping: ${track} -> ${trackFolder}`)

    // List files in the main folder to find track subfolder
    const mainFiles = await listGoogleDriveFiles(DRIVE_FOLDER_ID)
    const trackFolderItem = mainFiles.find(file => 
      file.name === trackFolder && file.mimeType === 'application/vnd.google-apps.folder'
    )

    if (!trackFolderItem) {
      return NextResponse.json({
        error: 'Track folder not found',
        track: trackFolder,
        availableFolders: mainFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(f => f.name)
      }, { status: 404 })
    }

    // List files in the track folder
    const trackFiles = await listGoogleDriveFiles(trackFolderItem.id)
    
    // Find race results
    const raceNum = race.slice(1) // "R1" -> "1"
    const raceResultPatterns = [
      `03_Results GR Cup Race ${raceNum} Official_Anonymized.json`,
      `03_Provisional Results_Race ${raceNum}_Anonymized.json`,
      `05_Results by Class GR Cup Race ${raceNum} Official_Anonymized.json`
    ]
    
    let raceResults = null
    for (const pattern of raceResultPatterns) {
      const file = trackFiles.find(f => f.name === pattern)
      if (file) {
        const content = await downloadGoogleDriveFile(file.id)
        if (content) {
          raceResults = JSON.parse(content)
          console.log(`✓ Loaded race results from Google Drive: ${pattern}`)
          break
        }
      }
    }

    // Find lap times
    const lapTimeFile = trackFiles.find(f => f.name === `${race}_${track}_lap_time.json`)
    let lapTimes = null
    if (lapTimeFile) {
      const content = await downloadGoogleDriveFile(lapTimeFile.id)
      if (content) {
        lapTimes = JSON.parse(content)
        console.log(`✓ Loaded lap times from Google Drive: ${lapTimes.length} entries`)
      }
    }

    // Find weather data
    const weatherPatterns = [
      `26_Weather_Race ${raceNum}_Anonymized.json`,
      `${race}_${track}_weather.json`
    ]
    
    let weather = null
    for (const pattern of weatherPatterns) {
      const file = trackFiles.find(f => f.name === pattern)
      if (file) {
        const content = await downloadGoogleDriveFile(file.id)
        if (content) {
          weather = JSON.parse(content)
          console.log(`✓ Loaded weather data from Google Drive: ${pattern}`)
          break
        }
      }
    }

    // Find telemetry index
    const telemetryIndexFile = trackFiles.find(f => f.name === `${race}_${track}_telemetry_data_index.json`)
    let telemetryInfo = null
    if (telemetryIndexFile) {
      const content = await downloadGoogleDriveFile(telemetryIndexFile.id)
      if (content) {
        telemetryInfo = JSON.parse(content)
        console.log(`✓ Telemetry available from Google Drive: ${telemetryInfo.totalRows} rows in ${telemetryInfo.totalChunks} chunks`)
      }
    }

    return NextResponse.json({
      track,
      race,
      source: 'Google Drive',
      raceResults,
      lapTimes,
      weather,
      telemetry: telemetryInfo ? {
        available: true,
        totalRows: telemetryInfo.totalRows,
        totalChunks: telemetryInfo.totalChunks,
        chunkSize: telemetryInfo.chunkSize,
        source: 'Google Drive'
      } : { available: false },
      availableFiles: trackFiles.map(f => ({ name: f.name, size: f.size }))
    })

  } catch (error: any) {
    console.error('❌ Error in drive-data API route:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to load data from Google Drive',
        message: error?.message || String(error),
        workerUrl: DRIVE_PROXY_URL,
        folderId: DRIVE_FOLDER_ID,
        hint: 'Check if Cloudflare Worker is deployed and accessible'
      },
      { status: 500 }
    )
  }
}
