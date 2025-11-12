import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'

// Disable Next.js caching for this route (ZIPs are too large)
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Map track names to their ZIP URLs
const TRACK_ZIP_URLS: Record<string, string> = {
  'barber': 'https://trddev.com/hackathon-2025/barber-motorsports-park.zip',
  'COTA': 'https://trddev.com/hackathon-2025/circuit-of-the-americas.zip',
  'cota': 'https://trddev.com/hackathon-2025/circuit-of-the-americas.zip',
  'indianapolis': 'https://trddev.com/hackathon-2025/indianapolis.zip',
  'road-america': 'https://trddev.com/hackathon-2025/road-america.zip',
  'sebring': 'https://trddev.com/hackathon-2025/sebring.zip',
  'Sonoma': 'https://trddev.com/hackathon-2025/sonoma.zip',
  'sonoma': 'https://trddev.com/hackathon-2025/sonoma.zip',
  'virginia-international-raceway': 'https://trddev.com/hackathon-2025/virginia-international-raceway.zip',
  'vir': 'https://trddev.com/hackathon-2025/virginia-international-raceway.zip'
}

// In-memory cache for extracted ZIP contents
const zipCache = new Map<string, Map<string, string>>()

async function getFileFromZip(track: string, filePath: string): Promise<string | null> {
  // Check cache first
  if (zipCache.has(track)) {
    const trackCache = zipCache.get(track)!
    if (trackCache.has(filePath)) {
      console.log(`Cache hit for ${track}/${filePath}`)
      return trackCache.get(filePath)!
    }
  }

  // Fetch and extract ZIP if not cached
  const zipUrl = TRACK_ZIP_URLS[track]
  if (!zipUrl) {
    console.error(`No ZIP URL found for track: ${track}`)
    return null
  }

  try {
    console.log(`Fetching ZIP from ${zipUrl}...`)
    const response = await fetch(zipUrl)
    if (!response.ok) {
      console.error(`Failed to fetch ZIP: ${response.statusText}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const zip = new AdmZip(buffer)
    
    // Extract all files and cache them
    const trackCache = new Map<string, string>()
    const entries = zip.getEntries()
    
    console.log(`Extracting ${entries.length} entries from ZIP...`)
    
    for (const entry of entries) {
      if (!entry.isDirectory && (entry.entryName.endsWith('.csv') || entry.entryName.endsWith('.CSV'))) {
        const content = entry.getData().toString('utf8')
        // Store with both original path and normalized path
        trackCache.set(entry.entryName, content)
        // Also store with normalized slashes (ZIP uses forward slashes)
        const normalizedPath = entry.entryName.replace(/\\/g, '/')
        if (normalizedPath !== entry.entryName) {
          trackCache.set(normalizedPath, content)
        }
      }
    }
    
    zipCache.set(track, trackCache)
    console.log(`Cached ${trackCache.size} CSV files for ${track}`)
    console.log('Sample file paths:', Array.from(trackCache.keys()).slice(0, 5))
    
    return trackCache.get(filePath) || null
  } catch (error) {
    console.error(`Error processing ZIP for ${track}:`, error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Extract track name and file path from params
    // Expected format: /api/data/[track]/[...file-path]
    const [track, ...filePathParts] = params.path
    
    if (!track || filePathParts.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    console.log(`Requested: track=${track}, path=${filePathParts.join('/')}`)

    // Construct the file path within the ZIP
    // The ZIPs may contain files like "barber/R1_barber_lap_time.csv" or "COTA/Race 1/..."
    const filePath = filePathParts.join('/')
    
    // Try multiple path patterns to find the file
    const pathsToTry = [
      filePath,                           // Direct path: "Race 1/file.csv"
      `${track}/${filePath}`,            // With track prefix: "COTA/Race 1/file.csv"
      `${track.toUpperCase()}/${filePath}`, // With uppercase track: "COTA/Race 1/file.csv"
      filePath.replace(/\//g, '\\'),     // Windows-style paths
      `${track}/${filePath}`.replace(/\//g, '\\')
    ]
    
    for (const pathToTry of pathsToTry) {
      const fileContent = await getFileFromZip(track, pathToTry)
      if (fileContent) {
        console.log(`Found file at path: ${pathToTry}`)
        return new NextResponse(fileContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
    }
    
    console.error(`File not found. Tried paths:`, pathsToTry)
    return NextResponse.json({ 
      error: 'File not found',
      track,
      requestedPath: filePath,
      triedPaths: pathsToTry
    }, { status: 404 })
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) }, 
      { status: 500 }
    )
  }
}
