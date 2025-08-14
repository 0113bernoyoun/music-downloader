import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Download related APIs
  startDownload: (options: any) => ipcRenderer.invoke('download:start', options),
  pauseDownload: (id: string) => ipcRenderer.invoke('download:pause', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('download:resume', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('download:cancel', id),
  getDownloadProgress: (id: string) => ipcRenderer.invoke('download:progress', id),

  // Metadata related APIs
  extractMetadata: (url: string) => ipcRenderer.invoke('metadata:extract', url),
  validateUrl: (url: string) => ipcRenderer.invoke('metadata:validate', url),

  // Settings related APIs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),

  // File system related APIs
  selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
  openDownloadFolder: (path: string) => ipcRenderer.invoke('fs:open-folder', path),

  // Event listeners
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download:progress-update', (_, progress) => callback(progress))
  },
  onDownloadComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('download:complete', (_, result) => callback(result))
  },
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('error', (_, error) => callback(error))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}