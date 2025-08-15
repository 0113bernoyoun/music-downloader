import { app } from 'electron'
import { EventEmitter } from 'events'
import { promises as fs, existsSync, statSync, Stats } from 'fs'
import { join, dirname, basename, extname, resolve } from 'path'
import { tmpdir } from 'os'

export interface FileInfo {
  path: string
  name: string
  size: number
  isDirectory: boolean
  created: Date
  modified: Date
  permissions: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
}

export interface DirectoryInfo {
  path: string
  exists: boolean
  writable: boolean
  totalSize: number
  fileCount: number
  subdirectories: string[]
}

export interface DiskUsage {
  total: number
  used: number
  available: number
  percentUsed: number
}

export interface FileOperation {
  id: string
  type: 'copy' | 'move' | 'delete' | 'cleanup'
  source?: string
  destination?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  error?: string
}

export class FileManager extends EventEmitter {
  private tempDirectory: string
  private appDataDirectory: string
  private operationQueue: Map<string, FileOperation> = new Map()

  constructor() {
    super()
    
    // Initialize directories
    this.appDataDirectory = app.getPath('userData')
    this.tempDirectory = join(tmpdir(), 'music-downloader')
    
    // Ensure temp directory exists
    this.ensureDirectoryExists(this.tempDirectory)
      .catch(error => console.error('Failed to create temp directory:', error))
  }

  /**
   * Ensure a directory exists, create it if not
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const resolvedPath = resolve(dirPath)
      
      if (!existsSync(resolvedPath)) {
        await fs.mkdir(resolvedPath, { recursive: true })
        console.log(`Directory created: ${resolvedPath}`)
        this.emit('directoryCreated', { path: resolvedPath })
      }
    } catch (error) {
      console.error(`Failed to create directory: ${dirPath}`, error)
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a path exists and is accessible
   */
  async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get detailed information about a file or directory
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(filePath)
      const resolvedPath = resolve(filePath)
      
      // Check permissions
      let readable = false
      let writable = false
      let executable = false
      
      try {
        await fs.access(resolvedPath, fs.constants.R_OK)
        readable = true
      } catch {}
      
      try {
        await fs.access(resolvedPath, fs.constants.W_OK)
        writable = true
      } catch {}
      
      try {
        await fs.access(resolvedPath, fs.constants.X_OK)
        executable = true
      } catch {}

