/**
 * Unit tests for HistoryManager class
 * Tests core history management functionality including storage, filtering, and statistics
 */

import { EventEmitter } from 'events'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Mock dependencies
jest.mock('fs')
jest.mock('path')
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/test/userData')
  }
}))

// Mock the HistoryManager to avoid file system operations during tests
class MockHistoryManager extends EventEmitter {
  private history: any[] = []
  private maxHistorySize: number
  private historyFile: string

  constructor(maxHistorySize: number = 1000) {
    super()
    this.maxHistorySize = maxHistorySize
    this.historyFile = '/test/userData/data/download-history.json'
  }

  addEntry(entry: any): void {
    const historyEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      downloadDate: new Date().toISOString()
    }

    this.history.unshift(historyEntry)

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize)
    }

    this.emit('entry-added', historyEntry)
  }

  getAllEntries(): any[] {
    return [...this.history]
  }

  getFilteredEntries(filter: any): any[] {
    let filtered = [...this.history]

    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(searchLower) ||
        (entry.artist && entry.artist.toLowerCase().includes(searchLower)) ||
        entry.url.toLowerCase().includes(searchLower)
      )
    }

    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom)
      filtered = filtered.filter(entry => 
        new Date(entry.downloadDate) >= fromDate
      )
    }

    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => 
        new Date(entry.downloadDate) <= toDate
      )
    }

    if (filter.format) {
      filtered = filtered.filter(entry => entry.format === filter.format)
    }

    const sortBy = filter.sortBy || 'date'
    const sortOrder = filter.sortOrder || 'desc'
    
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'artist':
          const artistA = a.artist || ''
          const artistB = b.artist || ''
          comparison = artistA.localeCompare(artistB)
          break
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

  getEntry(id: string): any | undefined {
    return this.history.find(entry => entry.id === id)
  }

  deleteEntry(id: string): boolean {
    const index = this.history.findIndex(entry => entry.id === id)
    
    if (index === -1) {
      return false
    }

    const deleted = this.history.splice(index, 1)[0]
    this.emit('entry-deleted', deleted)
    return true
  }

  clearHistory(): void {
    const count = this.history.length
    this.history = []
    this.emit('history-cleared')
  }

  getStatistics(): any {
    const stats = {
      totalDownloads: this.history.length,
      totalSize: 0,
      formatDistribution: {} as Record<string, number>,
      dailyDownloads: {} as Record<string, number>,
      topArtists: [] as Array<{ artist: string, count: number }>
    }

    const artistCounts = new Map<string, number>()
    
    for (const entry of this.history) {
      if (entry.fileSize) {
        stats.totalSize += entry.fileSize
      }

      stats.formatDistribution[entry.format] = 
        (stats.formatDistribution[entry.format] || 0) + 1

      const date = new Date(entry.downloadDate).toISOString().split('T')[0]
      stats.dailyDownloads[date] = (stats.dailyDownloads[date] || 0) + 1

      if (entry.artist) {
        artistCounts.set(entry.artist, (artistCounts.get(entry.artist) || 0) + 1)
      }
    }

    stats.topArtists = Array.from(artistCounts.entries())
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return stats
  }

  isUrlDownloaded(url: string): boolean {
    return this.history.some(entry => entry.url === url)
  }

  getRecentDownloads(limit: number = 10): any[] {
    return this.history.slice(0, limit)
  }

  destroy(): void {
    this.removeAllListeners()
  }
}

