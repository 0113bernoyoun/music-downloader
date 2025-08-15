import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { 
  DownloadOptions, 
  Settings, 
  DownloadProgress, 
  DownloadResult, 
  ErrorInfo,
  HistoryFilter,
  HistoryEntry,
  HistoryResponse,
  HistoryStatistics,
  PlaylistProgress,
  PlaylistDownloadResult
} from '../renderer/types'

// Additional interfaces for conversion progress
export interface ConversionProgress {
  id: string
  progress: number // 0-100
  speed?: string
  eta?: string
  status: 'pending' | 'converting' | 'completed' | 'failed'
}

// Custom APIs for renderer
const api = {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Download related APIs
  startDownload: (options: DownloadOptions) => ipcRenderer.invoke('download:start', options),
  pauseDownload: (id: string) => ipcRenderer.invoke('download:pause', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('download:resume', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('download:cancel', id),
  getDownloadProgress: (id: string) => ipcRenderer.invoke('download:progress', id),

  // Playlist related APIs
  getPlaylistStatus: (playlistId: string) => ipcRenderer.invoke('playlist:status', playlistId),

  // Metadata related APIs
  extractMetadata: (url: string) => ipcRenderer.invoke('metadata:extract', url),
  validateUrl: (url: string) => ipcRenderer.invoke('metadata:validate', url),

  // Settings related APIs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke('settings:update', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: (merge?: boolean) => ipcRenderer.invoke('settings:import', merge),
  validateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke('settings:validate', settings),
  getDefaultSettings: () => ipcRenderer.invoke('settings:get-defaults'),
  getSettingMetadata: () => ipcRenderer.invoke('settings:get-metadata'),

  // File system related APIs
  selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
  openDownloadFolder: (path: string) => ipcRenderer.invoke('fs:open-folder', path),

  // History related APIs
  getAllHistory: (): Promise<HistoryResponse<HistoryEntry[]>> => 
    ipcRenderer.invoke('history:get-all'),
  getFilteredHistory: (filter: HistoryFilter): Promise<HistoryResponse<HistoryEntry[]>> => 
    ipcRenderer.invoke('history:get-filtered', filter),
  getHistoryEntry: (id: string): Promise<HistoryResponse<HistoryEntry>> => 
    ipcRenderer.invoke('history:get-entry', id),
  deleteHistoryEntry: (id: string): Promise<HistoryResponse<void>> => 
    ipcRenderer.invoke('history:delete-entry', id),
  clearHistory: (): Promise<HistoryResponse<void>> => 
    ipcRenderer.invoke('history:clear-all'),
  getHistoryStatistics: (): Promise<HistoryResponse<HistoryStatistics>> => 
    ipcRenderer.invoke('history:get-statistics'),
  getRecentDownloads: (limit?: number): Promise<HistoryResponse<HistoryEntry[]>> => 
    ipcRenderer.invoke('history:get-recent', limit),
  checkUrlDownloaded: (url: string): Promise<HistoryResponse<boolean>> => 
    ipcRenderer.invoke('history:check-url', url),
  exportHistory: (): Promise<HistoryResponse<string>> => 
    ipcRenderer.invoke('history:export'),
  importHistory: (merge?: boolean): Promise<HistoryResponse<number>> => 
    ipcRenderer.invoke('history:import', merge),

  // Event listeners - Following security best practices by filtering event data
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('download:progress-update', (_, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('download:progress-update')
  },
  onDownloadComplete: (callback: (result: DownloadResult) => void) => {
    ipcRenderer.on('download:complete', (_, result) => callback(result))
    return () => ipcRenderer.removeAllListeners('download:complete')
  },
  onConversionProgress: (callback: (progress: ConversionProgress) => void) => {
    ipcRenderer.on('conversion:progress-update', (_, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('conversion:progress-update')
  },
  onSettingsUpdated: (callback: (settings: Settings) => void) => {
    ipcRenderer.on('settings:updated', (_, settings) => callback(settings))
    return () => ipcRenderer.removeAllListeners('settings:updated')
  },
  onError: (callback: (error: ErrorInfo) => void) => {
    ipcRenderer.on('error', (_, error) => callback(error))
    return () => ipcRenderer.removeAllListeners('error')
  },
  onHistoryEntryAdded: (callback: (entry: HistoryEntry) => void) => {
    ipcRenderer.on('history:entry-added', (_, entry) => callback(entry))
    return () => ipcRenderer.removeAllListeners('history:entry-added')
  },
  onHistoryEntryDeleted: (callback: (entry: HistoryEntry) => void) => {
    ipcRenderer.on('history:entry-deleted', (_, entry) => callback(entry))
    return () => ipcRenderer.removeAllListeners('history:entry-deleted')
  },
  onHistoryCleared: (callback: () => void) => {
    ipcRenderer.on('history:cleared', () => callback())
    return () => ipcRenderer.removeAllListeners('history:cleared')
  },
  onHistoryImported: (callback: (count: number) => void) => {
    ipcRenderer.on('history:imported', (_, count) => callback(count))
    return () => ipcRenderer.removeAllListeners('history:imported')
  },

  // Playlist event listeners
  onPlaylistProgress: (callback: (progress: PlaylistProgress) => void) => {
    ipcRenderer.on('playlist:progress-update', (_, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('playlist:progress-update')
  },
  onPlaylistComplete: (callback: (result: PlaylistDownloadResult) => void) => {
    ipcRenderer.on('playlist:complete', (_, result) => callback(result))
    return () => ipcRenderer.removeAllListeners('playlist:complete')
  },

  // Utility methods
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('download:progress-update')
    ipcRenderer.removeAllListeners('download:complete')
    ipcRenderer.removeAllListeners('conversion:progress-update')
    ipcRenderer.removeAllListeners('settings:updated')
    ipcRenderer.removeAllListeners('error')
    ipcRenderer.removeAllListeners('history:entry-added')
    ipcRenderer.removeAllListeners('history:entry-deleted')
    ipcRenderer.removeAllListeners('history:cleared')
    ipcRenderer.removeAllListeners('history:imported')
    ipcRenderer.removeAllListeners('playlist:progress-update')
    ipcRenderer.removeAllListeners('playlist:complete')
  }
}

// Custom electron API with versions info
const customElectronAPI = {
  ...electronAPI,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    v8: process.versions.v8
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', customElectronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = customElectronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}