      return {
        path: resolvedPath,
        name: basename(resolvedPath),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        permissions: {
          readable,
          writable,
          executable
        }
      }
    } catch (error) {
      console.error(`Failed to get file info: ${filePath}`, error)
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get directory information and contents
   */
  async getDirectoryInfo(dirPath: string): Promise<DirectoryInfo> {
    try {
      const resolvedPath = resolve(dirPath)
      const exists = await this.pathExists(resolvedPath)
      
      if (!exists) {
        return {
          path: resolvedPath,
          exists: false,
          writable: false,
          totalSize: 0,
          fileCount: 0,
          subdirectories: []
        }
      }

      // Check if writable
      let writable = false
      try {
        await fs.access(resolvedPath, fs.constants.W_OK)
        writable = true
      } catch {}

      // Get directory contents
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
      let totalSize = 0
      let fileCount = 0
      const subdirectories: string[] = []

      for (const entry of entries) {
        const entryPath = join(resolvedPath, entry.name)
        
        if (entry.isDirectory()) {
          subdirectories.push(entryPath)
        } else {
          fileCount++
          try {
            const stats = await fs.stat(entryPath)
            totalSize += stats.size
          } catch {
            // Ignore files we can't stat
          }
        }
      }

      return {
        path: resolvedPath,
        exists: true,
        writable,
        totalSize,
        fileCount,
        subdirectories
      }
    } catch (error) {
      console.error(`Failed to get directory info: ${dirPath}`, error)
      throw new Error(`Failed to get directory info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get available disk space for a given path
   */
  async getDiskUsage(path: string): Promise<DiskUsage> {
    try {
      const { spawn } = await import('child_process')
      const resolvedPath = resolve(path)
      
      return new Promise((resolve, reject) => {
        let command: string
        let args: string[]
        
        // Different commands for different platforms
        if (process.platform === 'win32') {
          command = 'wmic'
          args = ['logicaldisk', 'get', 'size,freespace,caption']
        } else {
          command = 'df'
          args = ['-k', resolvedPath]
        }

        const process = spawn(command, args)
        let output = ''

        process.stdout.on('data', (data) => {
          output += data.toString()
        })

        process.on('close', (code) => {
          if (code === 0) {
            try {
              let total = 0
              let available = 0

              if (process.platform === 'win32') {
                // Parse Windows wmic output
                const lines = output.split('\n').filter(line => line.trim())
                const driveLetter = resolvedPath.charAt(0).toUpperCase()
                
                for (const line of lines) {
                  if (line.includes(driveLetter + ':')) {
                    const parts = line.trim().split(/\s+/)
                    if (parts.length >= 3) {
                      available = parseInt(parts[1]) || 0
                      total = parseInt(parts[2]) || 0
                      break
                    }
                  }
                }
              } else {
                // Parse Unix df output
                const lines = output.split('\n').filter(line => line.trim())
                if (lines.length >= 2) {
                  const parts = lines[1].split(/\s+/)
                  if (parts.length >= 4) {
                    total = parseInt(parts[1]) * 1024 // Convert from KB to bytes
                    available = parseInt(parts[3]) * 1024 // Convert from KB to bytes
                  }
                }
              }

              const used = total - available
              const percentUsed = total > 0 ? (used / total) * 100 : 0

              resolve({
                total,
                used,
                available,
                percentUsed: Math.round(percentUsed * 100) / 100
              })
            } catch (parseError) {
              reject(new Error(`Failed to parse disk usage output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`))
            }
          } else {
            reject(new Error(`Disk usage command failed with code: ${code}`))
          }
        })

        process.on('error', reject)
      })
    } catch (error) {
      console.error(`Failed to get disk usage: ${path}`, error)
      // Fallback to basic stat if df/wmic fails
      return {
        total: 0,
        used: 0,
        available: 0,
        percentUsed: 0
      }
    }
  }

  /**
   * Create a temporary file
   */
  async createTempFile(prefix: string = 'temp', extension: string = '.tmp'): Promise<string> {
    try {
      const tempFileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`
      const tempFilePath = join(this.tempDirectory, tempFileName)
      
      // Create the file
      await fs.writeFile(tempFilePath, '')
      
      console.log(`Temporary file created: ${tempFilePath}`)
      this.emit('tempFileCreated', { path: tempFilePath })
      
      return tempFilePath
    } catch (error) {
      console.error(`Failed to create temporary file:`, error)
      throw new Error(`Failed to create temporary file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Copy file with progress tracking
   */
  async copyFile(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'copy',
      source: sourcePath,
      destination: destinationPath,
      status: 'pending',
      progress: 0
    }

    this.operationQueue.set(operationId, operation)
    this.emit('operationStarted', operation)

    try {
      const sourceResolved = resolve(sourcePath)
      const destResolved = resolve(destinationPath)

      // Check if source exists
      if (!await this.pathExists(sourceResolved)) {
        throw new Error(`Source file does not exist: ${sourceResolved}`)
      }

      // Check if destination exists and overwrite flag
      if (!overwrite && await this.pathExists(destResolved)) {
        throw new Error(`Destination file already exists: ${destResolved}`)
      }

      // Ensure destination directory exists
      const destDir = dirname(destResolved)
      await this.ensureDirectoryExists(destDir)

      operation.status = 'in_progress'
      this.emit('operationProgress', operation)

      // Copy the file
      await fs.copyFile(sourceResolved, destResolved)

      operation.status = 'completed'
      operation.progress = 100
      
      console.log(`File copied: ${sourceResolved} → ${destResolved}`)
      this.emit('operationCompleted', operation)
      this.emit('fileCopied', { source: sourceResolved, destination: destResolved })

      return destResolved
    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`File copy failed: ${sourcePath} → ${destinationPath}`, error)
      this.emit('operationFailed', operation)
      
      throw error
    } finally {
      this.operationQueue.delete(operationId)
    }
  }

  /**
   * Move file (cut and paste)
   */
  async moveFile(sourcePath: string, destinationPath: string, overwrite: boolean = false): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'move',
      source: sourcePath,
      destination: destinationPath,
      status: 'pending',
      progress: 0
    }

    this.operationQueue.set(operationId, operation)
    this.emit('operationStarted', operation)

    try {
      const sourceResolved = resolve(sourcePath)
      const destResolved = resolve(destinationPath)

      // Check if source exists
      if (!await this.pathExists(sourceResolved)) {
        throw new Error(`Source file does not exist: ${sourceResolved}`)
      }

      // Check if destination exists and overwrite flag
      if (!overwrite && await this.pathExists(destResolved)) {
        throw new Error(`Destination file already exists: ${destResolved}`)
      }

      // Ensure destination directory exists
      const destDir = dirname(destResolved)
      await this.ensureDirectoryExists(destDir)

      operation.status = 'in_progress'
      operation.progress = 50
      this.emit('operationProgress', operation)

      // Try to rename first (faster if on same filesystem)
      try {
        await fs.rename(sourceResolved, destResolved)
      } catch {
        // If rename fails, copy then delete
        await fs.copyFile(sourceResolved, destResolved)
        await fs.unlink(sourceResolved)
      }

      operation.status = 'completed'
      operation.progress = 100
      
      console.log(`File moved: ${sourceResolved} → ${destResolved}`)
      this.emit('operationCompleted', operation)
      this.emit('fileMoved', { source: sourceResolved, destination: destResolved })

      return destResolved
    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`File move failed: ${sourcePath} → ${destinationPath}`, error)
      this.emit('operationFailed', operation)
      
      throw error
    } finally {
      this.operationQueue.delete(operationId)
    }
  }

  /**
   * Safely delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'delete',
      source: filePath,
      status: 'pending',
      progress: 0
    }

    this.operationQueue.set(operationId, operation)
    this.emit('operationStarted', operation)

    try {
      const resolvedPath = resolve(filePath)

      // Check if file exists
      if (!await this.pathExists(resolvedPath)) {
        console.log(`File does not exist (already deleted?): ${resolvedPath}`)
        operation.status = 'completed'
        operation.progress = 100
        this.emit('operationCompleted', operation)
        return
      }

      operation.status = 'in_progress'
      operation.progress = 50
      this.emit('operationProgress', operation)

      // Delete the file
      await fs.unlink(resolvedPath)

      operation.status = 'completed'
      operation.progress = 100
      
      console.log(`File deleted: ${resolvedPath}`)
      this.emit('operationCompleted', operation)
      this.emit('fileDeleted', { path: resolvedPath })

    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`File deletion failed: ${filePath}`, error)
      this.emit('operationFailed', operation)
      
      throw error
    } finally {
      this.operationQueue.delete(operationId)
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'cleanup',
      source: this.tempDirectory,
      status: 'pending',
      progress: 0
    }

    this.operationQueue.set(operationId, operation)
    this.emit('operationStarted', operation)

    let cleanedCount = 0

    try {
      operation.status = 'in_progress'
      this.emit('operationProgress', operation)

      if (!await this.pathExists(this.tempDirectory)) {
        operation.status = 'completed'
        operation.progress = 100
        this.emit('operationCompleted', operation)
        return 0
      }

      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)
      const entries = await fs.readdir(this.tempDirectory, { withFileTypes: true })

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const entryPath = join(this.tempDirectory, entry.name)
        
        try {
          const stats = await fs.stat(entryPath)
          
          if (stats.mtime.getTime() < cutoffTime) {
            if (entry.isDirectory()) {
              await fs.rmdir(entryPath, { recursive: true })
            } else {
              await fs.unlink(entryPath)
            }
            cleanedCount++
          }
        } catch (error) {
          console.warn(`Failed to clean up temp file: ${entryPath}`, error)
        }

        // Update progress
        operation.progress = Math.round(((i + 1) / entries.length) * 100)
        this.emit('operationProgress', operation)
      }

      operation.status = 'completed'
      operation.progress = 100
      
      console.log(`Cleaned up ${cleanedCount} temporary files`)
      this.emit('operationCompleted', operation)
      this.emit('tempFilesCleanedUp', { count: cleanedCount, directory: this.tempDirectory })

    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error('Temp files cleanup failed:', error)
      this.emit('operationFailed', operation)
      
      throw error
    } finally {
      this.operationQueue.delete(operationId)
    }

    return cleanedCount
  }

  /**
   * Get temp directory path
   */
  getTempDirectory(): string {
    return this.tempDirectory
  }

  /**
   * Get app data directory path
   */
  getAppDataDirectory(): string {
    return this.appDataDirectory
  }

  /**
   * Get active file operations
   */
  getActiveOperations(): FileOperation[] {
    return Array.from(this.operationQueue.values())
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up and stop all operations
   */
  public cleanup(): void {
    // Clear operation queue
    this.operationQueue.clear()
    
    // Clean up temp files (fire and forget)
    this.cleanupTempFiles(0)
      .then(count => console.log(`FileManager cleanup: removed ${count} temp files`))
      .catch(error => console.error('FileManager cleanup error:', error))
    
    console.log('FileManager cleanup completed')
  }
}