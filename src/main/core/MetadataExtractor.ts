import { EventEmitter } from 'events'
const YTDlpWrap = require('yt-dlp-wrap').default
import { VideoMetadata } from '../../renderer/types'

export interface ExtractedPlaylistInfo {
  title: string
  description?: string
  uploader: string
  uploaderUrl?: string
  videos: VideoMetadata[]
  totalCount: number
}

export interface UrlValidationResult {
  isValid: boolean
  platform: 'youtube' | 'youtube_music' | 'youtube_shorts' | 'unknown'
  type: 'video' | 'playlist' | 'channel' | 'unknown'
  id?: string
  error?: string
}

export class MetadataExtractor extends EventEmitter {
  private activeExtractions: Map<string, Promise<VideoMetadata>> = new Map()
  private cache: Map<string, { metadata: VideoMetadata; timestamp: number }> = new Map()
  private cacheMaxAge: number = 1000 * 60 * 30 // 30 minutes
  private ytDlp: any

  constructor() {
    super()
    this.ytDlp = new YTDlpWrap()
  }

  /**
   * Extract metadata from a single video URL
   */
  async extractVideoMetadata(url: string, useCache: boolean = true): Promise<VideoMetadata> {
    const cacheKey = `video_${url}`
    
    // Check cache first
    if (useCache) {
      const cached = this.getCachedMetadata(cacheKey)
      if (cached) {
        console.log(`Metadata retrieved from cache: ${url}`)
        return cached
      }
    }

    // Return existing promise if extraction is already in progress
    if (this.activeExtractions.has(url)) {
      console.log(`Metadata extraction already in progress, waiting for result: ${url}`)
      return this.activeExtractions.get(url)!
    }

    // Create and store the extraction promise
    const extractionPromise = this.performExtraction(url, cacheKey, useCache)
    this.activeExtractions.set(url, extractionPromise)

    try {
      const result = await extractionPromise
      return result
    } finally {
      this.activeExtractions.delete(url)
    }
  }

