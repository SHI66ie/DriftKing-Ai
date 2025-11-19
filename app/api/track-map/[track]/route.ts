import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { isAWSConfigured, getAWSInfo } from '@/lib/aws-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Map track IDs to folder names to match S3/local structure
const TRACK_FOLDERS: Record<string, string> = {
  'barber': 'barber',
  'cota': 'circuit-of-the-americas',
  'indianapolis': 'indianapolis',
  'road-america': 'road-america',
  'sebring': 'sebring',
  'sonoma': 'sonoma',
  'vir': 'virginia-international-raceway'
}

// Map track IDs to possible PDF filenames
const TRACK_PDF_CANDIDATES: Record<string, string[]> = {
  barber: ['Barber_Circuit_Map.pdf', 'barber_circuit_map.pdf'],
  cota: ['COTA_Circuit_Map.pdf', 'cota_circuit_map.pdf', 'Circuit_of_the_Americas_Circuit_Map.pdf'],
  indianapolis: ['Indianapolis_Circuit_Map.pdf', 'indianapolis_circuit_map.pdf'],
  'road-america': ['Road_America_Circuit_Map.pdf', 'road_america_circuit_map.pdf'],
  sebring: ['Sebring_Circuit_Map.pdf', 'sebring_circuit_map.pdf'],
  sonoma: ['Sonoma_Circuit_Map.pdf', 'sonoma_circuit_map.pdf'],
  vir: ['VIR_Circuit_Map.pdf', 'vir_circuit_map.pdf', 'Virginia_International_Raceway_Circuit_Map.pdf']
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { track: string } }
) {
  try {
    const { track } = params
    const awsConfigured = isAWSConfigured()
    
    if (awsConfigured) {
      console.log(`🌐 Using AWS CloudFront for track map: ${getAWSInfo().domain}`)
    } else {
      console.log(`📂 Using local filesystem for track map`)
    }
    
    const dataRoot = path.join(process.cwd(), 'Data')

    if (!awsConfigured && !fs.existsSync(dataRoot)) {
      return new NextResponse('Data folder not found', { status: 404 })
    }

    const trackFolder = TRACK_FOLDERS[track] || track
    const candidates = TRACK_PDF_CANDIDATES[track] || []
    
    if (awsConfigured) {
      // AWS: Try to fetch PDF from CloudFront
      const cloudFrontDomain = getAWSInfo().domain
      
      // Try mapped candidate filenames first
      for (const name of candidates) {
        const url = `https://${cloudFrontDomain}/${trackFolder}/${name}`
        try {
          const response = await fetch(url)
          if (response.ok) {
            console.log(`✓ Found track map at: ${url}`)
            const pdfBuffer = await response.arrayBuffer()
            
            return new NextResponse(pdfBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${name}"`
              }
            })
          }
        } catch (error) {
          console.log(`❌ Failed to fetch ${name}:`, error)
        }
      }
      
      // If no candidate found, return 404
      return new NextResponse('Track map PDF not found on AWS', { status: 404 })
    } else {
      // Local: Use existing filesystem logic
      const trackFolder = path.join(dataRoot, track)
      const searchPaths: string[] = []

      // 1) Track-specific folder
      if (fs.existsSync(trackFolder) && fs.statSync(trackFolder).isDirectory()) {
        searchPaths.push(trackFolder)
      }

      // 2) Data root as fallback
      searchPaths.push(dataRoot)

      let pdfPath: string | null = null

      // Try mapped candidate filenames first
      for (const baseDir of searchPaths) {
        for (const name of candidates) {
          const fullPath = path.join(baseDir, name)
          if (fs.existsSync(fullPath)) {
            pdfPath = fullPath
            break
          }
        }
        if (pdfPath) break
      }

      // Final fallback: first PDF that contains track id in its name
      if (!pdfPath) {
        for (const baseDir of searchPaths) {
          const files = fs.readdirSync(baseDir)
          const candidate = files.find(f => {
            const lower = f.toLowerCase()
            return lower.endsWith('.pdf') && lower.includes(track.toLowerCase())
          })
          if (candidate) {
            pdfPath = path.join(baseDir, candidate)
            break
          }
        }
      }

      if (!pdfPath) {
        return new NextResponse('Track map PDF not found', { status: 404 })
      }

      const fileBuffer = fs.readFileSync(pdfPath)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${path.basename(pdfPath)}"`
        }
      })
    }
  } catch (error) {
    console.error('Error serving track map PDF:', error)
    return new NextResponse('Failed to load track map', { status: 500 })
  }
}
