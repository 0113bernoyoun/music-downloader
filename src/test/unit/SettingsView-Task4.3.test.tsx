/**
 * Task 4.3 SettingsView UI Functionality Test Suite
 * Tests the new UI features added in Task 4.3:
 * - Import/Export buttons and functionality
 * - Real-time settings validation
 * - Error handling and user feedback
 * - Settings reset functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import SettingsView from '../../renderer/views/SettingsView'

// Mock the settings context
const mockSettingsContext = {
  settings: {
    defaultOutputPath: '/test/downloads',
    defaultFormat: 'mp3',
    defaultQuality: '192',
    maxConcurrentDownloads: 3,
    enableNotifications: true,
    theme: 'system'
  },
  updateSettings: jest.fn(() => Promise.resolve()),
  resetSettings: jest.fn(() => Promise.resolve()),
  exportSettings: jest.fn(() => Promise.resolve({ success: true, filePath: '/test/export.json' })),
  importSettings: jest.fn(() => Promise.resolve({ success: true, filePath: '/test/import.json' })),
  validateSettings: jest.fn(() => Promise.resolve({ success: true, isValid: true })),
  getDefaultSettings: jest.fn(() => Promise.resolve({})),
  getSettingMetadata: jest.fn(() => Promise.resolve({})),
  selectDirectory: jest.fn(() => Promise.resolve('/test/new/path')),
  openDownloadFolder: jest.fn(() => Promise.resolve())
}

// Mock the settings context hook
jest.mock('../../renderer/contexts', () => ({
  useSettings: () => mockSettingsContext
}))

describe('Task 4.3 SettingsView UI Functionality', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('Import/Export Functionality', () => {
    test('should render export button', () => {
      render(<SettingsView />)
      
      const exportButton = screen.getByRole('button', { name: /설정 내보내기/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveTextContent('📤 설정 내보내기')
    })

    test('should render import buttons', () => {
      render(<SettingsView />)
      
      const importButton = screen.getByRole('button', { name: /설정 가져오기/i })
      const mergeImportButton = screen.getByRole('button', { name: /설정 병합 가져오기/i })
      
      expect(importButton).toBeInTheDocument()
      expect(importButton).toHaveTextContent('📥 설정 가져오기')
      expect(mergeImportButton).toBeInTheDocument()
      expect(mergeImportButton).toHaveTextContent('🔄 설정 병합 가져오기 (기존 설정 유지)')
    })

    test('should handle successful export', async () => {
      render(<SettingsView />)
      
      const exportButton = screen.getByRole('button', { name: /설정 내보내기/i })
      
      await user.click(exportButton)
      
      expect(mockSettingsContext.exportSettings).toHaveBeenCalled()
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/설정이 내보내기되었습니다/)).toBeInTheDocument()
      })
    })

    test('should handle export failure', async () => {
      mockSettingsContext.exportSettings.mockResolvedValueOnce({
        success: false,
        error: 'Export failed'
      })
      
      render(<SettingsView />)
      
      const exportButton = screen.getByRole('button', { name: /설정 내보내기/i })
      
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Export failed/)).toBeInTheDocument()
      })
    })

    test('should handle successful import', async () => {
      render(<SettingsView />)
      
      const importButton = screen.getByRole('button', { name: /^📥 설정 가져오기$/i })
      
      await user.click(importButton)
      
      expect(mockSettingsContext.importSettings).toHaveBeenCalledWith(false)
      
      await waitFor(() => {
        expect(screen.getByText(/설정이 가져오기되었습니다/)).toBeInTheDocument()
      })
    })

    test('should handle merge import', async () => {
      render(<SettingsView />)
      
      const mergeImportButton = screen.getByRole('button', { name: /설정 병합 가져오기/i })
      
      await user.click(mergeImportButton)
      
      expect(mockSettingsContext.importSettings).toHaveBeenCalledWith(true)
    })

    test('should disable buttons while saving', async () => {
      render(<SettingsView />)
      
      const exportButton = screen.getByRole('button', { name: /설정 내보내기/i })
      
      // Click export button
      fireEvent.click(exportButton)
      
      // Button should be disabled during save
      expect(exportButton).toBeDisabled()
    })
  })

  describe('Settings Reset Functionality', () => {
    test('should render reset button', () => {
      render(<SettingsView />)
      
      const resetButton = screen.getByRole('button', { name: /모든 설정 초기화/i })
      expect(resetButton).toBeInTheDocument()
      expect(resetButton).toHaveTextContent('🔄 모든 설정 초기화')
    })

    test('should show confirmation dialog for reset', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<SettingsView />)
      
      const resetButton = screen.getByRole('button', { name: /모든 설정 초기화/i })
      
      await user.click(resetButton)
      
      expect(confirmSpy).toHaveBeenCalledWith('모든 설정을 초기화하시겠습니까?')
      expect(mockSettingsContext.resetSettings).toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })

    test('should not reset if user cancels', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
      
      render(<SettingsView />)
      
      const resetButton = screen.getByRole('button', { name: /모든 설정 초기화/i })
      
      await user.click(resetButton)
      
      expect(confirmSpy).toHaveBeenCalled()
      expect(mockSettingsContext.resetSettings).not.toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })

    test('should show success message after reset', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<SettingsView />)
      
      const resetButton = screen.getByRole('button', { name: /모든 설정 초기화/i })
      
      await user.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByText(/설정이 초기화되었습니다/)).toBeInTheDocument()
      })
      
      confirmSpy.mockRestore()
    })
  })

  describe('Real-time Settings Validation', () => {
    test('should validate settings on change', async () => {
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      expect(mockSettingsContext.validateSettings).toHaveBeenCalledWith({
        defaultFormat: 'wav'
      })
    })

    test('should show validation error for invalid settings', async () => {
      mockSettingsContext.validateSettings.mockResolvedValueOnce({
        success: true,
        isValid: false
      })
      
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(screen.getByText(/올바르지 않은 설정 값입니다/)).toBeInTheDocument()
      })
    })

    test('should show validation failure error', async () => {
      mockSettingsContext.validateSettings.mockResolvedValueOnce({
        success: false,
        error: 'Validation service unavailable'
      })
      
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(screen.getByText(/설정 검증 실패: Validation service unavailable/)).toBeInTheDocument()
      })
    })

    test('should update settings after successful validation', async () => {
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({
          defaultFormat: 'wav'
        })
      })
    })
  })

  describe('User Feedback and Error Handling', () => {
    test('should show success message for settings update', async () => {
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(screen.getByText(/설정이 저장되었습니다/)).toBeInTheDocument()
      })
    })

    test('should show error message for update failure', async () => {
      mockSettingsContext.updateSettings.mockRejectedValueOnce(new Error('Update failed'))
      
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(screen.getByText(/설정 저장에 실패했습니다/)).toBeInTheDocument()
      })
    })

    test('should auto-hide messages after timeout', async () => {
      jest.useFakeTimers()
      
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      await user.selectOptions(formatSelect, 'wav')
      
      await waitFor(() => {
        expect(screen.getByText(/설정이 저장되었습니다/)).toBeInTheDocument()
      })
      
      // Fast forward 3 seconds
      jest.advanceTimersByTime(3000)
      
      await waitFor(() => {
        expect(screen.queryByText(/설정이 저장되었습니다/)).not.toBeInTheDocument()
      })
      
      jest.useRealTimers()
    })

    test('should handle directory selection errors', async () => {
      mockSettingsContext.selectDirectory.mockRejectedValueOnce(new Error('Dialog failed'))
      
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      render(<SettingsView />)
      
      const folderButton = screen.getByRole('button', { name: /폴더 선택/i })
      
      await user.click(folderButton)
      
      await waitFor(() => {
        expect(screen.getByText(/폴더 선택에 실패했습니다/)).toBeInTheDocument()
      })
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Theme Selection Integration', () => {
    test('should render theme selection dropdown', () => {
      render(<SettingsView />)
      
      const themeSelect = screen.getByLabelText(/테마/i)
      expect(themeSelect).toBeInTheDocument()
      
      // Check theme options
      expect(screen.getByRole('option', { name: /시스템 설정 따르기/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /라이트 테마/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /다크 테마/i })).toBeInTheDocument()
    })

    test('should update theme setting', async () => {
      render(<SettingsView />)
      
      const themeSelect = screen.getByLabelText(/테마/i)
      
      await user.selectOptions(themeSelect, 'dark')
      
      expect(mockSettingsContext.validateSettings).toHaveBeenCalledWith({
        theme: 'dark'
      })
      
      await waitFor(() => {
        expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({
          theme: 'dark'
        })
      })
    })
  })

  describe('Loading and Disabled States', () => {
    test('should show saving indicator', async () => {
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      // Trigger a save
      fireEvent.change(formatSelect, { target: { value: 'wav' } })
      
      // Should show saving indicator
      expect(screen.getByText(/설정을 저장하는 중.../)).toBeInTheDocument()
    })

    test('should disable form elements while saving', async () => {
      render(<SettingsView />)
      
      const formatSelect = screen.getByLabelText(/기본 오디오 형식/i)
      
      // Start save operation
      fireEvent.change(formatSelect, { target: { value: 'wav' } })
      
      // Form elements should be disabled
      expect(formatSelect).toBeDisabled()
      expect(screen.getByRole('button', { name: /폴더 선택/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /설정 내보내기/i })).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    test('should have proper labels and descriptions', () => {
      render(<SettingsView />)
      
      // Check for proper labels
      expect(screen.getByLabelText(/기본 저장 위치/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/기본 오디오 형식/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/기본 음질/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/테마/i)).toBeInTheDocument()
      
      // Check for descriptive text
      expect(screen.getByText(/설정을 JSON 파일로 백업하거나 복원할 수 있습니다/i)).toBeInTheDocument()
      expect(screen.getByText(/주의: 이 작업은 되돌릴 수 없습니다/i)).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      render(<SettingsView />)
      
      const firstInput = screen.getByDisplayValue('/test/downloads')
      const folderButton = screen.getByRole('button', { name: /폴더 선택/i })
      
      // Focus should move to folder button with Tab
      firstInput.focus()
      await user.tab()
      
      expect(folderButton).toHaveFocus()
    })
  })
})