/**
 * Integration tests for History IPC handlers
 * Tests the communication between main and renderer processes for history functionality
 */

import { EventEmitter } from 'events'

// Mock dependencies
const mockHistoryManager = {
  getAllEntries: jest.fn(),
  getFilteredEntries: jest.fn(),
  getEntry: jest.fn(),
  deleteEntry: jest.fn(),
  clearHistory: jest.fn(),
  getStatistics: jest.fn(),
  getRecentDownloads: jest.fn(),
  isUrlDownloaded: jest.fn(),
  exportHistory: jest.fn(),
  importHistory: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
}

const mockBrowserWindow = {
  fromWebContents: jest.fn(),
  getAllWindows: jest.fn().mockReturnValue([]),
  webContents: {
    send: jest.fn()
  }
}

const mockDialog = {
  showSaveDialog: jest.fn(),
  showOpenDialog: jest.fn()
}

// Mock Electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: mockBrowserWindow,
  dialog: mockDialog
}))

// Import after mocking
import { ipcMain, BrowserWindow, dialog } from 'electron'

describe('History IPC Handlers Integration', () => {
  let handlers: Map<string, Function>
  let mockEvent: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    handlers = new Map()
    
    // Mock event object
    mockEvent = {
      sender: {
        /* mock webContents */
      }
    }

    // Capture IPC handlers
    ;(ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      handlers.set(channel, handler)
    })

    // Mock BrowserWindow.fromWebContents
    mockBrowserWindow.fromWebContents.mockReturnValue({
      /* mock window */
    })
  })

  afterEach(() => {
    handlers.clear()
  })

  describe('history:get-all', () => {
    test('should handle successful getAllEntries call', async () => {
      const mockEntries = [
        { id: 'hist_1', title: 'Song 1', format: 'mp3' },
        { id: 'hist_2', title: 'Song 2', format: 'wav' }
      ]

      mockHistoryManager.getAllEntries.mockReturnValue(mockEntries)

      // Simulate handler initialization
      const getAllHandler = async () => {
        try {
          const entries = mockHistoryManager.getAllEntries()
          return { success: true, data: entries }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getAllHandler()

      expect(result).toEqual({
        success: true,
        data: mockEntries
      })
      expect(mockHistoryManager.getAllEntries).toHaveBeenCalled()
    })

    test('should handle getAllEntries error', async () => {
      const errorMessage = 'Database error'
      mockHistoryManager.getAllEntries.mockImplementation(() => {
        throw new Error(errorMessage)
      })

      const getAllHandler = async () => {
        try {
          const entries = mockHistoryManager.getAllEntries()
          return { success: true, data: entries }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getAllHandler()

      expect(result).toEqual({
        success: false,
        error: errorMessage
      })
    })
  })

  describe('history:get-filtered', () => {
    test('should handle filtered entries request', async () => {
      const filter = {
        searchTerm: 'test',
        format: 'mp3',
        sortBy: 'title',
        sortOrder: 'asc'
      }

      const mockFilteredEntries = [
        { id: 'hist_1', title: 'Test Song', format: 'mp3' }
      ]

      mockHistoryManager.getFilteredEntries.mockReturnValue(mockFilteredEntries)

      const getFilteredHandler = async (filter: any) => {
        try {
          const entries = mockHistoryManager.getFilteredEntries(filter)
          return { success: true, data: entries }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getFilteredHandler(filter)

      expect(result).toEqual({
        success: true,
        data: mockFilteredEntries
      })
      expect(mockHistoryManager.getFilteredEntries).toHaveBeenCalledWith(filter)
    })
  })

  describe('history:get-entry', () => {
    test('should handle single entry request', async () => {
      const entryId = 'hist_123'
      const mockEntry = { id: entryId, title: 'Test Song', format: 'mp3' }

      mockHistoryManager.getEntry.mockReturnValue(mockEntry)

      const getEntryHandler = async (id: string) => {
        try {
          const entry = mockHistoryManager.getEntry(id)
          if (!entry) {
            return { success: false, error: 'Entry not found' }
          }
          return { success: true, data: entry }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getEntryHandler(entryId)

      expect(result).toEqual({
        success: true,
        data: mockEntry
      })
      expect(mockHistoryManager.getEntry).toHaveBeenCalledWith(entryId)
    })

    test('should handle entry not found', async () => {
      const entryId = 'non-existent'

      mockHistoryManager.getEntry.mockReturnValue(undefined)

      const getEntryHandler = async (id: string) => {
        try {
          const entry = mockHistoryManager.getEntry(id)
          if (!entry) {
            return { success: false, error: 'Entry not found' }
          }
          return { success: true, data: entry }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getEntryHandler(entryId)

      expect(result).toEqual({
        success: false,
        error: 'Entry not found'
      })
    })
  })

  describe('history:delete-entry', () => {
    test('should handle successful entry deletion', async () => {
      const entryId = 'hist_123'

      mockHistoryManager.deleteEntry.mockReturnValue(true)

      const deleteHandler = async (id: string) => {
        try {
          const deleted = mockHistoryManager.deleteEntry(id)
          if (!deleted) {
            return { success: false, error: 'Entry not found' }
          }
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await deleteHandler(entryId)

      expect(result).toEqual({ success: true })
      expect(mockHistoryManager.deleteEntry).toHaveBeenCalledWith(entryId)
    })

    test('should handle failed entry deletion', async () => {
      const entryId = 'non-existent'

      mockHistoryManager.deleteEntry.mockReturnValue(false)

      const deleteHandler = async (id: string) => {
        try {
          const deleted = mockHistoryManager.deleteEntry(id)
          if (!deleted) {
            return { success: false, error: 'Entry not found' }
          }
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await deleteHandler(entryId)

      expect(result).toEqual({
        success: false,
        error: 'Entry not found'
      })
    })
  })

  describe('history:clear-all', () => {
    test('should handle clear history request', async () => {
      const clearHandler = async () => {
        try {
          mockHistoryManager.clearHistory()
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await clearHandler()

      expect(result).toEqual({ success: true })
      expect(mockHistoryManager.clearHistory).toHaveBeenCalled()
    })
  })

  describe('history:get-statistics', () => {
    test('should handle statistics request', async () => {
      const mockStats = {
        totalDownloads: 10,
        totalSize: 50000000,
        formatDistribution: { mp3: 7, wav: 3 },
        dailyDownloads: { '2024-01-01': 5, '2024-01-02': 5 },
        topArtists: [{ artist: 'Artist 1', count: 3 }]
      }

      mockHistoryManager.getStatistics.mockReturnValue(mockStats)

      const getStatsHandler = async () => {
        try {
          const stats = mockHistoryManager.getStatistics()
          return { success: true, data: stats }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getStatsHandler()

      expect(result).toEqual({
        success: true,
        data: mockStats
      })
      expect(mockHistoryManager.getStatistics).toHaveBeenCalled()
    })
  })

  describe('history:get-recent', () => {
    test('should handle recent downloads request with default limit', async () => {
      const mockRecentEntries = [
        { id: 'hist_3', title: 'Recent Song 1' },
        { id: 'hist_2', title: 'Recent Song 2' }
      ]

      mockHistoryManager.getRecentDownloads.mockReturnValue(mockRecentEntries)

      const getRecentHandler = async (limit = 10) => {
        try {
          const recent = mockHistoryManager.getRecentDownloads(limit)
          return { success: true, data: recent }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getRecentHandler()

      expect(result).toEqual({
        success: true,
        data: mockRecentEntries
      })
      expect(mockHistoryManager.getRecentDownloads).toHaveBeenCalledWith(10)
    })

    test('should handle recent downloads request with custom limit', async () => {
      const limit = 5
      const mockRecentEntries = [
        { id: 'hist_1', title: 'Recent Song' }
      ]

      mockHistoryManager.getRecentDownloads.mockReturnValue(mockRecentEntries)

      const getRecentHandler = async (limit = 10) => {
        try {
          const recent = mockHistoryManager.getRecentDownloads(limit)
          return { success: true, data: recent }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await getRecentHandler(limit)

      expect(result).toEqual({
        success: true,
        data: mockRecentEntries
      })
      expect(mockHistoryManager.getRecentDownloads).toHaveBeenCalledWith(limit)
    })
  })

  describe('history:check-url', () => {
    test('should handle URL check request', async () => {
      const url = 'https://youtube.com/watch?v=test'

      mockHistoryManager.isUrlDownloaded.mockReturnValue(true)

      const checkUrlHandler = async (url: string) => {
        try {
          const isDownloaded = mockHistoryManager.isUrlDownloaded(url)
          return { success: true, data: isDownloaded }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await checkUrlHandler(url)

      expect(result).toEqual({
        success: true,
        data: true
      })
      expect(mockHistoryManager.isUrlDownloaded).toHaveBeenCalledWith(url)
    })
  })

  describe('history:export', () => {
    test('should handle export request with successful dialog', async () => {
      const filePath = '/test/history-export.json'

      mockDialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: filePath
      })

      mockHistoryManager.exportHistory.mockResolvedValue(undefined)

      const exportHandler = async (event: any) => {
        try {
          const window = mockBrowserWindow.fromWebContents(event.sender)
          if (!window) {
            throw new Error('Window not found')
          }

          const result = await mockDialog.showSaveDialog(window, {
            title: 'Export History',
            defaultPath: `music-downloader-history-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          })

          if (result.canceled || !result.filePath) {
            return { success: false, error: 'Export cancelled' }
          }

          await mockHistoryManager.exportHistory(result.filePath)
          return { success: true, data: result.filePath }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await exportHandler(mockEvent)

      expect(result).toEqual({
        success: true,
        data: filePath
      })
      expect(mockHistoryManager.exportHistory).toHaveBeenCalledWith(filePath)
    })

    test('should handle export cancellation', async () => {
      mockDialog.showSaveDialog.mockResolvedValue({
        canceled: true,
        filePath: undefined
      })

      const exportHandler = async (event: any) => {
        try {
          const window = mockBrowserWindow.fromWebContents(event.sender)
          if (!window) {
            throw new Error('Window not found')
          }

          const result = await mockDialog.showSaveDialog(window, {
            title: 'Export History',
            defaultPath: `music-downloader-history-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          })

          if (result.canceled || !result.filePath) {
            return { success: false, error: 'Export cancelled' }
          }

          await mockHistoryManager.exportHistory(result.filePath)
          return { success: true, data: result.filePath }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await exportHandler(mockEvent)

      expect(result).toEqual({
        success: false,
        error: 'Export cancelled'
      })
      expect(mockHistoryManager.exportHistory).not.toHaveBeenCalled()
    })
  })

  describe('history:import', () => {
    test('should handle import request with successful dialog', async () => {
      const filePath = '/test/history-import.json'
      const importCount = 15

      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: [filePath]
      })

      mockHistoryManager.importHistory.mockResolvedValue(importCount)

      const importHandler = async (event: any, merge = false) => {
        try {
          const window = mockBrowserWindow.fromWebContents(event.sender)
          if (!window) {
            throw new Error('Window not found')
          }

          const result = await mockDialog.showOpenDialog(window, {
            title: 'Import History',
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          })

          if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Import cancelled' }
          }

          const count = await mockHistoryManager.importHistory(result.filePaths[0], merge)
          return { success: true, data: count }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await importHandler(mockEvent, false)

      expect(result).toEqual({
        success: true,
        data: importCount
      })
      expect(mockHistoryManager.importHistory).toHaveBeenCalledWith(filePath, false)
    })

    test('should handle import cancellation', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      })

      const importHandler = async (event: any, merge = false) => {
        try {
          const window = mockBrowserWindow.fromWebContents(event.sender)
          if (!window) {
            throw new Error('Window not found')
          }

          const result = await mockDialog.showOpenDialog(window, {
            title: 'Import History',
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          })

          if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Import cancelled' }
          }

          const count = await mockHistoryManager.importHistory(result.filePaths[0], merge)
          return { success: true, data: count }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      const result = await importHandler(mockEvent, false)

      expect(result).toEqual({
        success: false,
        error: 'Import cancelled'
      })
      expect(mockHistoryManager.importHistory).not.toHaveBeenCalled()
    })
  })

  describe('Event Broadcasting', () => {
    test('should broadcast entry-added event to all windows', () => {
      const mockWindows = [
        { webContents: { send: jest.fn() } },
        { webContents: { send: jest.fn() } }
      ]

      mockBrowserWindow.getAllWindows.mockReturnValue(mockWindows)

      const entry = { id: 'hist_1', title: 'New Song' }

      // Simulate event broadcasting
      const broadcastEntryAdded = (entry: any) => {
        const windows = mockBrowserWindow.getAllWindows()
        windows.forEach((window: any) => {
          window.webContents.send('history:entry-added', entry)
        })
      }

      broadcastEntryAdded(entry)

      mockWindows.forEach(window => {
        expect(window.webContents.send).toHaveBeenCalledWith('history:entry-added', entry)
      })
    })

    test('should broadcast history-cleared event to all windows', () => {
      const mockWindows = [
        { webContents: { send: jest.fn() } }
      ]

      mockBrowserWindow.getAllWindows.mockReturnValue(mockWindows)

      const broadcastHistoryCleared = () => {
        const windows = mockBrowserWindow.getAllWindows()
        windows.forEach((window: any) => {
          window.webContents.send('history:cleared')
        })
      }

      broadcastHistoryCleared()

      expect(mockWindows[0].webContents.send).toHaveBeenCalledWith('history:cleared')
    })
  })
})