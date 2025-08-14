export interface ElectronAPI {
  readonly versions: NodeJS.ProcessVersions
}

export interface API {
  // Window controls
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>

  // Download related APIs
  startDownload: (options: DownloadOptions) => Promise<string>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  getDownloadProgress: (id: string) => Promise<DownloadProgress>

  // Metadata related APIs
  extractMetadata: (url: string) => Promise<VideoMetadata>
  validateUrl: (url: string) => Promise<boolean>

  // Settings related APIs
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<void>

  // File system related APIs
  selectDirectory: () => Promise<string | null>
  openDownloadFolder: (path: string) => Promise<void>

  // Event listeners
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
  onDownloadComplete: (callback: (result: DownloadResult) => void) => void
  onError: (callback: (error: ErrorInfo) => void) => void
}

export interface DownloadOptions {
  url: string
  format: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg'
  quality: '128' | '192' | '320' | 'best'
  outputPath: string
  metadata?: {
    title?: string
    artist?: string
    album?: string
  }
}

export interface DownloadProgress {
  id: string
  progress: number // 0-100
  speed: string // "1.2 MB/s"
  eta: string // "00:05:30"
  status: 'pending' | 'downloading' | 'converting' | 'completed' | 'failed'
  currentFile?: string
}

export interface VideoMetadata {
  title: string
  artist?: string
  duration: string
  thumbnail: string
  url: string
  description?: string
  uploadDate?: string
  viewCount?: number
}

export interface Settings {
  defaultOutputPath: string
  defaultFormat: 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg'
  defaultQuality: '128' | '192' | '320' | 'best'
  maxConcurrentDownloads: number
  enableNotifications: boolean
  theme: 'light' | 'dark' | 'system'
}

export interface DownloadResult {
  id: string
  success: boolean
  outputPath?: string
  error?: string
  metadata?: VideoMetadata
}

export interface ErrorInfo {
  type: 'download' | 'network' | 'conversion' | 'filesystem' | 'validation'
  message: string
  details?: any
  downloadId?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}