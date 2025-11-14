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
    
    // Add 3-second timeout for faster response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
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
    let trackFiles = await listGoogleDriveFiles(trackFolderItem.id)
    
    // Check if we need to go one level deeper (nested folder structure)
    const hasJsonFiles = trackFiles.some(f => f.name?.endsWith('.json'))
    if (!hasJsonFiles) {
      console.log(`📂 No JSON files found directly, checking for nested folders...`)
      
      // First, try to find a race-specific folder (e.g., "Race 1b", "Race 2b" for COTA)
      const raceNum = race.slice(1) // "R1" -> "1"
      const raceSpecificFolder = trackFiles.find(f => 
        f.mimeType === 'application/vnd.google-apps.folder' && 
        f.name.toLowerCase().includes(`race ${raceNum}`)
      )
      
      if (raceSpecificFolder) {
        console.log(`📁 Found race-specific folder: ${raceSpecificFolder.name}`)
        trackFiles = await listGoogleDriveFiles(raceSpecificFolder.id)
      } else {
        // Otherwise, look for a subfolder with similar name to track
        const nestedFolder = trackFiles.find(f => 
          f.mimeType === 'application/vnd.google-apps.folder' && 
          (f.name.toLowerCase().includes(trackFolder.toLowerCase()) || 
           f.name.toLowerCase() === trackFolder.toLowerCase())
        )
        
        if (nestedFolder) {
          console.log(`📁 Found nested folder: ${nestedFolder.name}`)
          trackFiles = await listGoogleDriveFiles(nestedFolder.id)
        } else {
          console.log(`⚠️ Available items in folder:`, trackFiles.map(f => ({ name: f.name, type: f.mimeType })))
        }
      }
    }
    
    // Find race results (flexible search) - Return metadata only
    const raceNum = race.slice(1) // "R1" -> "1"
    let raceResultsFile = null
    
    // Try multiple naming patterns
    const resultKeywords = [
      `GR Cup Race ${raceNum} Official`,
      `Race ${raceNum} Official Results`,
      `Results GR Cup Race ${raceNum}`,
      `Provisional Results_Race ${raceNum}`,
      `race ${raceNum}` // Fallback for simple patterns
    ]
    
    for (const keyword of resultKeywords) {
      const file = trackFiles.find(f => 
        f.name?.toLowerCase().includes(keyword.toLowerCase()) && 
        f.name?.endsWith('.json')
      )
      if (file) {
        raceResultsFile = {
          name: file.name,
          id: file.id,
          downloadUrl: `/api/download/${file.id}` // Use Next.js proxy to avoid CORS
        }
        console.log(`✓ Found race results file: ${file.name}`)
        break
      }
    }

    // Find lap times (flexible search) - Return metadata only
    let lapTimesFile = null
    const lapKeywords = [`${race}_${track}_lap`, `${race.toLowerCase()}_`, `lap_end`, `lap_time`]
    
    for (const keyword of lapKeywords) {
      const file = trackFiles.find(f => 
        f.name?.toLowerCase().includes(keyword.toLowerCase()) &&
        f.name?.toLowerCase().includes('lap') &&
        f.name?.endsWith('.json')
      )
      if (file) {
        lapTimesFile = {
          name: file.name,
          id: file.id,
          downloadUrl: `/api/download/${file.id}` // Use Next.js proxy to avoid CORS
        }
        console.log(`✓ Found lap times file: ${file.name}`)
        break
      }
    }

    // Find weather data (flexible search) - Return metadata only
    let weatherFile = null
    const weatherFileMatch = trackFiles.find(f => 
      f.name?.toLowerCase().includes('weather') &&
      (f.name?.toLowerCase().includes(`race ${raceNum}`) || f.name?.toLowerCase().includes(race.toLowerCase())) &&
      f.name?.endsWith('.json')
    )
    
    if (weatherFileMatch) {
      weatherFile = {
        name: weatherFileMatch.name,
        id: weatherFileMatch.id,
        downloadUrl: `/api/download/${weatherFileMatch.id}` // Use Next.js proxy to avoid CORS
      }
      console.log(`✓ Found weather data file: ${weatherFileMatch.name}`)
    }

    // Find telemetry index - Return metadata only
    let telemetryFile = null
    const telemetryIndexFileMatch = trackFiles.find(f => f.name === `${race}_${track}_telemetry_data_index.json`)
    if (telemetryIndexFileMatch) {
      telemetryFile = {
        name: telemetryIndexFileMatch.name,
        id: telemetryIndexFileMatch.id,
        downloadUrl: `/api/download/${telemetryIndexFileMatch.id}` // Use Next.js proxy to avoid CORS
      }
      console.log(`✓ Found telemetry index file: ${telemetryIndexFileMatch.name}`)
    }

    // Find PDF files for enhanced analysis
    const pdfFiles = trackFiles.filter(f => f.name?.toLowerCase().endsWith('.pdf'))
    console.log(`📄 Found ${pdfFiles.length} PDF files for analysis:`, pdfFiles.map(f => f.name))

    return NextResponse.json({
      track,
      race,
      source: 'Google Drive',
      files: {
        raceResults: raceResultsFile,
        lapTimes: lapTimesFile,
        weather: weatherFile,
        telemetry: telemetryFile
      },
      pdfDocuments: pdfFiles.map(f => ({
        name: f.name,
        size: f.size,
        id: f.id,
        downloadUrl: `/api/download/${f.id}` // Use Next.js proxy to avoid CORS
      })),
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
