import { app } from 'electron'
import { EventEmitter } from 'events'
import { promises as fs, existsSync, createWriteStream, WriteStream } from 'fs'
import { join, dirname } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
  category?: string
  userId?: string
  sessionId?: string
}

export interface LoggerConfig {
  logLevel: LogLevel
  enableConsole: boolean
  enableFile: boolean
  logDirectory: string
  maxFileSize: number // in bytes
  maxFiles: number
  dateFormat: string
}

export interface LogStats {
  totalLogs: number
  logsByLevel: Record<LogLevel, number>
  errorsToday: number
  lastError?: LogEntry
  sessionStartTime: string
  uptime: number
}

export class Logger extends EventEmitter {
  private config: LoggerConfig
  private logDirectory: string
  private currentLogFile: string
  private fileStream: WriteStream | null = null
  private stats: LogStats
  private sessionId: string
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  constructor(config?: Partial<LoggerConfig>) {
    super()
    
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Default configuration
    this.config = {
      logLevel: 'info',
      enableConsole: true,
      enableFile: true,
      logDirectory: join(app.getPath('userData'), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      dateFormat: 'YYYY-MM-DD',
      ...config
    }

    this.logDirectory = this.config.logDirectory
    
    // Initialize stats
    this.stats = {
      totalLogs: 0,
      logsByLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      },
      errorsToday: 0,
      sessionStartTime: new Date().toISOString(),
      uptime: 0
    }

    // Initialize logger
    this.initialize()
      .catch(error => console.error('Logger initialization failed:', error))
  }

  /**
   * Initialize logger directory and file stream
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure log directory exists
      if (!existsSync(this.logDirectory)) {
        await fs.mkdir(this.logDirectory, { recursive: true })
      }

      // Set current log file
      const today = new Date().toISOString().split('T')[0]
      this.currentLogFile = join(this.logDirectory, `app_${today}.log`)

      // Initialize file stream if file logging is enabled
      if (this.config.enableFile) {
        await this.initializeFileStream()
      }

      // Clean up old log files
      await this.rotateLogFiles()

      // Log initialization
      this.info('Logger initialized', {
        sessionId: this.sessionId,
        config: {
          logLevel: this.config.logLevel,
          enableConsole: this.config.enableConsole,
          enableFile: this.config.enableFile,
          logDirectory: this.logDirectory
        }
      })

    } catch (error) {
      console.error('Logger initialization failed:', error)
      throw error
    }
  }

  /**
   * Initialize file stream for logging
   */
  private async initializeFileStream(): Promise<void> {
    try {
      // Close existing stream if any
      if (this.fileStream) {
        this.fileStream.end()
      }

      // Create new write stream
      this.fileStream = createWriteStream(this.currentLogFile, { flags: 'a' })

      // Handle stream errors
      this.fileStream.on('error', (error) => {
        console.error('Log file stream error:', error)
        this.emit('fileError', { error: error.message, file: this.currentLogFile })
      })

    } catch (error) {
      console.error('Failed to initialize file stream:', error)
      throw error
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>, category?: string): void {
    this.log('debug', message, metadata, category)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>, category?: string): void {
    this.log('info', message, metadata, category)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>, category?: string): void {
    this.log('warn', message, metadata, category)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>, category?: string): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined

    this.log('error', message, metadata, category, errorData)
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, category?: string, error?: any): void {
    // Check if we should log this level
    if (this.logLevels[level] < this.logLevels[this.config.logLevel]) {
      return
    }

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      error,
      category,
      sessionId: this.sessionId
    }

    // Update statistics
    this.updateStats(logEntry)

    // Format log message for console
    if (this.config.enableConsole) {
      this.logToConsole(logEntry)
    }

    // Write to file
    if (this.config.enableFile && this.fileStream) {
      this.logToFile(logEntry)
    }

