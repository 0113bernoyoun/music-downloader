import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { EventEmitter } from 'events'
import { Settings } from '../../renderer/types'

export interface SettingsChangeEvent {
  key: keyof Settings
  oldValue: any
  newValue: any
}

export class SettingsManager extends EventEmitter {
  private settings: Settings
  private settingsPath: string
  private defaultSettings: Settings

  constructor() {
    super()
    
    // Initialize settings path
    const userDataPath = app.getPath('userData')
    const configDir = join(userDataPath, 'config')
    
    // Ensure config directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }
    
    this.settingsPath = join(configDir, 'settings.json')
    
    // Define default settings
    this.defaultSettings = {
      defaultOutputPath: app.getPath('downloads'),
      defaultFormat: 'mp3',
      defaultQuality: '320',
      maxConcurrentDownloads: 3,
      enableNotifications: true,
      theme: 'system'
    }

    // Load settings from file or use defaults
    this.settings = this.loadSettings()
    
    console.log(`Settings loaded from: ${this.settingsPath}`)
    console.log('Current settings:', this.settings)
  }

  /**
   * Get all settings
   */
  getSettings(): Settings {
    return { ...this.settings }
  }

  /**
   * Get a specific setting value
   */
  getSetting<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key]
  }

  /**
   * Update multiple settings
   */
  updateSettings(newSettings: Partial<Settings>): void {
    const oldSettings = { ...this.settings }
    
    // Apply updates
    Object.entries(newSettings).forEach(([key, value]) => {
      const typedKey = key as keyof Settings
      if (this.isValidSettingValue(typedKey, value)) {
        const oldValue = this.settings[typedKey]
        this.settings[typedKey] = value as any
        
        // Emit change event if value actually changed
        if (oldValue !== value) {
          this.emit('settingChanged', {
            key: typedKey,
            oldValue,
            newValue: value
          } as SettingsChangeEvent)
        }
      } else {
        console.warn(`Invalid value for setting ${key}:`, value)
      }
    })

    // Save to file
    this.saveSettings()
    
    console.log('Settings updated:', newSettings)
    this.emit('settingsUpdated', { ...this.settings })
  }

  /**
   * Update a single setting
   */
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.updateSettings({ [key]: value } as Partial<Settings>)
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): void {
    console.log('Resetting settings to defaults')
    this.settings = { ...this.defaultSettings }
    this.saveSettings()
    this.emit('settingsReset', { ...this.settings })
    this.emit('settingsUpdated', { ...this.settings })
  }

  /**
   * Reset a specific setting to its default value
   */
  resetSetting<K extends keyof Settings>(key: K): void {
    const defaultValue = this.defaultSettings[key]
    this.updateSetting(key, defaultValue)
  }

  /**
   * Get default settings
   */
  getDefaultSettings(): Settings {
    return { ...this.defaultSettings }
  }

  /**
   * Check if a setting exists
   */
  hasSetting(key: string): key is keyof Settings {
    return key in this.defaultSettings
  }

  /**
   * Validate the entire settings object
   */
  validateSettings(settings: Partial<Settings>): boolean {
    try {
      // Check required properties
      const requiredKeys: (keyof Settings)[] = [
        'defaultOutputPath',
        'defaultFormat',
        'defaultQuality',
        'maxConcurrentDownloads',
        'enableNotifications',
        'theme'
      ]

      for (const key of requiredKeys) {
        if (key in settings && !this.isValidSettingValue(key, settings[key])) {
          console.error(`Invalid value for required setting ${key}:`, settings[key])
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Settings validation error:', error)
      return false
    }
  }

  /**
   * Export settings to a file
   */
  exportSettings(filePath: string): void {
    try {
      const exportData = {
        version: '1.0.0',
        exported: new Date().toISOString(),
        settings: this.settings
      }
      
      writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      console.log(`Settings exported to: ${filePath}`)
    } catch (error) {
      console.error('Failed to export settings:', error)
      throw new Error(`Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Import settings from a file
   */
  importSettings(filePath: string): void {
    try {
      if (!existsSync(filePath)) {
        throw new Error('Settings file not found')
      }

      const importData = JSON.parse(readFileSync(filePath, 'utf-8'))
      
      if (importData.settings && this.validateSettings(importData.settings)) {
        this.updateSettings(importData.settings)
        console.log(`Settings imported from: ${filePath}`)
      } else {
        throw new Error('Invalid settings file format')
      }
    } catch (error) {
      console.error('Failed to import settings:', error)
      throw new Error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get settings file path
   */
  getSettingsPath(): string {
    return this.settingsPath
  }

  /**
   * Check if settings file exists
   */
  settingsFileExists(): boolean {
    return existsSync(this.settingsPath)
  }

  /**
   * Load settings from file
   */
  private loadSettings(): Settings {
    try {
      if (existsSync(this.settingsPath)) {
        const fileContent = readFileSync(this.settingsPath, 'utf-8')
        const loadedSettings = JSON.parse(fileContent)
        
        // Validate loaded settings
        if (this.validateSettings(loadedSettings)) {
          // Merge with defaults to ensure all keys exist
          return { ...this.defaultSettings, ...loadedSettings }
        } else {
          console.warn('Invalid settings file, using defaults')
          return { ...this.defaultSettings }
        }
      } else {
        console.log('Settings file not found, using defaults')
        return { ...this.defaultSettings }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      console.log('Using default settings')
      return { ...this.defaultSettings }
    }
  }

  /**
   * Save settings to file
   */
  private saveSettings(): void {
    try {
      // Create a clean copy of settings without nested structures
      const cleanSettings = { ...this.settings }
      
      // Remove any accidentally nested settings properties
      delete (cleanSettings as any).settings
      delete (cleanSettings as any).version
      delete (cleanSettings as any).lastModified
      
      const settingsData = {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        settings: cleanSettings
      }
      
      writeFileSync(this.settingsPath, JSON.stringify(settingsData, null, 2), 'utf-8')
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new Error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate a specific setting value
   */
  private isValidSettingValue<K extends keyof Settings>(key: K, value: any): value is Settings[K] {
    switch (key) {
      case 'defaultOutputPath':
        return typeof value === 'string' && value.length > 0

      case 'defaultFormat':
        return ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(value)

      case 'defaultQuality':
        return ['128', '192', '320', 'best'].includes(value)

      case 'maxConcurrentDownloads':
        return typeof value === 'number' && value >= 1 && value <= 10

      case 'enableNotifications':
        return typeof value === 'boolean'

      case 'theme':
        return ['light', 'dark', 'system'].includes(value)

      default:
        return false
    }
  }

  /**
   * Get setting metadata (description, type, etc.)
   */
  getSettingMetadata(): Record<keyof Settings, any> {
    return {
      defaultOutputPath: {
        type: 'string',
        description: 'Default directory for downloaded files',
        required: true
      },
      defaultFormat: {
        type: 'enum',
        options: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
        description: 'Default audio format for downloads',
        required: true
      },
      defaultQuality: {
        type: 'enum',
        options: ['128', '192', '320', 'best'],
        description: 'Default audio quality/bitrate',
        required: true
      },
      maxConcurrentDownloads: {
        type: 'number',
        min: 1,
        max: 10,
        description: 'Maximum number of simultaneous downloads',
        required: true
      },
      enableNotifications: {
        type: 'boolean',
        description: 'Show desktop notifications for completed downloads',
        required: true
      },
      theme: {
        type: 'enum',
        options: ['light', 'dark', 'system'],
        description: 'Application theme preference',
        required: true
      }
    }
  }

  /**
   * Clean up and save settings before app exit
   */
  public cleanup(): void {
    try {
      this.saveSettings()
      console.log('Settings cleanup completed')
    } catch (error) {
      console.error('Settings cleanup error:', error)
    }
  }
}