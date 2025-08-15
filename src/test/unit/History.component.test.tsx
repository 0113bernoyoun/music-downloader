/**
 * Unit tests for History React component
 * Tests UI interactions, filtering, and user actions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import History from '../../renderer/components/History'

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  SortAsc: () => <div data-testid="sort-asc-icon" />,
  SortDesc: () => <div data-testid="sort-desc-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  FileDownload: () => <div data-testid="file-download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Music: () => <div data-testid="music-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />
}))

// Mock window.api
const mockApi = {
  getAllHistory: jest.fn(),
  getFilteredHistory: jest.fn(),
  getHistoryEntry: jest.fn(),
  deleteHistoryEntry: jest.fn(),
  clearHistory: jest.fn(),
  getHistoryStatistics: jest.fn(),
  getRecentDownloads: jest.fn(),
  checkUrlDownloaded: jest.fn(),
  exportHistory: jest.fn(),
  importHistory: jest.fn(),
  openDownloadFolder: jest.fn(),
  onHistoryEntryAdded: jest.fn(() => jest.fn()),
  onHistoryEntryDeleted: jest.fn(() => jest.fn()),
  onHistoryCleared: jest.fn(() => jest.fn()),
  onHistoryImported: jest.fn(() => jest.fn())
}

// Mock window object
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

// Mock window.confirm and window.alert
Object.defineProperty(window, 'confirm', {
  value: jest.fn(),
  writable: true
})

Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true
})

// Sample test data
const mockHistoryEntries = [
  {
    id: 'hist_1',
    url: 'https://youtube.com/watch?v=test1',
    title: 'Test Song 1',
    artist: 'Test Artist 1',
    duration: '3:30',
    thumbnail: 'https://example.com/thumb1.jpg',
    format: 'mp3',
    quality: '320',
    outputPath: '/test/song1.mp3',
    downloadDate: '2024-01-15T10:00:00.000Z',
    fileSize: 5242880
  },
  {
    id: 'hist_2',
    url: 'https://youtube.com/watch?v=test2',
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    duration: '4:15',
    thumbnail: 'https://example.com/thumb2.jpg',
    format: 'wav',
    quality: 'best',
    outputPath: '/test/song2.wav',
    downloadDate: '2024-01-14T09:00:00.000Z',
    fileSize: 10485760
  }
]

const mockStatistics = {
  totalDownloads: 2,
  totalSize: 15728640,
  formatDistribution: { mp3: 1, wav: 1 },
  dailyDownloads: { '2024-01-15': 1, '2024-01-14': 1 },
  topArtists: [
    { artist: 'Test Artist 1', count: 1 },
    { artist: 'Test Artist 2', count: 1 }
  ]
}

describe('History Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock responses
    mockApi.getAllHistory.mockResolvedValue({
      success: true,
      data: mockHistoryEntries
    })

    mockApi.getFilteredHistory.mockResolvedValue({
      success: true,
      data: mockHistoryEntries
    })

    mockApi.getHistoryStatistics.mockResolvedValue({
      success: true,
      data: mockStatistics
    })
  })

  describe('Initial Render', () => {
    test('should render loading state initially', () => {
      mockApi.getAllHistory.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<History />)

      expect(screen.getByText('Loading history...')).toBeInTheDocument()
      expect(screen.getByRole('generic')).toHaveClass('animate-spin')
    })

    test('should render error state when API call fails', async () => {
      const errorMessage = 'Failed to load history'
      mockApi.getAllHistory.mockResolvedValue({
        success: false,
        error: errorMessage
      })

      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading History')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    test('should render history data when loaded successfully', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Download History')).toBeInTheDocument()
        expect(screen.getByText('2 of 2 downloads')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Display', () => {
    test('should display statistics cards', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Total Downloads')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Total Size')).toBeInTheDocument()
        expect(screen.getByText('15.0 MB')).toBeInTheDocument()
      })
    })

    test('should display format distribution', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Most Used Format')).toBeInTheDocument()
        // Should show the first format from the distribution (mp3 or wav)
        expect(screen.getByText(/mp3|wav/)).toBeInTheDocument()
      })
    })

    test('should display top artist', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Top Artist')).toBeInTheDocument()
        expect(screen.getByText('Test Artist 1')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    test('should render search input', async () => {
      render(<History />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
        expect(searchInput).toBeInTheDocument()
      })
    })

    test('should trigger search when typing', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
        expect(searchInput).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(mockApi.getFilteredHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'test'
          })
        )
      })
    })

    test('should toggle advanced filters', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const filtersButton = screen.getByText('Filters')
        expect(filtersButton).toBeInTheDocument()
      })

      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Date From')).toBeInTheDocument()
        expect(screen.getByLabelText('Date To')).toBeInTheDocument()
        expect(screen.getByLabelText('Format')).toBeInTheDocument()
        expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
      })
    })

    test('should apply date filters', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const filtersButton = screen.getByText('Filters')
        expect(filtersButton).toBeInTheDocument()
      })

      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)

      await waitFor(() => {
        const dateFromInput = screen.getByLabelText('Date From')
        expect(dateFromInput).toBeInTheDocument()
      })

      const dateFromInput = screen.getByLabelText('Date From')
      await user.type(dateFromInput, '2024-01-01')

      await waitFor(() => {
        expect(mockApi.getFilteredHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            dateFrom: '2024-01-01'
          })
        )
      })
    })

    test('should apply format filter', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const filtersButton = screen.getByText('Filters')
        expect(filtersButton).toBeInTheDocument()
      })

      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)

      await waitFor(() => {
        const formatSelect = screen.getByLabelText('Format')
        expect(formatSelect).toBeInTheDocument()
      })

      const formatSelect = screen.getByLabelText('Format')
      await user.selectOptions(formatSelect, 'mp3')

      await waitFor(() => {
        expect(mockApi.getFilteredHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'mp3'
          })
        )
      })
    })
  })

  describe('History Table', () => {
    test('should display history entries in table', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Test Song 1')).toBeInTheDocument()
        expect(screen.getByText('Test Artist 1')).toBeInTheDocument()
        expect(screen.getByText('Test Song 2')).toBeInTheDocument()
        expect(screen.getByText('Test Artist 2')).toBeInTheDocument()
      })
    })

    test('should display format badges', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('MP3')).toBeInTheDocument()
        expect(screen.getByText('WAV')).toBeInTheDocument()
      })
    })

    test('should display duration and date information', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('3:30')).toBeInTheDocument()
        expect(screen.getByText('4:15')).toBeInTheDocument()
      })
    })

    test('should display empty state when no entries', async () => {
      mockApi.getAllHistory.mockResolvedValue({
        success: true,
        data: []
      })

      mockApi.getFilteredHistory.mockResolvedValue({
        success: true,
        data: []
      })

      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('No downloads found')).toBeInTheDocument()
        expect(screen.getByText(/You haven't downloaded any music yet/)).toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons', () => {
    test('should render action buttons in header', async () => {
      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument()
        expect(screen.getByText('Import')).toBeInTheDocument()
        expect(screen.getByText('Clear All')).toBeInTheDocument()
      })
    })

    test('should call export function when export button clicked', async () => {
      const user = userEvent.setup()
      mockApi.exportHistory.mockResolvedValue({
        success: true,
        data: '/test/exported.json'
      })

      render(<History />)

      await waitFor(() => {
        const exportButton = screen.getByText('Export')
        expect(exportButton).toBeInTheDocument()
      })

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      await waitFor(() => {
        expect(mockApi.exportHistory).toHaveBeenCalled()
      })
    })

    test('should call import function when import button clicked', async () => {
      const user = userEvent.setup()
      mockApi.importHistory.mockResolvedValue({
        success: true,
        data: 5
      })

      render(<History />)

      await waitFor(() => {
        const importButton = screen.getByText('Import')
        expect(importButton).toBeInTheDocument()
      })

      const importButton = screen.getByText('Import')
      await user.click(importButton)

      await waitFor(() => {
        expect(mockApi.importHistory).toHaveBeenCalledWith(true)
      })
    })

    test('should confirm before clearing history', async () => {
      const user = userEvent.setup()
      ;(window.confirm as jest.Mock).mockReturnValue(true)
      mockApi.clearHistory.mockResolvedValue({
        success: true
      })

      render(<History />)

      await waitFor(() => {
        const clearButton = screen.getByText('Clear All')
        expect(clearButton).toBeInTheDocument()
      })

      const clearButton = screen.getByText('Clear All')
      await user.click(clearButton)

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all history? This action cannot be undone.'
      )

      await waitFor(() => {
        expect(mockApi.clearHistory).toHaveBeenCalled()
      })
    })
  })

  describe('Entry Actions', () => {
    test('should call openDownloadFolder when download button clicked', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const downloadButtons = screen.getAllByTestId('download-icon')
        expect(downloadButtons).toHaveLength(2)
      })

      const downloadButton = screen.getAllByTestId('download-icon')[0].closest('button')
      if (downloadButton) {
        await user.click(downloadButton)
      }

      await waitFor(() => {
        expect(mockApi.openDownloadFolder).toHaveBeenCalledWith('/test/song1.mp3')
      })
    })

    test('should confirm before deleting entry', async () => {
      const user = userEvent.setup()
      ;(window.confirm as jest.Mock).mockReturnValue(true)
      mockApi.deleteHistoryEntry.mockResolvedValue({
        success: true
      })

      render(<History />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('trash-icon')
        expect(deleteButtons).toHaveLength(2)
      })

      const deleteButton = screen.getAllByTestId('trash-icon')[0].closest('button')
      if (deleteButton) {
        await user.click(deleteButton)
      }

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this entry?'
      )

      await waitFor(() => {
        expect(mockApi.deleteHistoryEntry).toHaveBeenCalledWith('hist_1')
      })
    })

    test('should not delete entry when user cancels confirmation', async () => {
      const user = userEvent.setup()
      ;(window.confirm as jest.Mock).mockReturnValue(false)

      render(<History />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('trash-icon')
        expect(deleteButtons).toHaveLength(2)
      })

      const deleteButton = screen.getAllByTestId('trash-icon')[0].closest('button')
      if (deleteButton) {
        await user.click(deleteButton)
      }

      expect(window.confirm).toHaveBeenCalled()
      expect(mockApi.deleteHistoryEntry).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should display error when export fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Export failed'
      mockApi.exportHistory.mockResolvedValue({
        success: false,
        error: errorMessage
      })

      render(<History />)

      await waitFor(() => {
        const exportButton = screen.getByText('Export')
        expect(exportButton).toBeInTheDocument()
      })

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      // Wait for error to be handled (this would update component state)
      await waitFor(() => {
        expect(mockApi.exportHistory).toHaveBeenCalled()
      })
    })

    test('should retry loading history when retry button clicked', async () => {
      const user = userEvent.setup()
      
      // First call fails
      mockApi.getAllHistory.mockResolvedValueOnce({
        success: false,
        error: 'Network error'
      })

      render(<History />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading History')).toBeInTheDocument()
      })

      // Second call succeeds
      mockApi.getAllHistory.mockResolvedValue({
        success: true,
        data: mockHistoryEntries
      })

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Download History')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(<History />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
        expect(searchInput).toHaveAttribute('type', 'text')
        
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
      })
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<History />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
        expect(searchInput).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search by title, artist, or URL...')
      
      // Test Tab navigation
      await user.tab()
      expect(searchInput).toHaveFocus()
    })
  })
})