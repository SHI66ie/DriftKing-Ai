import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DRIVE_PROXY_URL = 'https://drive-proxy.blockmusic.workers.dev'
const DRIVE_FOLDER_ID = '1oYgl8SFNEvqpEdqRXsR_cGeRqCjjvpfQ'

const TRACK_FOLDERS: Record<string, string> = {
  'barber': 'barber',
  'cota': 'COTA', 
  'indianapolis': 'indianapolis',
  'road-america': 'road-america',
  'sebring': 'sebring',
  'sonoma': 'sonoma',
  'vir': 'virginia-international-raceway'
}

export async function GET() {
  try {
    console.log('🔍 Verifying all track folders...')
    
    // List main folder
    const response = await fetch(`${DRIVE_PROXY_URL}/list?folderId=${DRIVE_FOLDER_ID}`)
    if (!response.ok) {
      throw new Error(`Worker error: ${response.statusText}`)
    }
    
    const data: any = await response.json()
    const mainFiles = data.files || []
    
    const results: any = {
      workerStatus: 'Connected ✓',
      mainFolderId: DRIVE_FOLDER_ID,
      totalFolders: mainFiles.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder').length,
      tracks: {}
    }
    
    // Check each track folder
    for (const [trackId, folderName] of Object.entries(TRACK_FOLDERS)) {
      const folder = mainFiles.find((f: any) => 
        f.name === folderName && f.mimeType === 'application/vnd.google-apps.folder'
      )
      
      if (folder) {
        // Try to list contents
        try {
          const trackResponse = await fetch(`${DRIVE_PROXY_URL}/list?folderId=${folder.id}`)
          const trackData: any = await trackResponse.json()
          const files = trackData.files || []
          
          // Count file types
          const jsonFiles = files.filter((f: any) => f.name?.endsWith('.json'))
          const csvFiles = files.filter((f: any) => f.name?.endsWith('.csv'))
          
          results.tracks[trackId] = {
            status: '✅ Available',
            folderName,
            folderId: folder.id,
            totalFiles: files.length,
            jsonFiles: jsonFiles.length,
            csvFiles: csvFiles.length,
            sampleFiles: files.slice(0, 5).map((f: any) => f.name)
          }
        } catch (error: any) {
          results.tracks[trackId] = {
            status: '⚠️ Found but cannot list contents',
            folderName,
            folderId: folder.id,
            error: error.message
          }
        }
      } else {
        results.tracks[trackId] = {
          status: '❌ Folder not found',
          expectedName: folderName,
          availableFolders: mainFiles
            .filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
            .map((f: any) => f.name)
        }
      }
    }
    
    console.log('✅ Track verification complete')
    return NextResponse.json(results, { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    })
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error)
    return NextResponse.json({
      error: 'Verification failed',
      message: error.message,
      workerUrl: DRIVE_PROXY_URL
    }, { status: 500 })
  }
}
