import { EventEmitter } from 'events'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { VideoMetadata } from '../../renderer/types'

export interface HistoryEntry {
  id: string
  url: string
  title: string
  artist?: string
  duration: string
  thumbnail?: string
  format: string
  quality: string
  outputPath: string
  downloadDate: string
  fileSize?: number
  metadata?: VideoMetadata
}

export interface HistoryFilter {
  searchTerm?: string
  dateFrom?: string
  dateTo?: string
  format?: string
  sortBy?: 'date' | 'title' | 'artist'
  sortOrder?: 'asc' | 'desc'
}

export class HistoryManager extends EventEmitter {
  private historyFile: string
  private history: HistoryEntry[] = []
  private maxHistorySize: number = 1000
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor(maxHistorySize: number = 1000) {
    super()
    this.maxHistorySize = maxHistorySize
    
    // Set up history file path in user data directory
    const userDataPath = app.getPath('userData')
    const historyDir = join(userDataPath, 'data')
    
    if (!existsSync(historyDir)) {
      mkdirSync(historyDir, { recursive: true })
    }
    
    this.historyFile = join(historyDir, 'download-history.json')
    
    // Load existing history
    this.loadHistory()
    
    // Set up auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveHistory()
    }, 30000)
  }

  /**
   * Add a new entry to history
   */
  addEntry(entry: Omit<HistoryEntry, 'id' | 'downloadDate'>): void {
    const historyEntry: HistoryEntry = {
      ...entry,
      id: this.generateHistoryId(),
      downloadDate: new Date().toISOString()
    }

    // Add to beginning of array (most recent first)
    this.history.unshift(historyEntry)

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize)
    }

    // Save to disk
    this.saveHistory()

    // Emit event
    this.emit('entry-added', historyEntry)
    console.log(`History entry added: ${historyEntry.title}`)
  }

  /**
   * Get all history entries
   */
  getAllEntries(): HistoryEntry[] {
    return [...this.history]
  }

  /**
   * Get filtered history entries
   */
  getFilteredEntries(filter: HistoryFilter): HistoryEntry[] {
    let filtered = [...this.history]

    // Apply search term filter
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(searchLower) ||
        (entry.artist && entry.artist.toLowerCase().includes(searchLower)) ||
        entry.url.toLowerCase().includes(searchLower)
      )
    }

    // Apply date range filter
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom)
      filtered = filtered.filter(entry => 
        new Date(entry.downloadDate) >= fromDate
      )
    }

    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo)
      toDate.setHours(23, 59, 59, 999) // Include entire day
      filtered = filtered.filter(entry => 
        new Date(entry.downloadDate) <= toDate
      )
    }

    // Apply format filter
    if (filter.format) {
      filtered = filtered.filter(entry => 
        entry.format === filter.format
      )
    }

    // Apply sorting
    const sortBy = filter.sortBy || 'date'
    const sortOrder = filter.sortOrder || 'desc'
    
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'artist': {
          const artistA = a.artist || ''
          const artistB = b.artist || ''
          comparison = artistA.localeCompare(artistB)
          break
        }
        case 'date':
        default:
          comparison = new Date(a.downloadDate).getTime() - 
                      new Date(b.downloadDate).getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }

  /**
   * Get a single history entry by ID
   */
  getEntry(id: string): HistoryEntry | undefined {
    return this.history.find(entry => entry.id === id)
  }

  /**
   * Delete a history entry
   */
  deleteEntry(id: string): boolean {
    const index = this.history.findIndex(entry => entry.id === id)
    
    if (index === -1) {
      return false
    }

    const deleted = this.history.splice(index, 1)[0]
    this.saveHistory()
    
    this.emit('entry-deleted', deleted)
    console.log(`History entry deleted: ${deleted.title}`)
    
    return true
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    const count = this.history.length
    this.history = []
    this.saveHistory()
    
    this.emit('history-cleared')
    console.log(`History cleared: ${count} entries removed`)
  }

  /**
   * Get history statistics
   */
  getStatistics(): {
    totalDownloads: number
    totalSize: number
    formatDistribution: Record<string, number>
    dailyDownloads: Record<string, number>
    topArtists: Array<{ artist: string, count: number }>
  } {
    const stats = {
      totalDownloads: this.history.length,
      totalSize: 0,
      formatDistribution: {} as Record<string, number>,
      dailyDownloads: {} as Record<string, number>,
      topArtists: [] as Array<{ artist: string, count: number }>
    }

    // Calculate statistics
    const artistCounts = new Map<string, number>()
    
    for (const entry of this.history) {
      // Total size
      if (entry.fileSize) {
        stats.totalSize += entry.fileSize
      }

      // Format distribution
      stats.formatDistribution[entry.format] = 
        (stats.formatDistribution[entry.format] || 0) + 1

      // Daily downloads
      const date = new Date(entry.downloadDate).toISOString().split('T')[0]
      stats.dailyDownloads[date] = (stats.dailyDownloads[date] || 0) + 1

      // Artist counts
      if (entry.artist) {
        artistCounts.set(entry.artist, (artistCounts.get(entry.artist) || 0) + 1)
      }
    }

    // Get top 10 artists
    stats.topArtists = Array.from(artistCounts.entries())
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return stats
  }

  /**
   * Check if URL has been downloaded before
   */
  isUrlDownloaded(url: string): boolean {
    return this.history.some(entry => entry.url === url)
  }

  /**
   * Get recent downloads (last 10)
   */
  getRecentDownloads(limit: number = 10): HistoryEntry[] {
    return this.history.slice(0, limit)
  }

  /**
   * Export history to JSON file
   */
  async exportHistory(filePath: string): Promise<void> {
    try {
      const data = JSON.stringify(this.history, null, 2)
      writeFileSync(filePath, data, 'utf-8')
      console.log(`History exported to: ${filePath}`)
    } catch (error) {
      console.error('Failed to export history:', error)
      throw new Error(`Failed to export history: ${error}`)
    }
  }

  /**
   * Import history from JSON file
   */
  async importHistory(filePath: string, merge: boolean = false): Promise<number> {
    try {
      const data = readFileSync(filePath, 'utf-8')
      const importedHistory = JSON.parse(data) as HistoryEntry[]
      
      if (!Array.isArray(importedHistory)) {
        throw new Error('Invalid history file format')
      }

      if (merge) {
        // Merge with existing history, avoiding duplicates
        const existingUrls = new Set(this.history.map(e => e.url))
        const newEntries = importedHistory.filter(e => !existingUrls.has(e.url))
        this.history = [...newEntries, ...this.history].slice(0, this.maxHistorySize)
      } else {
        // Replace existing history
        this.history = importedHistory.slice(0, this.maxHistorySize)
      }

      this.saveHistory()
      this.emit('history-imported', importedHistory.length)
      
      console.log(`History imported: ${importedHistory.length} entries`)
      return importedHistory.length
      
    } catch (error) {
      console.error('Failed to import history:', error)
      throw new Error(`Failed to import history: ${error}`)
    }
  }

  /**
   * Load history from disk
   */
  private loadHistory(): void {
    try {
      if (existsSync(this.historyFile)) {
        const data = readFileSync(this.historyFile, 'utf-8')
        this.history = JSON.parse(data) as HistoryEntry[]
        console.log(`History loaded: ${this.history.length} entries`)
      } else {
        console.log('No history file found, starting fresh')
      }
    } catch (error) {
      console.error('Failed to load history:', error)
      this.history = []
    }
  }

  /**
   * Save history to disk
   */
  private saveHistory(): void {
    try {
      const data = JSON.stringify(this.history, null, 2)
      writeFileSync(this.historyFile, data, 'utf-8')
      console.log('History saved to disk')
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  /**
   * Generate unique history ID
   */
  private generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
    
    // Save one last time before destroying
    this.saveHistory()
    
    this.removeAllListeners()
  }
}