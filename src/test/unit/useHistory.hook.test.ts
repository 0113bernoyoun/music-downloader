/**
 * Unit tests for useHistory hook
 * Tests state management, API interactions, and real-time updates
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { useHistory } from '../../renderer/hooks/useHistory'

// Mock window.api
const mockApi = {
  getAllHistory: jest.fn(),
  getFilteredHistory: jest.fn(),
  getHistoryEntry: jest.fn(),
  deleteHistoryEntry: jest.fn(),
  clearHistory: jest.fn(),
  getHistoryStatistics: jest.fn(),
  getRecentDownloads: jest.fn(),
  checkUrlDownloaded: jest.fn(),
  exportHistory: jest.fn(),
  importHistory: jest.fn(),
  onHistoryEntryAdded: jest.fn(),
  onHistoryEntryDeleted: jest.fn(),
  onHistoryCleared: jest.fn(),
  onHistoryImported: jest.fn()
}

// Mock window object
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

// Sample test data
const mockHistoryEntries = [
  {
    id: 'hist_1',
    url: 'https://youtube.com/watch?v=test1',
    title: 'Test Song 1',
    artist: 'Test Artist 1',
    duration: '3:30',
    format: 'mp3',
    quality: '320',
    outputPath: '/test/song1.mp3',
    downloadDate: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'hist_2',
    url: 'https://youtube.com/watch?v=test2',
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    duration: '4:15',
    format: 'wav',
    quality: 'best',
    outputPath: '/test/song2.wav',
    downloadDate: '2024-01-14T09:00:00.000Z'
  }
]

const mockStatistics = {
  totalDownloads: 2,
  totalSize: 15728640,
  formatDistribution: { mp3: 1, wav: 1 },
  dailyDownloads: { '2024-01-15': 1, '2024-01-14': 1 },
  topArtists: [
    { artist: 'Test Artist 1', count: 1 },
    { artist: 'Test Artist 2', count: 1 }
  ]
}

describe('useHistory Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock implementations
    mockApi.getAllHistory.mockResolvedValue({
      success: true,
      data: mockHistoryEntries
    })

    mockApi.getFilteredHistory.mockResolvedValue({
      success: true,
      data: mockHistoryEntries
    })

    mockApi.getHistoryStatistics.mockResolvedValue({
      success: true,
      data: mockStatistics
    })

    // Mock event listeners to return cleanup functions
    mockApi.onHistoryEntryAdded.mockReturnValue(() => {})
    mockApi.onHistoryEntryDeleted.mockReturnValue(() => {})
    mockApi.onHistoryCleared.mockReturnValue(() => {})
    mockApi.onHistoryImported.mockReturnValue(() => {})
  })

  describe('Initial State', () => {
    test('should initialize with correct default values', () => {
      const { result } = renderHook(() => useHistory())

      expect(result.current.history).toEqual([])
      expect(result.current.filteredHistory).toEqual([])
      expect(result.current.statistics).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.filter).toEqual({
        searchTerm: '',
        sortBy: 'date',
        sortOrder: 'desc'
      })
    })
  })

  describe('Data Loading', () => {
    test('should load history and statistics on mount', async () => {
      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.history).toEqual(mockHistoryEntries)
      expect(result.current.filteredHistory).toEqual(mockHistoryEntries)
      expect(result.current.statistics).toEqual(mockStatistics)
      expect(mockApi.getAllHistory).toHaveBeenCalled()
      expect(mockApi.getHistoryStatistics).toHaveBeenCalled()
    })

    test('should handle loading error', async () => {
      const errorMessage = 'Failed to load history'
      mockApi.getAllHistory.mockResolvedValue({
        success: false,
        error: errorMessage
      })

      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.history).toEqual([])
    })

    test('should handle API exception', async () => {
      const errorMessage = 'Network error'
      mockApi.getAllHistory.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(`Failed to load history: ${errorMessage}`)
    })
  })

  describe('Filter Management', () => {
    test('should apply filters when filter changes', async () => {
      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Apply filter
      act(() => {
        result.current.setFilter({
          searchTerm: 'test',
          sortBy: 'title',
          sortOrder: 'asc'
        })
      })

      await waitFor(() => {
        expect(mockApi.getFilteredHistory).toHaveBeenCalledWith({
          searchTerm: 'test',
          sortBy: 'title',
          sortOrder: 'asc'
        })
      })

      expect(result.current.filter.searchTerm).toBe('test')
      expect(result.current.filter.sortBy).toBe('title')
      expect(result.current.filter.sortOrder).toBe('asc')
    })

    test('should clear filters', async () => {
      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Set filter first
      act(() => {
        result.current.setFilter({
          searchTerm: 'test',
          format: 'mp3'
        })
      })

      // Then clear
      act(() => {
        result.current.clearFilter()
      })

      expect(result.current.filter).toEqual({
        searchTerm: '',
        sortBy: 'date',
        sortOrder: 'desc'
      })
    })
  })

  describe('Entry Management', () => {
    test('should delete entry successfully', async () => {
      mockApi.deleteHistoryEntry.mockResolvedValue({
        success: true
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let deleteResult: boolean
      await act(async () => {
        deleteResult = await result.current.deleteEntry('hist_1')
      })

      expect(deleteResult!).toBe(true)
      expect(mockApi.deleteHistoryEntry).toHaveBeenCalledWith('hist_1')
      expect(mockApi.getHistoryStatistics).toHaveBeenCalled()
    })

    test('should handle delete entry failure', async () => {
      const errorMessage = 'Entry not found'
      mockApi.deleteHistoryEntry.mockResolvedValue({
        success: false,
        error: errorMessage
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let deleteResult: boolean
      await act(async () => {
        deleteResult = await result.current.deleteEntry('non-existent')
      })

      expect(deleteResult!).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    test('should clear history successfully', async () => {
      mockApi.clearHistory.mockResolvedValue({
        success: true
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let clearResult: boolean
      await act(async () => {
        clearResult = await result.current.clearHistory()
      })

      expect(clearResult!).toBe(true)
      expect(mockApi.clearHistory).toHaveBeenCalled()
      expect(result.current.history).toEqual([])
      expect(result.current.filteredHistory).toEqual([])
      expect(result.current.statistics).toBeNull()
    })
  })

  describe('Import/Export Functionality', () => {
    test('should export history successfully', async () => {
      const exportPath = '/test/export.json'
      mockApi.exportHistory.mockResolvedValue({
        success: true,
        data: exportPath
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let exportResult: string | null
      await act(async () => {
        exportResult = await result.current.exportHistory()
      })

      expect(exportResult!).toBe(exportPath)
      expect(mockApi.exportHistory).toHaveBeenCalled()
    })

    test('should handle export failure', async () => {
      const errorMessage = 'Export cancelled'
      mockApi.exportHistory.mockResolvedValue({
        success: false,
        error: errorMessage
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let exportResult: string | null
      await act(async () => {
        exportResult = await result.current.exportHistory()
      })

      expect(exportResult!).toBeNull()
      expect(result.current.error).toBe(errorMessage)
    })

    test('should import history successfully', async () => {
      const importCount = 5
      mockApi.importHistory.mockResolvedValue({
        success: true,
        data: importCount
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let importResult: number | null
      await act(async () => {
        importResult = await result.current.importHistory(true)
      })

      expect(importResult!).toBe(importCount)
      expect(mockApi.importHistory).toHaveBeenCalledWith(true)
      expect(mockApi.getAllHistory).toHaveBeenCalledTimes(2) // Initial + after import
    })
  })

  describe('URL Checking', () => {
    test('should check if URL is downloaded', async () => {
      const url = 'https://youtube.com/watch?v=test'
      mockApi.checkUrlDownloaded.mockResolvedValue({
        success: true,
        data: true
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let isDownloaded: boolean
      await act(async () => {
        isDownloaded = await result.current.checkUrlDownloaded(url)
      })

      expect(isDownloaded!).toBe(true)
      expect(mockApi.checkUrlDownloaded).toHaveBeenCalledWith(url)
    })

    test('should handle URL check failure', async () => {
      const url = 'https://youtube.com/watch?v=test'
      mockApi.checkUrlDownloaded.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let isDownloaded: boolean
      await act(async () => {
        isDownloaded = await result.current.checkUrlDownloaded(url)
      })

      expect(isDownloaded!).toBe(false)
    })
  })

  describe('Recent Downloads', () => {
    test('should get recent downloads with default limit', async () => {
      const recentEntries = [mockHistoryEntries[0]]
      mockApi.getRecentDownloads.mockResolvedValue({
        success: true,
        data: recentEntries
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let recent: any[]
      await act(async () => {
        recent = await result.current.getRecentDownloads()
      })

      expect(recent!).toEqual(recentEntries)
      expect(mockApi.getRecentDownloads).toHaveBeenCalledWith(10)
    })

    test('should get recent downloads with custom limit', async () => {
      const recentEntries = [mockHistoryEntries[0]]
      mockApi.getRecentDownloads.mockResolvedValue({
        success: true,
        data: recentEntries
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let recent: any[]
      await act(async () => {
        recent = await result.current.getRecentDownloads(5)
      })

      expect(recent!).toEqual(recentEntries)
      expect(mockApi.getRecentDownloads).toHaveBeenCalledWith(5)
    })
  })

  describe('Real-time Updates', () => {
    test('should set up event listeners on mount', () => {
      renderHook(() => useHistory())

      expect(mockApi.onHistoryEntryAdded).toHaveBeenCalled()
      expect(mockApi.onHistoryEntryDeleted).toHaveBeenCalled()
      expect(mockApi.onHistoryCleared).toHaveBeenCalled()
      expect(mockApi.onHistoryImported).toHaveBeenCalled()
    })

    test('should handle new entry added event', async () => {
      let entryAddedCallback: (entry: any) => void

      mockApi.onHistoryEntryAdded.mockImplementation((callback) => {
        entryAddedCallback = callback
        return () => {}
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newEntry = {
        id: 'hist_3',
        title: 'New Song',
        artist: 'New Artist',
        format: 'flac'
      }

      // Simulate entry added event
      act(() => {
        entryAddedCallback!(newEntry)
      })

      expect(result.current.history).toContainEqual(newEntry)
      expect(mockApi.getHistoryStatistics).toHaveBeenCalled()
    })

    test('should handle entry deleted event', async () => {
      let entryDeletedCallback: (entry: any) => void

      mockApi.onHistoryEntryDeleted.mockImplementation((callback) => {
        entryDeletedCallback = callback
        return () => {}
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const deletedEntry = mockHistoryEntries[0]

      // Simulate entry deleted event
      act(() => {
        entryDeletedCallback!(deletedEntry)
      })

      expect(result.current.history).not.toContainEqual(deletedEntry)
      expect(mockApi.getHistoryStatistics).toHaveBeenCalled()
    })

    test('should handle history cleared event', async () => {
      let historyClearedCallback: () => void

      mockApi.onHistoryCleared.mockImplementation((callback) => {
        historyClearedCallback = callback
        return () => {}
      })

      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate history cleared event
      act(() => {
        historyClearedCallback!()
      })

      expect(result.current.history).toEqual([])
      expect(result.current.filteredHistory).toEqual([])
      expect(result.current.statistics).toBeNull()
    })
  })

  describe('Memory Management', () => {
    test('should cleanup event listeners on unmount', () => {
      const unsubscribeFunctions = [jest.fn(), jest.fn(), jest.fn(), jest.fn()]

      mockApi.onHistoryEntryAdded.mockReturnValue(unsubscribeFunctions[0])
      mockApi.onHistoryEntryDeleted.mockReturnValue(unsubscribeFunctions[1])
      mockApi.onHistoryCleared.mockReturnValue(unsubscribeFunctions[2])
      mockApi.onHistoryImported.mockReturnValue(unsubscribeFunctions[3])

      const { unmount } = renderHook(() => useHistory())

      unmount()

      unsubscribeFunctions.forEach(fn => {
        expect(fn).toHaveBeenCalled()
      })
    })
  })

  describe('Error Recovery', () => {
    test('should maintain state consistency after API errors', async () => {
      const { result } = renderHook(() => useHistory())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Cause an error
      mockApi.deleteHistoryEntry.mockResolvedValue({
        success: false,
        error: 'Delete failed'
      })

      await act(async () => {
        await result.current.deleteEntry('hist_1')
      })

      // State should remain consistent
      expect(result.current.history).toEqual(mockHistoryEntries)
      expect(result.current.error).toContain('Delete failed')
      expect(result.current.loading).toBe(false)
    })

    test('should allow retry after error', async () => {
      // First call fails
      mockApi.getAllHistory.mockResolvedValueOnce({
        success: false,
        error: 'Network error'
      })

      const { result } = renderHook(() => useHistory())

      await waitFor(() => {
        expect(result.current.error).toContain('Network error')
      })

      // Second call succeeds
      mockApi.getAllHistory.mockResolvedValue({
        success: true,
        data: mockHistoryEntries
      })

      await act(async () => {
        await result.current.loadHistory()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.history).toEqual(mockHistoryEntries)
    })
  })
})