import { EventEmitter } from 'events'
import { join, basename, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'
const YTDlpWrap = require('yt-dlp-wrap').default
import { DownloadOptions, DownloadProgress, DownloadResult, VideoMetadata } from '../../renderer/types'

export interface DownloadTask {
  id: string
  options: DownloadOptions
  status: 'pending' | 'downloading' | 'converting' | 'completed' | 'failed' | 'cancelled' | 'paused'
  progress: number
  speed?: string
  eta?: string
  error?: string
  outputPath?: string
  metadata?: VideoMetadata
  isPlaylist?: boolean
  playlistIndex?: number
  playlistTotal?: number
  parentTaskId?: string
}

export interface PlaylistDownloadResult {
  playlistTitle: string
  totalVideos: number
  successfulDownloads: number
  failedVideos: number
  skippedVideos: number
  completedTasks: DownloadTask[]
  failedTasks: DownloadTask[]
  skippedTasks: DownloadTask[]
}

export class DownloadManager extends EventEmitter {
  private activeTasks: Map<string, DownloadTask> = new Map()
  private maxConcurrent: number = 3
  private downloadQueue: DownloadTask[] = []
  private ytDlp: any
  private playlistTasks: Map<string, DownloadTask[]> = new Map() // Track playlist sub-tasks

  constructor(maxConcurrent: number = 3) {
    super()
    this.maxConcurrent = maxConcurrent
    this.ytDlp = new YTDlpWrap()
  }

  /**
   * Start a new download (handles both single videos and playlists)
   */
  async startDownload(options: DownloadOptions): Promise<string> {
    // Check if URL is a playlist
    if (this.isPlaylistUrl(options.url)) {
      return this.startPlaylistDownload(options)
    } else {
      return this.startSingleDownload(options)
    }
  }

  /**
   * Start a single video download
   */
  private async startSingleDownload(options: DownloadOptions): Promise<string> {
    const taskId = this.generateTaskId()
    const task: DownloadTask = {
      id: taskId,
      options,
      status: 'pending',
      progress: 0,
      isPlaylist: false
    }

    this.activeTasks.set(taskId, task)
    this.downloadQueue.push(task)
    
    console.log(`Single download queued: ${taskId} - ${options.url}`)
    this.emit('progress', this.createProgressUpdate(task))

    // Process queue
    this.processQueue()

    return taskId
  }

  /**
   * Start playlist download with skip logic for failed videos
   */
  private async startPlaylistDownload(options: DownloadOptions): Promise<string> {
    const playlistTaskId = this.generateTaskId()
    console.log(`Starting playlist download: ${playlistTaskId} - ${options.url}`)

    try {
      // Extract playlist metadata first
      const playlistInfo = await this.extractPlaylistMetadata(options.url)
      console.log(`Playlist extracted: ${playlistInfo.title} (${playlistInfo.videos.length} videos)`)

      if (playlistInfo.videos.length === 0) {
        throw new Error('Playlist is empty or could not extract videos')
      }

      // Create individual download tasks for each video
      const playlistTasks: DownloadTask[] = []
      const successfulTasks = 0
      let skippedTasks = 0

      for (let i = 0; i < playlistInfo.videos.length; i++) {
        const video = playlistInfo.videos[i]
        
        // Skip videos that don't have proper URLs
        if (!video.url || video.url === options.url) {
          console.warn(`Skipping video ${i + 1}: Invalid or missing URL`)
          skippedTasks++
          continue
        }

        const videoTaskId = this.generateTaskId()
        const videoTask: DownloadTask = {
          id: videoTaskId,
          options: {
            ...options,
            url: video.url
          },
          status: 'pending',
          progress: 0,
          metadata: video,
          isPlaylist: true,
          playlistIndex: i + 1,
          playlistTotal: playlistInfo.videos.length,
          parentTaskId: playlistTaskId
        }

        playlistTasks.push(videoTask)
        this.activeTasks.set(videoTaskId, videoTask)
      }

      // Store playlist tasks for tracking
      this.playlistTasks.set(playlistTaskId, playlistTasks)

      // Queue all video tasks for download
      this.downloadQueue.push(...playlistTasks)
      
      console.log(`Playlist queued: ${playlistTasks.length} videos, ${skippedTasks} skipped`)
      
      // Emit playlist progress
      this.emit('playlistProgress', {
        id: playlistTaskId,
        playlistTitle: playlistInfo.title,
        totalVideos: playlistInfo.videos.length,
        queuedVideos: playlistTasks.length,
        skippedVideos: skippedTasks,
        completedVideos: 0,
        failedVideos: 0,
        status: 'started'
      })

      // Process queue
      this.processQueue()

      return playlistTaskId

    } catch (error) {
      console.error('Playlist download failed:', error)
      throw new Error(`Failed to start playlist download: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(id: string): Promise<void> {
    const task = this.activeTasks.get(id)
    if (!task) {
      // Task already completed or cleaned up - silently ignore
      console.log(`Download task ${id} not found (likely already completed)`)
      return
    }

    if (task.status === 'completed' || task.status === 'failed') {
      // Already finished - silently ignore
      console.log(`Download ${id} already ${task.status}, ignoring cancel request`)
      return
    }

    task.status = 'cancelled'
    task.error = 'Cancelled by user'
    
    // Remove from queue if pending
    const queueIndex = this.downloadQueue.findIndex(t => t.id === id)
    if (queueIndex >= 0) {
      this.downloadQueue.splice(queueIndex, 1)
    }

    console.log(`Download cancelled: ${id}`)
    this.emit('progress', this.createProgressUpdate(task))
    this.emit('complete', this.createDownloadResult(task))
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(id: string): Promise<void> {
    const task = this.activeTasks.get(id)
    if (!task) {
      throw new Error(`Download task not found: ${id}`)
    }

    if (task.status === 'completed') {
      throw new Error('Cannot resume completed download')
    }

    if (task.status === 'cancelled') {
      throw new Error('Cannot resume cancelled download')
    }

    if (task.status === 'downloading') {
      console.log(`Download ${id} is already running`)
      return
    }

    // Resume by setting status to pending and adding back to queue
    if (task.status === 'paused' || task.status === 'failed') {
      console.log(`Resuming download: ${id}`)
      task.status = 'pending'
      task.error = undefined
      
      // Add back to front of queue for immediate processing
      this.downloadQueue.unshift(task)
      
      // Emit progress update
      this.emit('progress', this.createProgressUpdate(task))
      
      // Process queue
      this.processQueue()
    }
  }

  /**
   * Pause a download
   */
  async pauseDownload(id: string): Promise<void> {
    const task = this.activeTasks.get(id)
    if (!task) {
      throw new Error(`Download task not found: ${id}`)
    }

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      throw new Error(`Cannot pause ${task.status} download`)
    }

    if (task.status === 'paused') {
      console.log(`Download ${id} is already paused`)
      return
    }

    console.log(`Pausing download: ${id}`)
    task.status = 'paused'
    
    // Remove from queue if pending
    const queueIndex = this.downloadQueue.findIndex(t => t.id === id)
    if (queueIndex >= 0) {
      this.downloadQueue.splice(queueIndex, 1)
    }

    this.emit('progress', this.createProgressUpdate(task))
  }

  /**
   * Get download progress
   */
  getDownloadProgress(id: string): DownloadProgress | null {
    const task = this.activeTasks.get(id)
    if (!task) {
      return null
    }

    return this.createProgressUpdate(task)
  }

  /**
   * Get all active downloads
   */
  getActiveTasks(): DownloadTask[] {
    return Array.from(this.activeTasks.values())
  }

  /**
   * Extract metadata from URL without downloading
   */
  async extractMetadata(url: string, retries: number = 3): Promise<VideoMetadata> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Extracting metadata for: ${url} (attempt ${attempt}/${retries})`)
        
        // Use yt-dlp to extract video info
        const info = await this.ytDlp.execPromise([
          url,
          '--dump-single-json',
          '--no-warnings',
          '--no-check-certificates',
          '--prefer-free-formats',
          '--add-header', 'referer:youtube.com',
          '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '--simulate'
        ]) as any

        const parsedInfo = JSON.parse(info.toString())

        const metadata: VideoMetadata = {
          title: parsedInfo.title || 'Unknown Title',
          artist: parsedInfo.uploader || parsedInfo.creator || parsedInfo.artist || undefined,
          duration: this.formatDuration(parsedInfo.duration),
          thumbnail: parsedInfo.thumbnail || '',
          url: url,
          description: parsedInfo.description,
          uploadDate: parsedInfo.upload_date,
          viewCount: parsedInfo.view_count
        }

        console.log(`Metadata extracted: ${metadata.title}`)
        return metadata
        
      } catch (error) {
        console.error(`Metadata extraction attempt ${attempt} failed:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error(`Failed to extract metadata after ${retries} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Validate YouTube URL
   */
  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname.includes('youtube.com') ||
        urlObj.hostname.includes('youtu.be') ||
        urlObj.hostname.includes('music.youtube.com')
      )
    } catch {
      return false
    }
  }

  /**
   * Check if URL is a playlist
   */
  private isPlaylistUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      
      // YouTube URL patterns:
      // Single video: watch?v=VIDEO_ID (even with &list=PLAYLIST_ID)
      // Playlist: playlist?list=PLAYLIST_ID 
      // Playlist: watch?list=PLAYLIST_ID (without v parameter)
      
      const hasVideoId = urlObj.searchParams.has('v')
      const hasPlaylistId = urlObj.searchParams.has('list')
      const isPlaylistPath = urlObj.pathname.includes('/playlist')
      
      // If it has a video ID (watch?v=), treat as single video regardless of list parameter
      if (hasVideoId) {
        return false
      }
      
      // If it's a playlist path or has list parameter without video ID, treat as playlist
      return isPlaylistPath || hasPlaylistId
    } catch {
      return false
    }
  }

  /**
   * Extract playlist metadata using yt-dlp
   */
  private async extractPlaylistMetadata(url: string): Promise<any> {
    try {
      console.log(`Extracting playlist metadata: ${url}`)
      
      const result = await this.ytDlp.execPromise([
        url,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--simulate',
        '--playlist-end', '50' // Limit to first 50 videos for safety
      ]) as any

      const info = JSON.parse(result.toString())
      
      return {
        title: info.title || 'Unknown Playlist',
        description: info.description || '',
        uploader: info.uploader || 'Unknown',
        videos: (info.entries || []).map((entry: any, index: number) => ({
          title: entry.title || `Video ${index + 1}`,
          artist: entry.uploader || info.uploader || 'Unknown',
          duration: this.formatDuration(entry.duration),
          thumbnail: entry.thumbnail || '',
          url: entry.webpage_url || entry.url,
          description: entry.description || '',
          uploadDate: entry.upload_date,
          viewCount: entry.view_count
        }))
      }
    } catch (error) {
      console.error('Failed to extract playlist metadata:', error)
      throw new Error(`Failed to extract playlist: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get playlist download status
   */
  getPlaylistStatus(playlistId: string): PlaylistDownloadResult | null {
    const playlistTasks = this.playlistTasks.get(playlistId)
    if (!playlistTasks) {
      return null
    }

    const completed = playlistTasks.filter(task => task.status === 'completed')
    const failed = playlistTasks.filter(task => task.status === 'failed')
    const skipped = playlistTasks.filter(task => !task.url || task.error?.includes('skipped'))
    
    // Get playlist title from first task's metadata
    const playlistTitle = playlistTasks[0]?.metadata?.artist || 'Unknown Playlist'

    return {
      playlistTitle,
      totalVideos: playlistTasks.length,
      successfulDownloads: completed.length,
      failedVideos: failed.length,
      skippedVideos: skipped.length,
      completedTasks: completed,
      failedTasks: failed,
      skippedTasks: skipped
    }
  }

  /**
   * Process download queue
   */
  private async processQueue(): Promise<void> {
    const activeTasks = Array.from(this.activeTasks.values())
    const runningCount = activeTasks.filter(t => 
      t.status === 'downloading' || t.status === 'converting'
    ).length

    if (runningCount >= this.maxConcurrent || this.downloadQueue.length === 0) {
      return
    }

    const nextTask = this.downloadQueue.shift()
    if (!nextTask) {return}

    try {
      await this.executeDownload(nextTask)
    } catch (error) {
      console.error(`Download failed: ${nextTask.id}`, error)
    }

    // Continue processing queue
    setTimeout(() => this.processQueue(), 100)
  }

  /**
   * Execute actual download with enhanced error handling for playlists
   */
  private async executeDownload(task: DownloadTask, retries: number = 2): Promise<void> {
    let lastError: Error | null = null
    let progressInterval: NodeJS.Timeout | null = null
    
    // For playlist items, use more lenient retry logic
    const maxRetries = task.isPlaylist ? 1 : retries // Playlists get 1 retry, singles get 2
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const taskInfo = task.isPlaylist ? `${task.playlistIndex}/${task.playlistTotal}` : 'single'
        console.log(`Starting download: ${task.id} (${taskInfo}, attempt ${attempt}/${maxRetries})`)
        
        task.status = 'downloading'
        this.emit('progress', this.createProgressUpdate(task))

        // Ensure output directory exists
        if (!existsSync(task.options.outputPath)) {
          mkdirSync(task.options.outputPath, { recursive: true })
        }

        // Extract metadata if not already done
        if (!task.metadata) {
          try {
            task.metadata = await this.extractMetadata(task.options.url)
          } catch (error) {
            // For playlist items, skip rather than use fallback
            if (task.isPlaylist) {
              console.warn(`Skipping playlist video ${task.playlistIndex}: metadata extraction failed`)
              task.status = 'failed'
              task.error = `Skipped: ${error instanceof Error ? error.message : 'Unknown error'}`
              this.handlePlaylistVideoResult(task)
              return
            }
            
            console.warn(`Metadata extraction failed for ${task.options.url}, using fallback:`, error)
            // Use fallback metadata for single videos
            task.metadata = {
              title: 'Unknown Title',
              artist: 'Unknown Artist',
              duration: 'Unknown',
              thumbnail: '',
              url: task.options.url,
              description: 'Metadata extraction failed',
              uploadDate: undefined,
              viewCount: undefined
            }
          }
        }

        // Generate output filename with playlist prefix if needed
        const sanitizedTitle = this.sanitizeFilename(task.metadata.title)
        const prefix = task.isPlaylist ? `${String(task.playlistIndex).padStart(2, '0')}_` : ''
        const outputFilename = `${prefix}${sanitizedTitle}.${task.options.format}`
        const outputPath = join(task.options.outputPath, outputFilename)

        // Configure yt-dlp command arguments
        const args = [
          task.options.url,
          '--extract-audio',
          '--audio-format', task.options.format,
          '--audio-quality', task.options.quality === 'best' ? '0' : task.options.quality,
          '--output', outputPath,
          '--no-check-certificates',
          '--prefer-free-formats',
          '--add-header', 'referer:youtube.com',
          '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '--no-warnings'
        ]

        // Add playlist-specific options
        if (task.isPlaylist) {
          args.push('--ignore-errors') // Continue on individual video errors
        }

        // Add metadata if provided
        if (task.options.metadata && task.options.metadata.title) {
          args.push('--metadata-from-title', task.options.metadata.title)
        }

        console.log(`Downloading to: ${outputPath}`)
        
        // Start download with progress tracking
        const downloadPromise = this.ytDlp.execPromise(args)
        
        // Enhanced progress simulation with more realistic patterns
        const progressStart = Date.now()
        progressInterval = setInterval(() => {
          if (task.status === 'downloading' || task.status === 'converting') {
            const elapsed = (Date.now() - progressStart) / 1000
            
            if (task.status === 'downloading') {
              // Realistic download progress: fast start, then slower
              const baseProgress = Math.min(elapsed * 15, 85)
              task.progress = Math.min(baseProgress + Math.random() * 5, 85)
              
              if (task.progress > 80) {
                task.status = 'converting'
                task.speed = undefined
              } else {
                task.speed = `${(Math.random() * 1.5 + 0.3).toFixed(1)} MB/s`
              }
            } else if (task.status === 'converting') {
              // Conversion phase: slower but steady progress
              task.progress = Math.min(85 + (elapsed - 6) * 2.5, 95)
              task.speed = undefined
            }
            
            task.eta = this.calculateEta(task.progress)
            this.emit('progress', this.createProgressUpdate(task))
          }
        }, 1500)

        await downloadPromise
        
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }

        // Complete the task
        task.status = 'completed'
        task.progress = 100
        task.outputPath = outputPath
        task.speed = undefined
        task.eta = undefined

        console.log(`Download completed: ${task.id} ${task.isPlaylist ? `(${task.playlistIndex}/${task.playlistTotal})` : ''}`)
        this.emit('progress', this.createProgressUpdate(task))
        this.emit('complete', this.createDownloadResult(task))
        
        // Handle playlist progress tracking
        if (task.isPlaylist) {
          this.handlePlaylistVideoResult(task)
        }
        
        return // Success, exit retry loop

      } catch (error) {
        console.error(`Download attempt ${attempt} failed: ${task.id}`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error occurred')
        
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        
        // For playlist items, be more lenient with errors
        if (task.isPlaylist) {
          const errorMessage = lastError?.message || 'Unknown error'
          
          // Check if this is a common recoverable error
          const isRecoverableError = (
            errorMessage.includes('Video unavailable') ||
            errorMessage.includes('Private video') ||
            errorMessage.includes('This video has been removed') ||
            errorMessage.includes('age-restricted') ||
            errorMessage.includes('region-blocked')
          )
          
          if (isRecoverableError && attempt === 1) {
            console.warn(`Skipping playlist video ${task.playlistIndex}: ${errorMessage}`)
            task.status = 'failed'
            task.error = `Skipped: ${errorMessage}`
            this.emit('progress', this.createProgressUpdate(task))
            this.emit('complete', this.createDownloadResult(task))
            this.handlePlaylistVideoResult(task)
            return // Skip retry for common playlist errors
          }
        }
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000)
          console.log(`Retrying download in ${delay}ms...`)
          task.status = 'pending'
          task.progress = 0
          this.emit('progress', this.createProgressUpdate(task))
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // All retries failed
    const taskInfo = task.isPlaylist ? `playlist video ${task.playlistIndex}/${task.playlistTotal}` : 'download'
    console.error(`${taskInfo} failed after ${maxRetries} attempts: ${task.id}`)
    
    task.status = 'failed'
    task.error = `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error occurred'}`
    
    this.emit('progress', this.createProgressUpdate(task))
    this.emit('complete', this.createDownloadResult(task))
    
    // Handle playlist progress tracking
    if (task.isPlaylist) {
      this.handlePlaylistVideoResult(task)
    }
  }

  /**
   * Handle individual playlist video result and update playlist progress
   */
  private handlePlaylistVideoResult(task: DownloadTask): void {
    if (!task.isPlaylist || !task.parentTaskId) {return}

    const playlistTasks = this.playlistTasks.get(task.parentTaskId)
    if (!playlistTasks) {return}

    const completed = playlistTasks.filter(t => t.status === 'completed').length
    const failed = playlistTasks.filter(t => t.status === 'failed').length
    const total = playlistTasks.length
    const inProgress = playlistTasks.filter(t => 
      t.status === 'downloading' || t.status === 'converting' || t.status === 'pending'
    ).length

    // Emit playlist progress update
    this.emit('playlistProgress', {
      id: task.parentTaskId,
      playlistTitle: playlistTasks[0]?.metadata?.artist || 'Unknown Playlist',
      totalVideos: total,
      completedVideos: completed,
      failedVideos: failed,
      inProgressVideos: inProgress,
      currentVideo: task,
      status: inProgress > 0 ? 'downloading' : 'completed'
    })

    // If all videos are done, emit playlist completion
    if (completed + failed >= total) {
      console.log(`Playlist ${task.parentTaskId} completed: ${completed}/${total} successful, ${failed} failed`)
      
      // Update parent task status to completed
      const parentTask = this.activeTasks.get(task.parentTaskId)
      if (parentTask) {
        parentTask.status = 'completed'
        parentTask.progress = 100
        parentTask.endTime = new Date().toISOString()
        
        // Emit complete event for parent task
        this.emit('complete', this.createDownloadResult(parentTask))
      }
      
      this.emit('playlistComplete', {
        id: task.parentTaskId,
        playlistTitle: playlistTasks[0]?.metadata?.artist || 'Unknown Playlist',
        totalVideos: total,
        successfulDownloads: completed,
        failedVideos: failed,
        skippedVideos: failed, // For now, failed = skipped
        completedTasks: playlistTasks.filter(t => t.status === 'completed'),
        failedTasks: playlistTasks.filter(t => t.status === 'failed'),
        skippedTasks: [] // Will be populated if we add explicit skip logic
      })
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create progress update object
   */
  private createProgressUpdate(task: DownloadTask): DownloadProgress {
    return {
      id: task.id,
      progress: task.progress,
      speed: task.speed || '',
      eta: task.eta || '',
      status: task.status,
      currentFile: task.metadata?.title
    }
  }

  /**
   * Create download result object
   */
  private createDownloadResult(task: DownloadTask): DownloadResult {
    return {
      id: task.id,
      success: task.status === 'completed',
      outputPath: task.outputPath,
      error: task.error,
      metadata: task.metadata
    }
  }

  /**
   * Format duration from seconds to readable format
   */
  private formatDuration(seconds: number | undefined): string {
    if (!seconds) {return 'Unknown'}
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEta(progress: number): string {
    if (progress <= 0) {return 'Unknown'}
    
    const remainingPercent = 100 - progress
    const estimatedSeconds = (remainingPercent / progress) * 30 // rough estimation
    
    const minutes = Math.floor(estimatedSeconds / 60)
    const seconds = Math.floor(estimatedSeconds % 60)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200) // Limit length
  }

  /**
   * Clean up completed tasks older than 1 hour
   */
  public cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    
    for (const [id, task] of this.activeTasks) {
      if ((task.status === 'completed' || task.status === 'failed') && 
          parseInt(id.split('_')[1]) < oneHourAgo) {
        this.activeTasks.delete(id)
      }
    }
  }
}