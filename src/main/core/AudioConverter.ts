import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync, unlinkSync, statSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import ffmpegStatic from 'ffmpeg-static'

export interface ConversionOptions {
  inputPath: string
  outputPath: string
  format: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg'
  quality: '128' | '192' | '320' | 'best'
  metadata?: {
    title?: string
    artist?: string
    album?: string
    date?: string
  }
}

export interface ConversionProgress {
  id: string
  progress: number // 0-100
  speed?: string
  eta?: string
  status: 'pending' | 'converting' | 'completed' | 'failed'
}

export interface ConversionResult {
  id: string
  success: boolean
  inputPath: string
  outputPath?: string
  error?: string
  originalSize?: number
  convertedSize?: number
}

export class AudioConverter extends EventEmitter {
  private activeConversions: Map<string, ChildProcess> = new Map()
  private ffmpegPath: string

  constructor() {
    super()
    
    // Initialize FFmpeg path
    this.ffmpegPath = this.getFfmpegPath()
    if (!this.ffmpegPath) {
      console.warn('FFmpeg not found. Audio conversion will be limited.')
    }
  }

  /**
   * Convert audio file to specified format
   */
  async convertAudio(options: ConversionOptions): Promise<string> {
    if (!this.ffmpegPath) {
      throw new Error('FFmpeg not available. Cannot perform audio conversion.')
    }

    if (!existsSync(options.inputPath)) {
      throw new Error(`Input file not found: ${options.inputPath}`)
    }

    const conversionId = this.generateConversionId()
    console.log(`Starting audio conversion: ${conversionId}`)

    try {
      // Ensure output directory exists
      const outputDir = dirname(options.outputPath)
      if (!existsSync(outputDir)) {
        const { mkdirSync } = await import('fs')
        mkdirSync(outputDir, { recursive: true })
      }

      // Get original file size for progress calculation
      const originalSize = statSync(options.inputPath).size

      // Build FFmpeg arguments
      const args = this.buildFfmpegArgs(options)
      
      console.log(`FFmpeg command: ${this.ffmpegPath} ${args.join(' ')}`)

      // Start conversion process
      const ffmpegProcess = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      this.activeConversions.set(conversionId, ffmpegProcess)

      // Emit initial progress
      this.emit('progress', {
        id: conversionId,
        progress: 0,
        status: 'converting'
      } as ConversionProgress)

      let duration = 0
      let currentTime = 0

      // Parse FFmpeg output for progress
      ffmpegProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString()
        
        // Extract duration from FFmpeg output
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2}/)
        if (durationMatch) {
          duration = this.parseTimeToSeconds(durationMatch[1], durationMatch[2], durationMatch[3])
        }