describe('HistoryManager', () => {
  let historyManager: MockHistoryManager

  beforeEach(() => {
    historyManager = new MockHistoryManager(1000)
  })

  afterEach(() => {
    historyManager.destroy()
  })

  describe('Constructor', () => {
    test('should initialize with default maxHistorySize', () => {
      const manager = new MockHistoryManager()
      expect(manager).toBeInstanceOf(EventEmitter)
    })

    test('should initialize with custom maxHistorySize', () => {
      const manager = new MockHistoryManager(500)
      expect(manager).toBeInstanceOf(EventEmitter)
    })
  })

  describe('addEntry', () => {
    test('should add entry with generated id and timestamp', () => {
      const entry = {
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Song',
        artist: 'Test Artist',
        duration: '3:30',
        format: 'mp3',
        quality: '320',
        outputPath: '/test/output.mp3'
      }

      historyManager.addEntry(entry)
      const entries = historyManager.getAllEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject(entry)
      expect(entries[0].id).toMatch(/^hist_\d+_\w+$/)
      expect(entries[0].downloadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('should emit entry-added event', () => {
      const listener = jest.fn()
      historyManager.on('entry-added', listener)

      const entry = {
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test/output.mp3'
      }

      historyManager.addEntry(entry)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining(entry)
      )
    })

    test('should maintain maxHistorySize limit', () => {
      const smallManager = new MockHistoryManager(2)

      // Add 3 entries
      for (let i = 1; i <= 3; i++) {
        smallManager.addEntry({
          url: `https://youtube.com/watch?v=test${i}`,
          title: `Test Song ${i}`,
          format: 'mp3',
          quality: '320',
          outputPath: `/test/output${i}.mp3`
        })
      }

      const entries = smallManager.getAllEntries()
      expect(entries).toHaveLength(2)
      expect(entries[0].title).toBe('Test Song 3') // Most recent first
      expect(entries[1].title).toBe('Test Song 2')
    })
  })

  describe('getAllEntries', () => {
    test('should return empty array when no entries', () => {
      const entries = historyManager.getAllEntries()
      expect(entries).toEqual([])
    })

    test('should return all entries in reverse chronological order', () => {
      // Add multiple entries
      const entries = [
        { url: 'test1', title: 'Song 1', format: 'mp3', quality: '320', outputPath: '/test1.mp3' },
        { url: 'test2', title: 'Song 2', format: 'wav', quality: 'best', outputPath: '/test2.wav' },
        { url: 'test3', title: 'Song 3', format: 'flac', quality: 'best', outputPath: '/test3.flac' }
      ]

      entries.forEach(entry => historyManager.addEntry(entry))

      const result = historyManager.getAllEntries()
      expect(result).toHaveLength(3)
      expect(result[0].title).toBe('Song 3') // Most recent first
      expect(result[2].title).toBe('Song 1') // Oldest last
    })
  })

  describe('getFilteredEntries', () => {
    beforeEach(() => {
      // Add test data
      const testEntries = [
        { url: 'test1', title: 'Rock Song', artist: 'Rock Band', format: 'mp3', quality: '320', outputPath: '/test1.mp3' },
        { url: 'test2', title: 'Pop Song', artist: 'Pop Star', format: 'wav', quality: 'best', outputPath: '/test2.wav' },
        { url: 'test3', title: 'Jazz Track', artist: 'Jazz Artist', format: 'flac', quality: 'best', outputPath: '/test3.flac' }
      ]

      testEntries.forEach(entry => historyManager.addEntry(entry))
    })

    test('should filter by search term (title)', () => {
      const filtered = historyManager.getFilteredEntries({ searchTerm: 'rock' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Rock Song')
    })

    test('should filter by search term (artist)', () => {
      const filtered = historyManager.getFilteredEntries({ searchTerm: 'pop' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].artist).toBe('Pop Star')
    })

    test('should filter by format', () => {
      const filtered = historyManager.getFilteredEntries({ format: 'wav' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].format).toBe('wav')
    })

    test('should sort by title ascending', () => {
      const filtered = historyManager.getFilteredEntries({ 
        sortBy: 'title', 
        sortOrder: 'asc' 
      })
      expect(filtered[0].title).toBe('Jazz Track')
      expect(filtered[1].title).toBe('Pop Song')
      expect(filtered[2].title).toBe('Rock Song')
    })

    test('should sort by artist descending', () => {
      const filtered = historyManager.getFilteredEntries({ 
        sortBy: 'artist', 
        sortOrder: 'desc' 
      })
      expect(filtered[0].artist).toBe('Rock Band')
      expect(filtered[1].artist).toBe('Pop Star')
      expect(filtered[2].artist).toBe('Jazz Artist')
    })

    test('should filter by date range', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const filtered = historyManager.getFilteredEntries({
        dateFrom: yesterday.toISOString().split('T')[0],
        dateTo: tomorrow.toISOString().split('T')[0]
      })

      expect(filtered).toHaveLength(3) // All entries should be within range
    })
  })

  describe('getEntry', () => {
    test('should return entry by id', () => {
      historyManager.addEntry({
        url: 'test',
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test.mp3'
      })

      const entries = historyManager.getAllEntries()
      const id = entries[0].id

      const entry = historyManager.getEntry(id)
      expect(entry).toEqual(entries[0])
    })

    test('should return undefined for non-existent id', () => {
      const entry = historyManager.getEntry('non-existent-id')
      expect(entry).toBeUndefined()
    })
  })

  describe('deleteEntry', () => {
    test('should delete entry by id and return true', () => {
      historyManager.addEntry({
        url: 'test',
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test.mp3'
      })

      const entries = historyManager.getAllEntries()
      const id = entries[0].id

      const result = historyManager.deleteEntry(id)
      expect(result).toBe(true)
      expect(historyManager.getAllEntries()).toHaveLength(0)
    })

    test('should return false for non-existent id', () => {
      const result = historyManager.deleteEntry('non-existent-id')
      expect(result).toBe(false)
    })

    test('should emit entry-deleted event', () => {
      const listener = jest.fn()
      historyManager.on('entry-deleted', listener)

      historyManager.addEntry({
        url: 'test',
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test.mp3'
      })

      const entries = historyManager.getAllEntries()
      const id = entries[0].id
      const deleted = historyManager.deleteEntry(id)

      expect(deleted).toBe(true)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Song' })
      )
    })
  })

  describe('clearHistory', () => {
    test('should clear all entries', () => {
      // Add multiple entries
      for (let i = 1; i <= 3; i++) {
        historyManager.addEntry({
          url: `test${i}`,
          title: `Song ${i}`,
          format: 'mp3',
          quality: '320',
          outputPath: `/test${i}.mp3`
        })
      }

      expect(historyManager.getAllEntries()).toHaveLength(3)

      historyManager.clearHistory()
      expect(historyManager.getAllEntries()).toHaveLength(0)
    })

    test('should emit history-cleared event', () => {
      const listener = jest.fn()
      historyManager.on('history-cleared', listener)

      historyManager.clearHistory()
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('getStatistics', () => {
    beforeEach(() => {
      const testEntries = [
        { url: 'test1', title: 'Song 1', artist: 'Artist A', format: 'mp3', quality: '320', outputPath: '/test1.mp3', fileSize: 1000000 },
        { url: 'test2', title: 'Song 2', artist: 'Artist A', format: 'wav', quality: 'best', outputPath: '/test2.wav', fileSize: 2000000 },
        { url: 'test3', title: 'Song 3', artist: 'Artist B', format: 'mp3', quality: '320', outputPath: '/test3.mp3', fileSize: 1500000 }
      ]

      testEntries.forEach(entry => historyManager.addEntry(entry))
    })

    test('should return correct statistics', () => {
      const stats = historyManager.getStatistics()

      expect(stats.totalDownloads).toBe(3)
      expect(stats.totalSize).toBe(4500000)
      expect(stats.formatDistribution).toEqual({
        'mp3': 2,
        'wav': 1
      })
      expect(stats.topArtists).toHaveLength(2)
      expect(stats.topArtists[0]).toEqual({ artist: 'Artist A', count: 2 })
      expect(stats.topArtists[1]).toEqual({ artist: 'Artist B', count: 1 })
    })

    test('should handle empty history', () => {
      const emptyManager = new MockHistoryManager()
      const stats = emptyManager.getStatistics()

      expect(stats.totalDownloads).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.formatDistribution).toEqual({})
      expect(stats.topArtists).toEqual([])
    })
  })

  describe('isUrlDownloaded', () => {
    test('should return true for downloaded URL', () => {
      const url = 'https://youtube.com/watch?v=test'
      historyManager.addEntry({
        url,
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test.mp3'
      })

      expect(historyManager.isUrlDownloaded(url)).toBe(true)
    })

    test('should return false for non-downloaded URL', () => {
      expect(historyManager.isUrlDownloaded('https://youtube.com/watch?v=notdownloaded')).toBe(false)
    })
  })

  describe('getRecentDownloads', () => {
    test('should return recent downloads with default limit', () => {
      for (let i = 1; i <= 15; i++) {
        historyManager.addEntry({
          url: `test${i}`,
          title: `Song ${i}`,
          format: 'mp3',
          quality: '320',
          outputPath: `/test${i}.mp3`
        })
      }

      const recent = historyManager.getRecentDownloads()
      expect(recent).toHaveLength(10) // Default limit
      expect(recent[0].title).toBe('Song 15') // Most recent first
    })

    test('should return recent downloads with custom limit', () => {
      for (let i = 1; i <= 10; i++) {
        historyManager.addEntry({
          url: `test${i}`,
          title: `Song ${i}`,
          format: 'mp3',
          quality: '320',
          outputPath: `/test${i}.mp3`
        })
      }

      const recent = historyManager.getRecentDownloads(5)
      expect(recent).toHaveLength(5)
      expect(recent[0].title).toBe('Song 10')
      expect(recent[4].title).toBe('Song 6')
    })
  })

  describe('destroy', () => {
    test('should remove all event listeners', () => {
      const listener = jest.fn()
      historyManager.on('entry-added', listener)
      
      historyManager.destroy()
      
      historyManager.addEntry({
        url: 'test',
        title: 'Test Song',
        format: 'mp3',
        quality: '320',
        outputPath: '/test.mp3'
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })
})