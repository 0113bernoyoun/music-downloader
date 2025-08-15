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

  // Playlist related APIs
  getPlaylistStatus: (playlistId: string) => Promise<PlaylistDownloadResult>

  // Metadata related APIs
  extractMetadata: (url: string) => Promise<VideoMetadata>
  validateUrl: (url: string) => Promise<boolean>

  // Settings related APIs
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<void>

  // File system related APIs
  selectDirectory: () => Promise<string | null>
  openDownloadFolder: (path: string) => Promise<void>

  // History related APIs
  getAllHistory: () => Promise<HistoryResponse<HistoryEntry[]>>
  getFilteredHistory: (filter: HistoryFilter) => Promise<HistoryResponse<HistoryEntry[]>>
  getHistoryEntry: (id: string) => Promise<HistoryResponse<HistoryEntry>>
  deleteHistoryEntry: (id: string) => Promise<HistoryResponse<void>>
  clearHistory: () => Promise<HistoryResponse<void>>
  getHistoryStatistics: () => Promise<HistoryResponse<HistoryStatistics>>
  getRecentDownloads: (limit?: number) => Promise<HistoryResponse<HistoryEntry[]>>
  checkUrlDownloaded: (url: string) => Promise<HistoryResponse<boolean>>
  exportHistory: () => Promise<HistoryResponse<string>>
  importHistory: (merge?: boolean) => Promise<HistoryResponse<number>>

  // Event listeners - return cleanup functions
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
  onDownloadComplete: (callback: (result: DownloadResult) => void) => () => void
  onConversionProgress: (callback: (progress: ConversionProgress) => void) => () => void
  onSettingsUpdated: (callback: (settings: Settings) => void) => () => void
  onError: (callback: (error: ErrorInfo) => void) => () => void
  onHistoryEntryAdded: (callback: (entry: HistoryEntry) => void) => () => void
  onHistoryEntryDeleted: (callback: (entry: HistoryEntry) => void) => () => void
  onHistoryCleared: (callback: () => void) => () => void
  onHistoryImported: (callback: (count: number) => void) => () => void

  // Playlist event listeners
  onPlaylistProgress: (callback: (progress: PlaylistProgress) => void) => () => void
  onPlaylistComplete: (callback: (result: PlaylistDownloadResult) => void) => () => void
  
  // Utility methods
  removeAllListeners: () => void
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
  status: 'pending' | 'downloading' | 'converting' | 'completed' | 'failed' | 'paused'
  currentFile?: string
  isPlaylist?: boolean
  playlistIndex?: number
  playlistTotal?: number
}

export interface PlaylistProgress {
  id: string
  playlistTitle: string
  totalVideos: number
  completedVideos: number
  failedVideos: number
  inProgressVideos?: number
  queuedVideos?: number
  skippedVideos?: number
  currentVideo?: any
  status: 'started' | 'downloading' | 'completed'
}

export interface PlaylistDownloadResult {
  id?: string
  playlistTitle: string
  totalVideos: number
  successfulDownloads: number
  failedVideos: number
  skippedVideos: number
  completedTasks: any[]
  failedTasks: any[]
  skippedTasks: any[]
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

export interface ConversionProgress {
  id: string
  progress: number // 0-100
  speed?: string
  eta?: string
  status: 'pending' | 'converting' | 'completed' | 'failed'
}

export interface ErrorInfo {
  type: 'download' | 'network' | 'conversion' | 'filesystem' | 'validation' | 'metadata' | 'playlist'
  message: string
  details?: unknown
  downloadId?: string
  playlistId?: string
}

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

export interface HistoryStatistics {
  totalDownloads: number
  totalSize: number
  formatDistribution: Record<string, number>
  dailyDownloads: Record<string, number>
  topArtists: Array<{ artist: string, count: number }>
}

export interface HistoryResponse<T> {
  success: boolean
  data?: T
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}