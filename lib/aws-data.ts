/**
 * AWS S3 + CloudFront Data Fetching Utilities
 * Supports both local development and production AWS hosting
 */

interface DataConfig {
  useAWS: boolean
  cloudFrontDomain?: string
  s3Bucket?: string
}

// Get configuration from environment
function getDataConfig(): DataConfig {
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN
  const s3Bucket = process.env.AWS_S3_BUCKET
  const awsRegion = process.env.AWS_REGION || 'us-east-1'
  
  // If CloudFront is not configured but S3 bucket is, use direct S3 URL
  const effectiveDomain = cloudFrontDomain || 
    (s3Bucket ? `${s3Bucket}.s3.${awsRegion}.amazonaws.com` : undefined)
  
  const useAWS = !!(effectiveDomain && s3Bucket)
  
  // Debug logging to diagnose AWS vs local mode
  console.log('🔍 AWS Configuration Check:')
  console.log('  - AWS_S3_BUCKET:', s3Bucket || '(not set)')
  console.log('  - AWS_CLOUDFRONT_DOMAIN:', cloudFrontDomain || '(not set)')
  console.log('  - AWS_REGION:', awsRegion)
  console.log('  - Effective Domain:', effectiveDomain || '(none)')
  console.log('  - useAWS:', useAWS)
  
  return {
    useAWS,
    cloudFrontDomain: effectiveDomain,
    s3Bucket
  }
}

/**
 * Fetch JSON data from either local filesystem or AWS S3 via CloudFront
 */
export async function fetchRaceData(track: string, filename: string): Promise<any> {
  const config = getDataConfig()
  
  if (config.useAWS) {
    // Production: Fetch from AWS CloudFront
    const base = `https://${config.cloudFrontDomain}`

    // Support the two expected key layouts:
    // 1) <trackFolder>/<filename>
    // 2) Data/<trackFolder>/<filename>
    const keyCandidates = [
      `${track}/${filename}`,
      `Data/${track}/${filename}`
    ]

    for (const key of keyCandidates) {
      const url = `${base}/${key}`
      console.log(`📡 Trying AWS URL: ${url}`)
      try {
        const response = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache' // Ensure fresh data for development
          }
        })
        
        if (!response.ok) {
          console.warn(`⚠️ AWS fetch failed for ${filename} at ${key}: ${response.status}`)
          // 404/403/etc: try next candidate
          continue
        }
        
        console.log(`✅ AWS fetch succeeded for ${filename} at ${key}`)
        return await response.json()
      } catch (error) {
        console.error(`❌ Error fetching ${filename} from AWS at ${key}:`, error)
        // Try next candidate
      }
    }

    console.error(`❌ All AWS key candidates failed for ${filename} (track=${track})`)
    return null
  } else {
    // Development: Use local filesystem (existing logic)
    console.log(`📂 Using local data for ${filename}`)
    return null // Let the API handle local filesystem access
  }
}

/**
 * Get list of available files in a track folder (AWS only)
 */
export async function listTrackFiles(track: string): Promise<string[]> {
  const config = getDataConfig()
  
  if (!config.useAWS) {
    return [] // Local filesystem will handle this
  }
  
  try {
    // For AWS, we'll need to implement a file listing API
    // For now, return empty and let the API try known patterns
    return []
  } catch (error) {
    console.error('Error listing AWS files:', error)
    return []
  }
}

/**
 * Check if AWS configuration is available
 */
export function isAWSConfigured(): boolean {
  return getDataConfig().useAWS
}

/**
 * Get AWS configuration info for debugging
 */
export function getAWSInfo(): { configured: boolean; domain?: string; bucket?: string } {
  const config = getDataConfig()
  return {
    configured: config.useAWS,
    domain: config.cloudFrontDomain,
    bucket: config.s3Bucket
  }
}
