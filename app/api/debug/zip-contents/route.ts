import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const track = searchParams.get('track') || 'barber'
  
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

  const zipUrl = TRACK_ZIP_URLS[track]
  if (!zipUrl) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  try {
    console.log(`Fetching ZIP from ${zipUrl}...`)
    const response = await fetch(zipUrl)
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch ZIP: ${response.statusText}` }, { status: 500 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const zip = new AdmZip(buffer)
    
    const entries = zip.getEntries()
    const files = entries
      .filter(entry => !entry.isDirectory)
      .map(entry => ({
        name: entry.entryName,
        size: entry.header.size,
        isCSV: entry.entryName.endsWith('.csv') || entry.entryName.endsWith('.CSV')
      }))
    
    return NextResponse.json({
      track,
      zipUrl,
      totalFiles: files.length,
      csvFiles: files.filter(f => f.isCSV).length,
      files: files.slice(0, 50) // Limit to first 50 files
    })
  } catch (error) {
    console.error(`Error processing ZIP:`, error)
    return NextResponse.json({ error: 'Failed to process ZIP' }, { status: 500 })
  }
}
