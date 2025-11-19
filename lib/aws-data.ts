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
  
  return {
    useAWS: !!(effectiveDomain && s3Bucket),
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
    const url = `https://${config.cloudFrontDomain}/${track}/${filename}`
    console.log(`📡 Fetching from AWS: ${url}`)
    
    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache' // Ensure fresh data for development
        }
      })
      
      if (!response.ok) {
        console.warn(`⚠️ AWS fetch failed for ${filename}: ${response.status}`)
        return null
      }
      
      return await response.json()
    } catch (error) {
      console.error(`❌ Error fetching ${filename} from AWS:`, error)
      return null
    }
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
