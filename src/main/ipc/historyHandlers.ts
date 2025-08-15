import { ipcMain, dialog, BrowserWindow } from 'electron'
import { HistoryManager, HistoryFilter, HistoryEntry } from '../core/HistoryManager'

let historyManager: HistoryManager | null = null

/**
 * Initialize history handlers with a HistoryManager instance
 */
export function initializeHistoryHandlers(manager: HistoryManager) {
  historyManager = manager
  
  // Get all history entries
  ipcMain.handle('history:get-all', async () => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const entries = historyManager.getAllEntries()
      return { success: true, data: entries }
    } catch (error) {
      console.error('Failed to get history entries:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Get filtered history entries
  ipcMain.handle('history:get-filtered', async (_, filter: HistoryFilter) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const entries = historyManager.getFilteredEntries(filter)
      return { success: true, data: entries }
    } catch (error) {
      console.error('Failed to get filtered history:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Get single history entry
  ipcMain.handle('history:get-entry', async (_, id: string) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const entry = historyManager.getEntry(id)
      if (!entry) {
        return { success: false, error: 'Entry not found' }
      }
      return { success: true, data: entry }
    } catch (error) {
      console.error('Failed to get history entry:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Delete history entry
  ipcMain.handle('history:delete-entry', async (_, id: string) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const deleted = historyManager.deleteEntry(id)
      if (!deleted) {
        return { success: false, error: 'Entry not found' }
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to delete history entry:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Clear all history
  ipcMain.handle('history:clear-all', async () => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      historyManager.clearHistory()
      return { success: true }
    } catch (error) {
      console.error('Failed to clear history:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Get history statistics
  ipcMain.handle('history:get-statistics', async () => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const stats = historyManager.getStatistics()
      return { success: true, data: stats }
    } catch (error) {
      console.error('Failed to get history statistics:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Get recent downloads
  ipcMain.handle('history:get-recent', async (_, limit: number = 10) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const recent = historyManager.getRecentDownloads(limit)
      return { success: true, data: recent }
    } catch (error) {
      console.error('Failed to get recent downloads:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Check if URL has been downloaded
  ipcMain.handle('history:check-url', async (_, url: string) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const isDownloaded = historyManager.isUrlDownloaded(url)
      return { success: true, data: isDownloaded }
    } catch (error) {
      console.error('Failed to check URL:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Export history to file
  ipcMain.handle('history:export', async (event) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        throw new Error('Window not found')
      }

      const result = await dialog.showSaveDialog(window, {
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

      await historyManager.exportHistory(result.filePath)
      return { success: true, data: result.filePath }
      
    } catch (error) {
      console.error('Failed to export history:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Import history from file
  ipcMain.handle('history:import', async (event, merge: boolean = false) => {
    if (!historyManager) {
      throw new Error('HistoryManager not initialized')
    }
    
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        throw new Error('Window not found')
      }

      const result = await dialog.showOpenDialog(window, {
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

      const count = await historyManager.importHistory(result.filePaths[0], merge)
      return { success: true, data: count }
      
    } catch (error) {
      console.error('Failed to import history:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })

  // Listen for history events and forward to renderer
  historyManager.on('entry-added', (entry: HistoryEntry) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('history:entry-added', entry)
    })
  })

  historyManager.on('entry-deleted', (entry: HistoryEntry) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('history:entry-deleted', entry)
    })
  })

  historyManager.on('history-cleared', () => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('history:cleared')
    })
  })

  historyManager.on('history-imported', (count: number) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('history:imported', count)
    })
  })

  console.log('History IPC handlers initialized')
}

/**
 * Get the current HistoryManager instance
 */
export function getHistoryManager(): HistoryManager | null {
  return historyManager
}