    // Emit log event only if there are listeners to prevent ERR_UNHANDLED_ERROR
    try {
      if (this.listenerCount('log') > 0) {
        this.emit('log', logEntry)
      }

      // Emit level-specific events only if there are listeners
      if (this.listenerCount(level) > 0) {
        this.emit(level, logEntry)
      }
    } catch (emitError) {
      // If emitting fails, just log to console to prevent infinite loops
      console.error('Logger emit error:', emitError)
    }

    // Check if file rotation is needed
    if (this.config.enableFile) {
      this.checkFileRotation()
        .catch(error => console.error('Log rotation check failed:', error))
    }
  }

  /**
   * Log to console with color coding
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.substring(11, 19) // HH:MM:SS
    const level = entry.level.toUpperCase().padEnd(5)
    const category = entry.category ? `[${entry.category}]` : ''
    
    let colorCode = ''
    const resetCode = '\x1b[0m'
    
    // Color codes for different log levels
    switch (entry.level) {
      case 'debug':
        colorCode = '\x1b[36m' // Cyan
        break
      case 'info':
        colorCode = '\x1b[32m' // Green
        break
      case 'warn':
        colorCode = '\x1b[33m' // Yellow
        break
      case 'error':
        colorCode = '\x1b[31m' // Red
        break
    }

    const baseMessage = `${colorCode}${timestamp} ${level}${resetCode} ${category} ${entry.message}`
    
    console.log(baseMessage)
    
    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log('  Metadata:', entry.metadata)
    }
    
    // Log error details if present
    if (entry.error) {
      console.log('  Error:', entry.error.name, entry.error.message)
      if (entry.error.stack) {
        console.log('  Stack:', entry.error.stack)
      }
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    try {
      if (this.fileStream && this.fileStream.writable) {
        const logLine = JSON.stringify(entry) + '\n'
        this.fileStream.write(logLine)
      }
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  /**
   * Update logging statistics
   */
  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++
    this.stats.logsByLevel[entry.level]++
    
    // Update uptime
    this.stats.uptime = Date.now() - new Date(this.stats.sessionStartTime).getTime()
    
    if (entry.level === 'error') {
      const today = new Date().toDateString()
      const entryDate = new Date(entry.timestamp).toDateString()
      
      if (today === entryDate) {
        this.stats.errorsToday++
      }
      
      this.stats.lastError = entry
    }
  }

  /**
   * Check if log file rotation is needed
   */
  private async checkFileRotation(): Promise<void> {
    try {
      if (!existsSync(this.currentLogFile)) {
        return
      }

      const stats = await fs.stat(this.currentLogFile)
      
      // Check if file size exceeds limit
      if (stats.size >= this.config.maxFileSize) {
        await this.rotateCurrentFile()
      }
      
      // Check if we need a new file for today
      const today = new Date().toISOString().split('T')[0]
      const currentFileDate = this.currentLogFile.includes(today)
      
      if (!currentFileDate) {
        await this.createNewLogFile()
      }
      
    } catch (error) {
      console.error('Log rotation check failed:', error)
    }
  }

  /**
   * Rotate current log file
   */
  private async rotateCurrentFile(): Promise<void> {
    try {
      if (this.fileStream) {
        this.fileStream.end()
        this.fileStream = null
      }

      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19)
      const rotatedFile = this.currentLogFile.replace('.log', `_${timestamp}.log`)
      
      await fs.rename(this.currentLogFile, rotatedFile)
      
      // Create new log file
      await this.createNewLogFile()
      
      this.info('Log file rotated', { oldFile: this.currentLogFile, newFile: rotatedFile })
      
    } catch (error) {
      console.error('Log file rotation failed:', error)
      throw error
    }
  }

  /**
   * Create new log file for today
   */
  private async createNewLogFile(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      this.currentLogFile = join(this.logDirectory, `app_${today}.log`)
      
      if (this.config.enableFile) {
        await this.initializeFileStream()
      }
      
    } catch (error) {
      console.error('Failed to create new log file:', error)
      throw error
    }
  }

  /**
   * Clean up old log files
   */
  private async rotateLogFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDirectory)
      const logFiles = files
        .filter(file => file.endsWith('.log') && file.startsWith('app_'))
        .map(file => ({
          name: file,
          path: join(this.logDirectory, file),
          stat: null as any
        }))

      // Get file stats and sort by modification time
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path)
        } catch {
          // Skip files we can't stat
        }
      }

      const validFiles = logFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())

      // Keep only the most recent files
      const filesToDelete = validFiles.slice(this.config.maxFiles)
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path)
          this.info('Old log file deleted', { file: file.name })
        } catch (error) {
          console.warn(`Failed to delete old log file: ${file.name}`, error)
        }
      }
      
    } catch (error) {
      console.error('Log file rotation failed:', error)
    }
  }

  /**
   * Get logging statistics
   */
  getStats(): LogStats {
    this.stats.uptime = Date.now() - new Date(this.stats.sessionStartTime).getTime()
    return { ...this.stats }
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.logLevel = level
    this.info('Log level changed', { newLevel: level })
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.config.logLevel
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.config.enableConsole = enabled
    this.info('Console logging changed', { enabled })
  }

  /**
   * Enable/disable file logging
   */
  async setFileLogging(enabled: boolean): Promise<void> {
    this.config.enableFile = enabled
    
    if (enabled && !this.fileStream) {
      await this.initializeFileStream()
    } else if (!enabled && this.fileStream) {
      this.fileStream.end()
      this.fileStream = null
    }
    
    this.info('File logging changed', { enabled })
  }

  /**
   * Get recent log entries from file
   */
  async getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
    try {
      if (!existsSync(this.currentLogFile)) {
        return []
      }

      const content = await fs.readFile(this.currentLogFile, 'utf-8')
      const lines = content.trim().split('\n').filter(line => line.length > 0)
      const recentLines = lines.slice(-limit)
      
      const logs: LogEntry[] = []
      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line) as LogEntry
          logs.push(entry)
        } catch {
          // Skip invalid JSON lines
        }
      }
      
      return logs
    } catch (error) {
      console.error('Failed to read recent logs:', error)
      return []
    }
  }

  /**
   * Get log file paths
   */
  async getLogFiles(): Promise<string[]> {
    try {
      if (!existsSync(this.logDirectory)) {
        return []
      }

      const files = await fs.readdir(this.logDirectory)
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => join(this.logDirectory, file))
        .sort()
    } catch (error) {
      console.error('Failed to get log files:', error)
      return []
    }
  }

  /**
   * Export logs to a specific file
   */
  async exportLogs(outputPath: string, fromDate?: Date, toDate?: Date): Promise<void> {
    try {
      const logFiles = await this.getLogFiles()
      const allLogs: LogEntry[] = []

      for (const logFile of logFiles) {
        try {
          const content = await fs.readFile(logFile, 'utf-8')
          const lines = content.trim().split('\n').filter(line => line.length > 0)
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line) as LogEntry
              const entryDate = new Date(entry.timestamp)
              
              // Filter by date range if provided
              if (fromDate && entryDate < fromDate) {continue}
              if (toDate && entryDate > toDate) {continue}
              
              allLogs.push(entry)
            } catch {
              // Skip invalid JSON lines
            }
          }
        } catch (error) {
          console.warn(`Failed to read log file: ${logFile}`, error)
        }
      }

      // Sort by timestamp
      allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Write to output file
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalEntries: allLogs.length,
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        logs: allLogs
      }

      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8')
      this.info('Logs exported', { outputPath, totalEntries: allLogs.length })
      
    } catch (error) {
      console.error('Failed to export logs:', error)
      throw error
    }
  }

  /**
   * Clean up logger resources
   */
  public cleanup(): void {
    try {
      if (this.fileStream) {
        this.fileStream.end()
        this.fileStream = null
      }
      
      this.info('Logger cleanup completed')
      console.log('Logger cleanup completed')
    } catch (error) {
      console.error('Logger cleanup error:', error)
    }
  }
}