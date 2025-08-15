import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../assets/icon.png?asset'
import { DownloadManager } from './core/DownloadManager'
import { AudioConverter } from './core/AudioConverter'
import { SettingsManager } from './core/SettingsManager'
import { MetadataExtractor } from './core/MetadataExtractor'
import { HistoryManager } from './core/HistoryManager'
import { FileManager } from './utils/FileManager'
import { Logger } from './utils/Logger'
import { initializeHistoryHandlers } from './ipc/historyHandlers'

let mainWindow: BrowserWindow | null = null

// Initialize core services
let downloadManager: DownloadManager
let audioConverter: AudioConverter
let settingsManager: SettingsManager
let metadataExtractor: MetadataExtractor
let historyManager: HistoryManager
let fileManager: FileManager
let logger: Logger

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // 개발용 - 프로덕션에서는 활성화 고려
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    
    // Focus window on development
    if (is.dev) {
      mainWindow?.focus()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open dev tools in development
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.musicdownloader.app')
  
  // Initialize utility services first
  console.log('Initializing utility services...')
  logger = new Logger({
    logLevel: 'info',
    enableConsole: true,
    enableFile: true
  })
  fileManager = new FileManager()
  
  // Initialize core services
  logger.info('Initializing core services...')
  settingsManager = new SettingsManager()
  metadataExtractor = new MetadataExtractor()
  audioConverter = new AudioConverter()
  
  // Initialize history manager
  const maxHistorySize = settingsManager.getSetting('maxHistorySize') || 1000
  historyManager = new HistoryManager(maxHistorySize)
  
  // Get max concurrent downloads from settings
  const maxConcurrent = settingsManager.getSetting('maxConcurrentDownloads')
  downloadManager = new DownloadManager(maxConcurrent)
  
  // Set up event listeners
  setupEventListeners()
  
  // Register IPC handlers
  logger.info('Setting up IPC handlers...')
  initializeHistoryHandlers(historyManager)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app quit request
app.on('before-quit', () => {
  logger?.info('App is about to quit, cleaning up...')
  
  // Cleanup all services
  if (downloadManager) {
    downloadManager.cleanup()
  }
  if (audioConverter) {
    audioConverter.cleanup()
  }
  if (settingsManager) {
    settingsManager.cleanup()
  }
  if (metadataExtractor) {
    metadataExtractor.cleanup()
  }
  if (historyManager) {
    historyManager.destroy()
  }
  if (fileManager) {
    fileManager.cleanup()
  }
  if (logger) {
    logger.info('Cleanup completed')
    logger.cleanup()
  }
})

// Security: Prevent new window creation from renderer
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault()
  })

  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// Setup event listeners for service communication
