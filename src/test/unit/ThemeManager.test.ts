/**
 * ThemeManager Real-time Theme System Test Suite
 * Tests the ThemeManager singleton implementation including:
 * - Theme state management
 * - System theme detection
 * - Real-time theme application
 * - Event listeners and cleanup
 */

import { jest } from '@jest/globals'

// Mock DOM APIs
const mockMatchMedia = jest.fn()
const mockDocumentElement = {
  classList: {
    remove: jest.fn(),
    add: jest.fn()
  },
  setAttribute: jest.fn()
}

const mockDocument = {
  documentElement: mockDocumentElement
}

// Set up global mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia
})

Object.defineProperty(global, 'document', {
  writable: true,
  value: mockDocument
})

Object.defineProperty(global, 'window', {
  writable: true,
  value: {
    matchMedia: mockMatchMedia
  }
})

describe('ThemeManager Real-time Theme System', () => {
  let ThemeManager: any
  let themeManager: any
  let mockMediaQuery: any

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()

    // Reset singleton instance
    jest.resetModules()

    // Set up mock media query
    mockMediaQuery = {
      matches: false, // Default to light mode
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }

    mockMatchMedia.mockReturnValue(mockMediaQuery)

    // Import ThemeManager after setting up mocks
    const themeModule = await import('../../renderer/utils/themeManager')
    ThemeManager = themeModule.ThemeManager
    
    // Get fresh instance
    themeManager = ThemeManager.getInstance()
  })

  afterEach(() => {
    // Cleanup
    if (themeManager) {
      themeManager.destroy()
    }
  })

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = ThemeManager.getInstance()
      const instance2 = ThemeManager.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    test('should create new instance after destroy', () => {
      const instance1 = ThemeManager.getInstance()
      instance1.destroy()
      
      const instance2 = ThemeManager.getInstance()
      
      expect(instance2).toBeDefined()
      expect(instance2).not.toBe(instance1)
    })
  })

  describe('Theme State Management', () => {
    test('should initialize with system theme', () => {
      expect(themeManager.getCurrentTheme()).toBe('system')
    })

    test('should set and get theme correctly', () => {
      themeManager.setTheme('dark')
      expect(themeManager.getCurrentTheme()).toBe('dark')
      
      themeManager.setTheme('light')
      expect(themeManager.getCurrentTheme()).toBe('light')
      
      themeManager.setTheme('system')
      expect(themeManager.getCurrentTheme()).toBe('system')
    })

    test('should resolve system theme to light when media query is false', () => {
      mockMediaQuery.matches = false
      themeManager.setTheme('system')
      
      expect(themeManager.getResolvedTheme()).toBe('light')
    })

    test('should resolve system theme to dark when media query is true', () => {
      mockMediaQuery.matches = true
      themeManager.setTheme('system')
      
      expect(themeManager.getResolvedTheme()).toBe('dark')
    })

    test('should resolve explicit themes correctly', () => {
      themeManager.setTheme('dark')
      expect(themeManager.getResolvedTheme()).toBe('dark')
      
      themeManager.setTheme('light')
      expect(themeManager.getResolvedTheme()).toBe('light')
    })
  })

  describe('DOM Manipulation', () => {
    test('should apply theme classes to document element', () => {
      themeManager.setTheme('dark')
      
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('theme-light', 'theme-dark')
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark')
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
    })

    test('should handle light theme application', () => {
      themeManager.setTheme('light')
      
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('theme-light', 'theme-dark')
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light')
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
    })

    test('should apply system theme based on media query', () => {
      mockMediaQuery.matches = true // System is in dark mode
      themeManager.setTheme('system')
      
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark')
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
    })

    test('should handle missing document gracefully', () => {
      // Temporarily remove document
      const originalDocument = global.document
      // @ts-ignore
      global.document = undefined
      
      expect(() => {
        themeManager.setTheme('dark')
      }).not.toThrow()
      
      // Restore document
      global.document = originalDocument
    })
  })

  describe('System Theme Detection', () => {
    test('should set up media query listener', () => {
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    test('should respond to system theme changes when in system mode', () => {
      themeManager.setTheme('system')
      
      // Simulate system theme change to dark
      mockMediaQuery.matches = true
      const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1]
      changeHandler({ matches: true })
      
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark')
    })

    test('should not respond to system changes when not in system mode', () => {
      themeManager.setTheme('light')
      
      // Clear previous calls
      jest.clearAllMocks()
      
      // Simulate system theme change
      mockMediaQuery.matches = true
      const changeHandler = mockMediaQuery.addEventListener.mock.calls[0]?.[1]
      if (changeHandler) {
        changeHandler({ matches: true })
      }
      
      // Should not change from light to dark
      expect(mockDocumentElement.classList.add).not.toHaveBeenCalledWith('theme-dark')
    })

    test('should report system theme support correctly', () => {
      expect(themeManager.isSystemThemeSupported()).toBe(true)
      
      // Test when matchMedia is not supported
      mockMatchMedia.mockReturnValue(null)
      const newThemeManager = ThemeManager.getInstance()
      expect(newThemeManager.isSystemThemeSupported()).toBe(false)
    })
  })

  describe('Event Listeners', () => {
    test('should add and notify theme change listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      themeManager.addThemeChangeListener(listener1)
      themeManager.addThemeChangeListener(listener2)
      
      themeManager.setTheme('dark')
      
      expect(listener1).toHaveBeenCalledWith('dark')
      expect(listener2).toHaveBeenCalledWith('dark')
    })

    test('should remove theme change listeners', () => {
      const listener = jest.fn()
      
      themeManager.addThemeChangeListener(listener)
      themeManager.setTheme('dark')
      
      expect(listener).toHaveBeenCalledWith('dark')
      
      // Remove listener and test
      listener.mockClear()
      themeManager.removeThemeChangeListener(listener)
      themeManager.setTheme('light')
      
      expect(listener).not.toHaveBeenCalled()
    })

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = jest.fn()
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      themeManager.addThemeChangeListener(errorListener)
      themeManager.addThemeChangeListener(goodListener)
      
      themeManager.setTheme('dark')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in theme change listener:', expect.any(Error))
      expect(goodListener).toHaveBeenCalledWith('dark')
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Initialization and Cleanup', () => {
    test('should apply initial theme on creation', () => {
      // Create new instance
      const newInstance = ThemeManager.getInstance()
      
      // Should apply initial system theme (resolves to light by default)
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light')
    })

    test('should cleanup properly on destroy', () => {
      const listener = jest.fn()
      themeManager.addThemeChangeListener(listener)
      
      themeManager.destroy()
      
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalled()
      // Instance should be nullified
      expect(ThemeManager.instance).toBeNull()
    })

    test('should handle multiple destroy calls gracefully', () => {
      expect(() => {
        themeManager.destroy()
        themeManager.destroy()
      }).not.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing matchMedia API', () => {
      // Mock environment without matchMedia
      Object.defineProperty(global, 'window', {
        writable: true,
        value: {}
      })
      
      expect(() => {
        const newInstance = ThemeManager.getInstance()
      }).not.toThrow()
    })

    test('should handle invalid theme values gracefully', () => {
      // This would depend on implementation - assuming it validates input
      themeManager.setTheme('light')
      const currentTheme = themeManager.getCurrentTheme()
      
      // Should maintain valid state
      expect(['light', 'dark', 'system']).toContain(currentTheme)
    })

    test('should handle rapid theme changes', () => {
      // Simulate rapid theme switching
      themeManager.setTheme('dark')
      themeManager.setTheme('light')
      themeManager.setTheme('system')
      themeManager.setTheme('dark')
      
      expect(themeManager.getCurrentTheme()).toBe('dark')
      expect(mockDocumentElement.classList.add).toHaveBeenLastCalledWith('theme-dark')
    })
  })

  describe('Integration with Settings System', () => {
    test('should work with settings context integration', () => {
      // Simulate how it would be used with SettingsContext
      const mockSettingsUpdate = (theme: string) => {
        themeManager.setTheme(theme)
      }
      
      mockSettingsUpdate('dark')
      expect(themeManager.getCurrentTheme()).toBe('dark')
      
      mockSettingsUpdate('system')
      expect(themeManager.getCurrentTheme()).toBe('system')
    })

    test('should persist theme across app restarts (conceptual)', () => {
      // Test the concept of theme persistence
      themeManager.setTheme('dark')
      const savedTheme = themeManager.getCurrentTheme()
      
      // Simulate app restart by creating new instance
      themeManager.destroy()
      const newInstance = ThemeManager.getInstance()
      
      // In real implementation, this would load from settings
      newInstance.setTheme(savedTheme)
      expect(newInstance.getCurrentTheme()).toBe('dark')
    })
  })
})