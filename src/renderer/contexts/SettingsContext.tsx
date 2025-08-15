import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { Settings } from '../types'
import { themeManager, ThemeType } from '../utils/themeManager'

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>
  resetSettings: () => Promise<void>
  exportSettings: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  importSettings: (merge?: boolean) => Promise<{ success: boolean; filePath?: string; error?: string }>
  validateSettings: (settings: Partial<Settings>) => Promise<{ success: boolean; isValid?: boolean; error?: string }>
  getDefaultSettings: () => Promise<Settings>
  getSettingMetadata: () => Promise<any>
  selectDirectory: () => Promise<string | null>
  openDownloadFolder: (path: string) => Promise<void>
}

const defaultSettings: Settings = {
  defaultOutputPath: '',
  defaultFormat: 'mp3',
  defaultQuality: '192',
  maxConcurrentDownloads: 3,
  enableNotifications: true,
  theme: 'system'
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const updateSettings = useCallback(async (newSettings: Partial<Settings>): Promise<void> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      setSettings(prevSettings => {
        const updatedSettings = { ...prevSettings, ...newSettings }
        
        // 비동기 API 호출
        window.api.updateSettings(updatedSettings).catch(error => {
          console.error('Failed to update settings in backend:', error)
        })

        // 테마 설정 변경 시 실시간 적용
        if ('theme' in newSettings && newSettings.theme) {
          themeManager.setTheme(newSettings.theme as ThemeType)
        }

        return updatedSettings
      })
    } catch (error) {
      console.error('Failed to update settings:', error)
      throw error
    }
  }, [])

  const resetSettings = useCallback(async (): Promise<void> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      await window.api.resetSettings()
      const resetSettings = await window.api.getSettings()
      setSettings(resetSettings)

      // 테마 초기화 시 적용
      themeManager.setTheme(resetSettings.theme as ThemeType)
    } catch (error) {
      console.error('Failed to reset settings:', error)
      throw error
    }
  }, [])

  const exportSettings = useCallback(async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const result = await window.api.exportSettings()
      return result
    } catch (error) {
      console.error('Failed to export settings:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [])

  const importSettings = useCallback(async (merge?: boolean): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const result = await window.api.importSettings(merge)
      if (result.success) {
        // Reload settings after successful import
        const updatedSettings = await window.api.getSettings()
        setSettings(updatedSettings)

        // 테마 설정 가져오기 후 적용
        themeManager.setTheme(updatedSettings.theme as ThemeType)
      }
      return result
    } catch (error) {
      console.error('Failed to import settings:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [])

  const validateSettings = useCallback(async (settingsToValidate: Partial<Settings>): Promise<{ success: boolean; isValid?: boolean; error?: string }> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const result = await window.api.validateSettings(settingsToValidate)
      return result
    } catch (error) {
      console.error('Failed to validate settings:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [])

  const getDefaultSettings = useCallback(async (): Promise<Settings> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const defaults = await window.api.getDefaultSettings()
      return defaults
    } catch (error) {
      console.error('Failed to get default settings:', error)
      throw error
    }
  }, [])

  const getSettingMetadata = useCallback(async (): Promise<any> => {
    try {
      if (!window.api) {
        throw new Error('Electron API not available')
      }

      const metadata = await window.api.getSettingMetadata()
      return metadata
    } catch (error) {
      console.error('Failed to get setting metadata:', error)
      throw error
    }
  }, [])

  const selectDirectory = useCallback(async (): Promise<string | null> => {
    try {
      if (!window.api) {
        console.error('window.api is not available')
        return null
      }
      
      const result = await window.api.selectDirectory()
      return result
    } catch (error) {
      console.error('Failed to select directory:', error)
      return null
    }
  }, [])

  const openDownloadFolder = useCallback(async (path: string): Promise<void> => {
    try {
      if (window.api) {
        await window.api.openDownloadFolder(path)
      }
    } catch (error) {
      console.error('Failed to open download folder:', error)
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.api) {
          const savedSettings = await window.api.getSettings()
          setSettings(savedSettings)

          // 초기 테마 적용
          themeManager.setTheme(savedSettings.theme as ThemeType)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  // Set up settings update listener
  useEffect(() => {
    if (!window.api) {return}

    const cleanup = window.api.onSettingsUpdated((updatedSettings: Settings) => {
      setSettings(updatedSettings)
      
      // 설정 업데이트 시 테마도 같이 적용
      themeManager.setTheme(updatedSettings.theme as ThemeType)
    })

    return cleanup
  }, [])

  // Context value를 useMemo로 메모이제이션하여 불필요한 리렌더링 방지
  const value: SettingsContextType = useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    validateSettings,
    getDefaultSettings,
    getSettingMetadata,
    selectDirectory,
    openDownloadFolder
  }), [settings, updateSettings, resetSettings, exportSettings, importSettings, validateSettings, getDefaultSettings, getSettingMetadata, selectDirectory, openDownloadFolder])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}