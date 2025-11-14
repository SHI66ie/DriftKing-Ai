import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DRIVE_PROXY_URL = 'https://drive-proxy.blockmusic.workers.dev'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    
    console.log(`📥 Proxying download for file: ${fileId}`)
    
    // Fetch from Cloudflare Worker
    const response = await fetch(`${DRIVE_PROXY_URL}/download/${fileId}`, {
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}: ${response.statusText}`)
    }
    
    // Get the file content
    const content = await response.text()
    
    console.log(`✅ Downloaded file ${fileId} (${content.length} bytes)`)
    
    // Return with CORS headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
    
  } catch (error: any) {
    console.error('❌ Download proxy error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download file',
        message: error.message
      },
      { status: 500 }
    )
  }
}