function setupEventListeners(): void {
  // Download Manager Events
  downloadManager.on('progress', (progress) => {
    // Send progress update to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:progress-update', progress)
    }
  })

  // Playlist Progress Events
  downloadManager.on('playlistProgress', (progress) => {
    // Send playlist progress update to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playlist:progress-update', progress)
    }
  })

  downloadManager.on('playlistComplete', (result) => {
    // Send playlist completion notification to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playlist:complete', result)
    }

    // Show system notification for playlist completion
    if (settingsManager.getSetting('enableNotifications')) {
      const { Notification } = require('electron')
      
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Playlist Download Complete',
          body: `${result.playlistTitle}: ${result.successfulDownloads}/${result.totalVideos} downloads successful`,
          icon: icon
        })
        notification.show()
      }
    }
  })

  downloadManager.on('complete', (result) => {
    // Send completion notification to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:complete', result)
    }

    // Add successful downloads to history
    if (result.success && result.metadata && result.outputPath) {
      const task = downloadManager.getActiveTasks().find(t => t.id === result.id)
      if (task) {
        historyManager.addEntry({
          url: task.options.url,
          title: result.metadata.title,
          artist: result.metadata.artist,
          duration: result.metadata.duration,
          thumbnail: result.metadata.thumbnail,
          format: task.options.format,
          quality: task.options.quality,
          outputPath: result.outputPath,
          fileSize: undefined, // Could be calculated from file stats
          metadata: result.metadata
        })
      }
    }

    // Show system notification if enabled
    if (settingsManager.getSetting('enableNotifications')) {
      const { Notification } = require('electron')
      
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Download Complete',
          body: result.success 
            ? `Successfully downloaded: ${result.metadata?.title || 'Unknown'}`
            : `Download failed: ${result.error || 'Unknown error'}`,
          icon: icon
        })
        notification.show()
      }
    }
  })

  // Audio Converter Events
  audioConverter.on('progress', (progress) => {
    // Send conversion progress to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('conversion:progress-update', progress)
    }
  })

  // Settings Manager Events
  settingsManager.on('settingsUpdated', (newSettings) => {
    // Send settings update to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings:updated', newSettings)
    }
  })

  // Metadata Extractor Events
  metadataExtractor.on('metadataExtracted', ({ url, metadata }) => {
    logger.info(`Metadata extracted for ${url}: ${metadata.title}`, { url, title: metadata.title })
  })

  metadataExtractor.on('extractionError', ({ url, error }) => {
    logger.error(`Metadata extraction failed for ${url}: ${error}`, undefined, { url, error })
    
    // Send error to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('error', {
        type: 'metadata',
        message: `Failed to extract metadata from ${url}`,
        details: error
      })
    }
  })

  // File Manager Events
  fileManager.on('directoryCreated', ({ path }) => {
    logger.info(`Directory created: ${path}`, { path })
  })

  fileManager.on('fileCopied', ({ source, destination }) => {
    logger.info(`File copied: ${source} → ${destination}`, { source, destination })
  })

  fileManager.on('fileMoved', ({ source, destination }) => {
    logger.info(`File moved: ${source} → ${destination}`, { source, destination })
  })

  fileManager.on('fileDeleted', ({ path }) => {
    logger.info(`File deleted: ${path}`, { path })
  })

  fileManager.on('operationFailed', (operation) => {
    logger.error(`File operation failed: ${operation.type}`, undefined, { operation })
  })

  logger.info('Event listeners setup completed')
}

// IPC Handlers

// Window control handlers
ipcMain.handle('window:minimize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.minimize()
  }
})

ipcMain.handle('window:maximize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    if (focusedWindow.isMaximized()) {
      focusedWindow.unmaximize()
    } else {
      focusedWindow.maximize()
    }
  }
})

ipcMain.handle('window:close', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.close()
  }
})

// File system handlers
ipcMain.handle('fs:select-directory', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (!focusedWindow) {return null}

  const result = await dialog.showOpenDialog(focusedWindow, {
    properties: ['openDirectory'],
    title: 'Select Download Directory'
  })

  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:open-folder', async (_, path: string) => {
  try {
    await shell.openPath(path)
  } catch (error) {
    console.error('Failed to open folder:', error)
    throw error
  }
})

// Download functionality handlers
ipcMain.handle('download:start', async (_, options) => {
  try {
    logger.info('Download start requested', { url: options.url, format: options.format, quality: options.quality })
    const downloadId = await downloadManager.startDownload(options)
    return downloadId
  } catch (error) {
    logger.error('Download start failed', error instanceof Error ? error : undefined, { options })
    throw error
  }
})

ipcMain.handle('download:pause', async (_, id: string) => {
  try {
    console.log('Download pause requested:', id)
    await downloadManager.pauseDownload(id)
    return true
  } catch (error) {
    console.error('Download pause failed:', error)
    throw error
  }
})

ipcMain.handle('download:resume', async (_, id: string) => {
  try {
    console.log('Download resume requested:', id)
    await downloadManager.resumeDownload(id)
    return true
  } catch (error) {
    console.error('Download resume failed:', error)
    throw error
  }
})

ipcMain.handle('download:cancel', async (_, id: string) => {
  try {
    console.log('Download cancel requested:', id)
    await downloadManager.cancelDownload(id)
    return true
  } catch (error) {
    console.error('Download cancel failed:', error)
    throw error
  }
})

ipcMain.handle('download:progress', async (_, id: string) => {
  try {
    const progress = downloadManager.getDownloadProgress(id)
    if (!progress) {
      throw new Error(`Download not found: ${id}`)
    }
    return progress
  } catch (error) {
    console.error('Download progress retrieval failed:', error)
    throw error
  }
})

// Playlist functionality handlers
ipcMain.handle('playlist:status', async (_, playlistId: string) => {
  try {
    console.log('Playlist status requested:', playlistId)
    const status = downloadManager.getPlaylistStatus(playlistId)
    if (!status) {
      throw new Error(`Playlist not found: ${playlistId}`)
    }
    return status
  } catch (error) {
    console.error('Playlist status retrieval failed:', error)
    throw error
  }
})