        // Extract current time from FFmpeg output
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/)
        if (timeMatch) {
          currentTime = this.parseTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3])
          
          if (duration > 0) {
            const progress = Math.min((currentTime / duration) * 100, 99)
            const eta = this.calculateEta(currentTime, duration)
            
            this.emit('progress', {
              id: conversionId,
              progress,
              eta,
              status: 'converting'
            } as ConversionProgress)
          }
        }

        // Extract speed information
        const speedMatch = output.match(/speed=\s*(\d+(?:\.\d+)?)x/)
        if (speedMatch) {
          const speed = `${speedMatch[1]}x`
          this.emit('progress', {
            id: conversionId,
            progress: currentTime > 0 && duration > 0 ? (currentTime / duration) * 100 : 0,
            speed,
            status: 'converting'
          } as ConversionProgress)
        }
      })

      // Handle process completion
      const conversionPromise = new Promise<ConversionResult>((resolve, reject) => {
        ffmpegProcess.on('close', (code) => {
          this.activeConversions.delete(conversionId)

          if (code === 0) {
            // Success
            const convertedSize = existsSync(options.outputPath) ? 
              statSync(options.outputPath).size : 0

            const result: ConversionResult = {
              id: conversionId,
              success: true,
              inputPath: options.inputPath,
              outputPath: options.outputPath,
              originalSize,
              convertedSize
            }

            this.emit('progress', {
              id: conversionId,
              progress: 100,
              status: 'completed'
            } as ConversionProgress)

            console.log(`Conversion completed: ${conversionId}`)
            resolve(result)
          } else {
            // Failure
            const result: ConversionResult = {
              id: conversionId,
              success: false,
              inputPath: options.inputPath,
              error: `FFmpeg process exited with code ${code}`
            }

            this.emit('progress', {
              id: conversionId,
              progress: 0,
              status: 'failed'
            } as ConversionProgress)

            console.error(`Conversion failed: ${conversionId}, exit code: ${code}`)
            reject(new Error(result.error))
          }
        })

        ffmpegProcess.on('error', (error) => {
          this.activeConversions.delete(conversionId)
          
          const result: ConversionResult = {
            id: conversionId,
            success: false,
            inputPath: options.inputPath,
            error: error.message
          }

          this.emit('progress', {
            id: conversionId,
            progress: 0,
            status: 'failed'
          } as ConversionProgress)

          console.error(`Conversion error: ${conversionId}`, error)
          reject(error)
        })
      })

      const result = await conversionPromise
      return result.outputPath || options.outputPath

    } catch (error) {
      console.error(`Audio conversion failed: ${conversionId}`, error)
      throw error
    }
  }

  /**
   * Cancel an active conversion
   */
  cancelConversion(conversionId: string): boolean {
    const process = this.activeConversions.get(conversionId)
    if (process) {
      process.kill('SIGKILL')
      this.activeConversions.delete(conversionId)
      console.log(`Conversion cancelled: ${conversionId}`)
      return true
    }
    return false
  }

  /**
   * Get active conversion count
   */
  getActiveConversionsCount(): number {
    return this.activeConversions.size
  }

  /**
   * Check if FFmpeg is available
   */
  isAvailable(): boolean {
    return !!this.ffmpegPath
  }

  /**
   * Get FFmpeg version information
   */
  async getVersion(): Promise<string> {
    if (!this.ffmpegPath) {
      throw new Error('FFmpeg not available')
    }

    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-version'])
      let output = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          const versionMatch = output.match(/ffmpeg version (\S+)/)
          resolve(versionMatch ? versionMatch[1] : 'Unknown')
        } else {
          reject(new Error('Failed to get FFmpeg version'))
        }
      })

      process.on('error', reject)
    })
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'wav', 'flac', 'aac', 'ogg']
  }

  /**
   * Get FFmpeg path
   */
  private getFfmpegPath(): string {
    // Try ffmpeg-static package first
    if (ffmpegStatic && existsSync(ffmpegStatic)) {
      return ffmpegStatic
    }

    // Fallback to system FFmpeg
    const { platform } = process
    const ffmpegCmd = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    
    // Try common system paths
    const commonPaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'ffmpeg' // Try PATH
    ]

    for (const path of commonPaths) {
      if (existsSync(path)) {
        return path
      }
    }

    console.warn('FFmpeg not found in common locations')
    return ''
  }

  /**
   * Build FFmpeg arguments for conversion
   */
  private buildFfmpegArgs(options: ConversionOptions): string[] {
    const args: string[] = []

    // Input file
    args.push('-i', options.inputPath)

    // Overwrite output file without asking
    args.push('-y')

    // Audio codec and quality settings based on format
    switch (options.format) {
      case 'mp3':
        args.push('-acodec', 'libmp3lame')
        if (options.quality !== 'best') {
          args.push('-ab', `${options.quality}k`)
        } else {
          args.push('-q:a', '0') // Best quality
        }
        break

      case 'wav':
        args.push('-acodec', 'pcm_s16le')
        break

      case 'flac':
        args.push('-acodec', 'flac')
        if (options.quality !== 'best') {
          args.push('-compression_level', '5')
        } else {
          args.push('-compression_level', '12') // Best compression
        }
        break

      case 'aac':
        args.push('-acodec', 'aac')
        if (options.quality !== 'best') {
          args.push('-ab', `${options.quality}k`)
        } else {
          args.push('-q:a', '1') // Best quality
        }
        break

      case 'ogg':
        args.push('-acodec', 'libvorbis')
        if (options.quality !== 'best') {
          args.push('-ab', `${options.quality}k`)
        } else {
          args.push('-q:a', '10') // Best quality
        }
        break
    }

    // Add metadata if provided
    if (options.metadata) {
      if (options.metadata.title) {
        args.push('-metadata', `title=${options.metadata.title}`)
      }
      if (options.metadata.artist) {
        args.push('-metadata', `artist=${options.metadata.artist}`)
      }
      if (options.metadata.album) {
        args.push('-metadata', `album=${options.metadata.album}`)
      }
      if (options.metadata.date) {
        args.push('-metadata', `date=${options.metadata.date}`)
      }
    }

    // Remove video stream (audio only)
    args.push('-vn')

    // Output file
    args.push(options.outputPath)

    return args
  }

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(hours: string, minutes: string, seconds: string): number {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEta(currentTime: number, totalDuration: number): string {
    if (currentTime <= 0 || totalDuration <= 0) {return 'Unknown'}
    
    const progress = currentTime / totalDuration
    const remainingTime = (totalDuration - currentTime) / Math.max(progress, 0.01)
    
    const minutes = Math.floor(remainingTime / 60)
    const seconds = Math.floor(remainingTime % 60)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Generate unique conversion ID
   */
  private generateConversionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up temporary files
   */
  public cleanup(): void {
    // Cancel all active conversions
    for (const [id, process] of this.activeConversions) {
      try {
        process.kill('SIGKILL')
        console.log(`Cleaned up conversion: ${id}`)
      } catch (error) {
        console.error(`Failed to cleanup conversion: ${id}`, error)
      }
    }
    this.activeConversions.clear()
  }
}