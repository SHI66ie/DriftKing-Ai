import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const track = searchParams.get('track') || 'barber'
  
  const TRACK_ZIP_URLS: Record<string, string> = {
    'barber': 'https://trddev.com/hackathon-2025/barber-motorsports-park.zip',
    'COTA': 'https://trddev.com/hackathon-2025/circuit-of-the-americas.zip',
    'cota': 'https://trddev.com/hackathon-2025/circuit-of-the-americas.zip',
  }

  const zipUrl = TRACK_ZIP_URLS[track]
  
  if (!zipUrl) {
    return NextResponse.json({ 
      success: false, 
      error: `Unknown track: ${track}`,
      availableTracks: Object.keys(TRACK_ZIP_URLS)
    })
  }

  try {
    console.log(`Testing fetch from: ${zipUrl}`)
    const response = await fetch(zipUrl, {
      headers: {
        'User-Agent': 'KobayashiAI/1.0'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: zipUrl,
        headers: Object.fromEntries(response.headers.entries())
      })
    }

    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type')
    
    // Don't actually download the full ZIP, just check headers
    return NextResponse.json({
      success: true,
      message: 'ZIP URL is accessible',
      url: zipUrl,
      contentLength: contentLength ? parseInt(contentLength) : 'unknown',
      contentType,
      sizeInMB: contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : 'unknown'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      url: zipUrl,
      message: 'Failed to fetch ZIP file from trddev.com'
    })
  }
}
