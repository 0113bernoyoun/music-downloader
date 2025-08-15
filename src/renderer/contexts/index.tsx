import React, { ReactNode } from 'react'
import { AppProvider } from './AppContext'
import { DownloadProvider } from './DownloadContext'
import { SettingsProvider } from './SettingsContext'

interface ContextProvidersProps {
  children: ReactNode
}

export const ContextProviders: React.FC<ContextProvidersProps> = ({ children }) => {
  return (
    <AppProvider>
      <SettingsProvider>
        <DownloadProvider>
          {children}
        </DownloadProvider>
      </SettingsProvider>
    </AppProvider>
  )
}

// Re-export all contexts and hooks for convenience
export { useApp } from './AppContext'
export { useDownload } from './DownloadContext'
export { useSettings } from './SettingsContext'

export type { Settings, DownloadOptions, DownloadProgress, DownloadResult, VideoMetadata, ErrorInfo } from '../types'