// Metadata functionality handlers
ipcMain.handle('metadata:extract', async (_, url: string) => {
  try {
    logger.info('Metadata extraction requested', { url })
    const metadata = await metadataExtractor.extractVideoMetadata(url)
    return metadata
  } catch (error) {
    logger.error('Metadata extraction failed', error instanceof Error ? error : undefined, { url })
    
    // Return a more user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`동영상에 접근할 수 없습니다. URL을 다시 확인해주세요: ${errorMessage}`)
  }
})

ipcMain.handle('metadata:validate', async (_, url: string) => {
  try {
    console.log('URL validation requested:', url)
    const validation = metadataExtractor.validateUrl(url)
    return validation.isValid
  } catch (error) {
    console.error('URL validation failed:', error)
    return false
  }
})

// Settings functionality handlers
ipcMain.handle('settings:get', async () => {
  try {
    logger.debug('Settings get requested')
    const settings = settingsManager.getSettings()
    return settings
  } catch (error) {
    logger.error('Settings get failed', error instanceof Error ? error : undefined)
    throw error
  }
})

ipcMain.handle('settings:update', async (_, settings) => {
  try {
    logger.info('Settings update requested', { settings })
    settingsManager.updateSettings(settings)
    
    // Update download manager if max concurrent downloads changed
    if (settings.maxConcurrentDownloads && downloadManager) {
      // Note: Current DownloadManager doesn't support runtime max concurrent change
      // This would require a more sophisticated implementation
      logger.warn('Note: Max concurrent downloads change requires app restart')
    }
    
    return true
  } catch (error) {
    logger.error('Settings update failed', error instanceof Error ? error : undefined, { settings })
    throw error
  }
})

// Settings reset handler
ipcMain.handle('settings:reset', async () => {
  try {
    logger.info('Settings reset requested')
    settingsManager.resetToDefaults()
    return true
  } catch (error) {
    logger.error('Settings reset failed', error instanceof Error ? error : undefined)
    throw error
  }
})

// Settings export handler  
ipcMain.handle('settings:export', async () => {
  try {
    logger.debug('Settings export requested')
    const { dialog } = await import('electron')
    
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '설정 내보내기',
      defaultPath: 'music-downloader-settings.json',
      filters: [
        { name: 'JSON 파일', extensions: ['json'] },
        { name: '모든 파일', extensions: ['*'] }
      ]
    })
    
    if (!result.canceled && result.filePath) {
      settingsManager.exportSettings(result.filePath)
      logger.info('Settings exported successfully', { filePath: result.filePath })
      return { success: true, filePath: result.filePath }
    }
    
    return { success: false, error: 'Export cancelled by user' }
  } catch (error) {
    logger.error('Settings export failed', error instanceof Error ? error : undefined)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

// Settings import handler
ipcMain.handle('settings:import', async (_, merge = false) => {
  try {
    logger.debug('Settings import requested', { merge })
    const { dialog } = await import('electron')
    
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '설정 가져오기',
      filters: [
        { name: 'JSON 파일', extensions: ['json'] },
        { name: '모든 파일', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      settingsManager.importSettings(filePath)
      logger.info('Settings imported successfully', { filePath, merge })
      return { success: true, filePath }
    }
    
    return { success: false, error: 'Import cancelled by user' }
  } catch (error) {
    logger.error('Settings import failed', error instanceof Error ? error : undefined)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

// Settings validation handler
ipcMain.handle('settings:validate', async (_, settings) => {
  try {
    logger.debug('Settings validation requested', { settings })
    const isValid = settingsManager.validateSettings(settings)
    return { success: true, isValid }
  } catch (error) {
    logger.error('Settings validation failed', error instanceof Error ? error : undefined)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

// Get default settings handler
ipcMain.handle('settings:get-defaults', async () => {
  try {
    logger.debug('Get default settings requested')
    const defaults = settingsManager.getDefaultSettings()
    return defaults
  } catch (error) {
    logger.error('Get default settings failed', error instanceof Error ? error : undefined)
    throw error
  }
})

// Get setting metadata handler
ipcMain.handle('settings:get-metadata', async () => {
  try {
    logger.debug('Get settings metadata requested')
    const metadata = settingsManager.getSettingMetadata()
    return metadata
  } catch (error) {
    logger.error('Get settings metadata failed', error instanceof Error ? error : undefined)
    throw error
  }
})