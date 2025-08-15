import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { DownloadOptions, DownloadProgress, DownloadResult, ErrorInfo, VideoMetadata } from '../types'

interface DownloadState {
  activeDownloads: Map<string, DownloadProgress>
  completedDownloads: DownloadResult[]
  downloadQueue: DownloadOptions[]
  isDownloading: boolean
  errors: ErrorInfo[]
}

interface DownloadContextType {
  state: DownloadState
  startDownload: (options: DownloadOptions) => Promise<string | null>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  clearDownload: (id: string) => void
  clearAllDownloads: () => void
  validateUrl: (url: string) => Promise<boolean>
  extractMetadata: (url: string) => Promise<VideoMetadata | null>
}

const defaultState: DownloadState = {
  activeDownloads: new Map(),
  completedDownloads: [],
  downloadQueue: [],
  isDownloading: false,
  errors: []
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

interface DownloadProviderProps {
  children: ReactNode
}

export const DownloadProvider: React.FC<DownloadProviderProps> = ({ children }) => {
  const [state, setState] = useState<DownloadState>(defaultState)

  const startDownload = useCallback(async (options: DownloadOptions): Promise<string | null> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const downloadId = await window.api.startDownload(options)
      
      setState(prev => ({
        ...prev,
        isDownloading: true,
        activeDownloads: new Map(prev.activeDownloads).set(downloadId, {
          id: downloadId,
          progress: 0,
          speed: '0 B/s',
          eta: '00:00:00',
          status: 'pending'
        })
      }))

      return downloadId
    } catch (error) {
      const errorInfo: ErrorInfo = {
        type: 'download',
        message: error instanceof Error ? error.message : 'Unknown download error'
      }
      
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorInfo]
      }))
      
      return null
    }
  }, [])

  const pauseDownload = useCallback(async (id: string): Promise<void> => {
    try {
      if (window.api) {
        await window.api.pauseDownload(id)
      }
    } catch (error) {
      console.error('Failed to pause download:', error)
    }
  }, [])

  const resumeDownload = useCallback(async (id: string): Promise<void> => {
    try {
      if (window.api) {
        await window.api.resumeDownload(id)
      }
    } catch (error) {
      console.error('Failed to resume download:', error)
    }
  }, [])

  const cancelDownload = useCallback(async (id: string): Promise<void> => {
    try {
      if (window.api) {
        await window.api.cancelDownload(id)
      }
      
      setState(prev => {
        const newActiveDownloads = new Map(prev.activeDownloads)
        newActiveDownloads.delete(id)
        
        return {
          ...prev,
          activeDownloads: newActiveDownloads,
          isDownloading: newActiveDownloads.size > 0
        }
      })
    } catch (error) {
      console.error('Failed to cancel download:', error)
    }
  }, [])

  const clearDownload = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      completedDownloads: prev.completedDownloads.filter(d => d.id !== id)
    }))
  }, [])

  const clearAllDownloads = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeDownloads: new Map(),
      completedDownloads: [],
      isDownloading: false
    }))
  }, [])

  const validateUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      if (!window.api) {return false}
      return await window.api.validateUrl(url)
    } catch (error) {
      console.error('Failed to validate URL:', error)
      return false
    }
  }, [])

  const extractMetadata = useCallback(async (url: string): Promise<VideoMetadata | null> => {
    try {
      if (!window.api) {return null}
      return await window.api.extractMetadata(url)
    } catch (error) {
      console.error('Failed to extract metadata:', error)
      
      // Return fallback metadata if extraction fails
      return {
        title: 'Unknown Title',
        artist: 'Unknown Artist', 
        duration: 'Unknown',
        thumbnail: '',
        url: url,
        description: 'Metadata extraction failed',
        uploadDate: undefined,
        viewCount: undefined
      }
    }
  }, [])

  // Set up event listeners for download progress
  useEffect(() => {
    if (!window.api) {return}

    const progressCleanup = window.api.onDownloadProgress((progress: DownloadProgress) => {
      setState(prev => {
        const newActiveDownloads = new Map(prev.activeDownloads)
        newActiveDownloads.set(progress.id, progress)
        
        return {
          ...prev,
          activeDownloads: newActiveDownloads
        }
      })
    })

    const completeCleanup = window.api.onDownloadComplete((result: DownloadResult) => {
      setState(prev => {
        const newActiveDownloads = new Map(prev.activeDownloads)
        newActiveDownloads.delete(result.id)
        
        return {
          ...prev,
          activeDownloads: newActiveDownloads,
          completedDownloads: [...prev.completedDownloads, result],
          isDownloading: newActiveDownloads.size > 0
        }
      })
    })

    const errorCleanup = window.api.onError((error: ErrorInfo) => {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, error]
      }))
    })

    return () => {
      progressCleanup?.()
      completeCleanup?.()
      errorCleanup?.()
    }
  }, [])

  // Context value를 useMemo로 메모이제이션하여 불필요한 리렌더링 방지
  const value: DownloadContextType = useMemo(() => ({
    state,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    clearDownload,
    clearAllDownloads,
    validateUrl,
    extractMetadata
  }), [state, startDownload, pauseDownload, resumeDownload, cancelDownload, clearDownload, clearAllDownloads, validateUrl, extractMetadata])

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  )
}

export const useDownload = (): DownloadContextType => {
  const context = useContext(DownloadContext)
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider')
  }
  return context
}