  private async performExtraction(url: string, cacheKey: string, useCache: boolean): Promise<VideoMetadata> {
    try {
      console.log(`Extracting video metadata: ${url}`)
      
      const result = await this.ytDlp.execPromise([
        url,
        '--dump-single-json',
        '--no-warnings',
        '--simulate'
      ]) as any

      const info = JSON.parse(result.toString())

      const metadata: VideoMetadata = {
        title: this.sanitizeString(info.title) || 'Unknown Title',
        artist: this.sanitizeString(info.uploader || info.creator || info.artist),
        duration: this.formatDuration(info.duration),
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
        url: url,
        description: this.sanitizeString(info.description),
        uploadDate: this.formatDate(info.upload_date),
        viewCount: this.parseViewCount(info.view_count)
      }

      // Cache the result
      if (useCache) {
        this.setCachedMetadata(cacheKey, metadata)
      }

      console.log(`Video metadata extracted: ${metadata.title}`)
      this.emit('metadataExtracted', { url, metadata })

      return metadata

    } catch (error) {
      console.error('Failed to extract video metadata:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emit('extractionError', { url, error: errorMessage })
      throw new Error(`Failed to extract metadata: ${errorMessage}`)
    }
  }

  /**
   * Extract metadata from a playlist URL
   */
  async extractPlaylistMetadata(url: string, limit?: number): Promise<ExtractedPlaylistInfo> {
    if (this.activeExtractions.has(url)) {
      throw new Error('Playlist extraction already in progress for this URL')
    }

    this.activeExtractions.add(url)

    try {
      console.log(`Extracting playlist metadata: ${url}`)
      
      const args = [
        url,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--simulate'
      ]

      // Limit the number of items if specified
      if (limit && limit > 0) {
        args.push('--playlist-end', limit.toString())
      }

      const result = await this.ytDlp.execPromise(args) as any
      const info = JSON.parse(result.toString())

      // Extract playlist information
      const playlistInfo: ExtractedPlaylistInfo = {
        title: this.sanitizeString(info.title) || 'Unknown Playlist',
        description: this.sanitizeString(info.description),
        uploader: this.sanitizeString(info.uploader) || 'Unknown Uploader',
        uploaderUrl: info.uploader_url,
        videos: [],
        totalCount: 0
      }

      // Process playlist entries
      if (info.entries && Array.isArray(info.entries)) {
        playlistInfo.totalCount = info.entries.length

        playlistInfo.videos = info.entries.map((entry: any, index: number): VideoMetadata => ({
          title: this.sanitizeString(entry.title) || `Video ${index + 1}`,
          artist: this.sanitizeString(entry.uploader || entry.creator || playlistInfo.uploader),
          duration: this.formatDuration(entry.duration),
          thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url || '',
          url: entry.webpage_url || entry.url || `${url}?index=${index + 1}`,
          description: this.sanitizeString(entry.description),
          uploadDate: this.formatDate(entry.upload_date),
          viewCount: this.parseViewCount(entry.view_count)
        }))
      }

      console.log(`Playlist metadata extracted: ${playlistInfo.title} (${playlistInfo.videos.length} videos)`)
      this.emit('playlistExtracted', { url, playlistInfo })

      return playlistInfo

    } catch (error) {
      console.error('Failed to extract playlist metadata:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emit('extractionError', { url, error: errorMessage })
      throw new Error(`Failed to extract playlist metadata: ${errorMessage}`)
    } finally {
      this.activeExtractions.delete(url)
    }
  }

  /**
   * Validate and analyze a URL
   */
  validateUrl(url: string): UrlValidationResult {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const pathname = urlObj.pathname
      const searchParams = urlObj.searchParams

      // Check if it's a supported YouTube domain
      const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('music.youtube.com')
      
      if (!isYouTube) {
        return {
          isValid: false,
          platform: 'unknown',
          type: 'unknown',
          error: 'Unsupported platform. Only YouTube URLs are supported.'
        }
      }

      // Determine platform
      let platform: 'youtube' | 'youtube_music' | 'youtube_shorts' = 'youtube'
      if (hostname.includes('music.youtube.com')) {
        platform = 'youtube_music'
      } else if (pathname.includes('/shorts/')) {
        platform = 'youtube_shorts'
      }

      // Determine URL type and extract ID
      let type: 'video' | 'playlist' | 'channel' = 'video'
      let id: string | undefined

      // Video URLs
      if (pathname === '/watch' && searchParams.has('v')) {
        type = 'video'
        id = searchParams.get('v') || undefined
      } else if (hostname === 'youtu.be' && pathname.length > 1) {
        type = 'video'
        id = pathname.substring(1).split('?')[0]
      } else if (pathname.includes('/shorts/')) {
        type = 'video'
        id = pathname.split('/shorts/')[1]?.split('?')[0]
      }
      // Playlist URLs
      else if (searchParams.has('list')) {
        type = 'playlist'
        id = searchParams.get('list') || undefined
      }
      // Channel URLs
      else if (pathname.includes('/channel/') || pathname.includes('/c/') || pathname.includes('/@')) {
        type = 'channel'
        if (pathname.includes('/channel/')) {
          id = pathname.split('/channel/')[1]?.split('/')[0]
        } else if (pathname.includes('/c/')) {
          id = pathname.split('/c/')[1]?.split('/')[0]
        } else if (pathname.includes('/@')) {
          id = pathname.split('/@')[1]?.split('/')[0]
        }
      }

      // Validate extracted ID
      if (id && id.length > 0) {
        return {
          isValid: true,
          platform,
          type,
          id
        }
      } else {
        return {
          isValid: false,
          platform,
          type: 'unknown',
          error: 'Could not extract video/playlist/channel ID from URL'
        }
      }

    } catch (error) {
      return {
        isValid: false,
        platform: 'unknown',
        type: 'unknown',
        error: 'Invalid URL format'
      }
    }
  }

  /**
   * Get supported URL patterns
   */
  getSupportedPatterns(): string[] {
    return [
      'https://www.youtube.com/watch?v=VIDEO_ID',
      'https://youtu.be/VIDEO_ID',
      'https://www.youtube.com/shorts/VIDEO_ID',
      'https://music.youtube.com/watch?v=VIDEO_ID',
      'https://www.youtube.com/playlist?list=PLAYLIST_ID',
      'https://www.youtube.com/channel/CHANNEL_ID',
      'https://www.youtube.com/c/CHANNEL_NAME',
      'https://www.youtube.com/@CHANNEL_HANDLE'
    ]
  }

  /**
   * Check if extraction is currently active for a URL
   */
  isExtracting(url: string): boolean {
    return this.activeExtractions.has(url)
  }

  /**
   * Get number of active extractions
   */
  getActiveExtractionsCount(): number {
    return this.activeExtractions.size
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.cache.clear()
    console.log('Metadata cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.cacheMaxAge
    }
  }

  /**
   * Format duration from seconds to readable string
   */
  private formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds <= 0) {return 'Unknown'}
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * Format upload date
   */
  private formatDate(dateString: string | undefined): string | undefined {
    if (!dateString) {return undefined}
    
    try {
      // yt-dlp provides dates in YYYYMMDD format
      if (dateString.length === 8) {
        const year = dateString.substring(0, 4)
        const month = dateString.substring(4, 6)
        const day = dateString.substring(6, 8)
        return `${year}-${month}-${day}`
      }
      return dateString
    } catch {
      return dateString
    }
  }

  /**
   * Parse view count to number
   */
  private parseViewCount(viewCount: any): number | undefined {
    if (typeof viewCount === 'number') {
      return viewCount
    }
    
    if (typeof viewCount === 'string') {
      const parsed = parseInt(viewCount.replace(/[^\d]/g, ''))
      return isNaN(parsed) ? undefined : parsed
    }
    
    return undefined
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value: any): string | undefined {
    if (typeof value !== 'string') {return undefined}
    
    return value
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .substring(0, 500) // Limit length
      || undefined
  }

  /**
   * Get cached metadata
   */
  private getCachedMetadata(key: string): VideoMetadata | null {
    const cached = this.cache.get(key)
    if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
      return cached.metadata
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(key)
    }
    
    return null
  }

  /**
   * Set cached metadata
   */
  private setCachedMetadata(key: string, metadata: VideoMetadata): void {
    this.cache.set(key, {
      metadata,
      timestamp: Date.now()
    })

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache()
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    let removedCount = 0

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.cacheMaxAge) {
        this.cache.delete(key)
        removedCount++
      }
    })

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} expired cache entries`)
    }
  }

  /**
   * Cancel all active extractions
   */
  public cleanup(): void {
    this.activeExtractions.clear()
    this.clearCache()
    console.log('MetadataExtractor cleanup completed')
  }
}