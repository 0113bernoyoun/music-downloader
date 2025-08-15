import { useState, useEffect, useCallback } from 'react'
import { 
  HistoryEntry, 
  HistoryFilter, 
  HistoryStatistics,
  HistoryResponse 
} from '../types'

interface UseHistoryReturn {
  // State
  history: HistoryEntry[]
  filteredHistory: HistoryEntry[]
  statistics: HistoryStatistics | null
  loading: boolean
  error: string | null
  
  // Filter management
  filter: HistoryFilter
  setFilter: (filter: HistoryFilter) => void
  clearFilter: () => void
  
  // Actions
  loadHistory: () => Promise<void>
  loadStatistics: () => Promise<void>
  deleteEntry: (id: string) => Promise<boolean>
  clearHistory: () => Promise<boolean>
  exportHistory: () => Promise<string | null>
  importHistory: (merge?: boolean) => Promise<number | null>
  checkUrlDownloaded: (url: string) => Promise<boolean>
  getRecentDownloads: (limit?: number) => Promise<HistoryEntry[]>
  
  // Real-time updates
  refreshData: () => Promise<void>
}

const defaultFilter: HistoryFilter = {
  searchTerm: '',
  sortBy: 'date',
  sortOrder: 'desc'
}

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([])
  const [statistics, setStatistics] = useState<HistoryStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<HistoryFilter>(defaultFilter)

  // Load all history
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response: HistoryResponse<HistoryEntry[]> = await window.api.getAllHistory()
      
      if (response.success && response.data) {
        setHistory(response.data)
        // Also update filtered history if no filters are active
        if (!filter.searchTerm && !filter.dateFrom && !filter.dateTo && !filter.format) {
          setFilteredHistory(response.data)
        }
      } else {
        setError(response.error || 'Failed to load history')
      }
    } catch (err) {
      setError('Failed to load history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [filter.searchTerm, filter.dateFrom, filter.dateTo, filter.format])

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const response: HistoryResponse<HistoryStatistics> = await window.api.getHistoryStatistics()
      if (response.success && response.data) {
        setStatistics(response.data)
      }
    } catch (err) {
      console.error('Failed to load statistics:', err)
    }
  }, [])

  // Apply filters
  const applyFilters = useCallback(async () => {
    try {
      const response: HistoryResponse<HistoryEntry[]> = await window.api.getFilteredHistory(filter)
      if (response.success && response.data) {
        setFilteredHistory(response.data)
      }
    } catch (err) {
      console.error('Failed to apply filters:', err)
    }
  }, [filter])

  // Set filter with automatic application
  const setFilter = useCallback((newFilter: HistoryFilter) => {
    setFilterState(newFilter)
  }, [])

  // Clear all filters
  const clearFilter = useCallback(() => {
    setFilterState(defaultFilter)
  }, [])

  // Delete entry
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response: HistoryResponse<void> = await window.api.deleteHistoryEntry(id)
      if (response.success) {
        // Remove from local state immediately for better UX
        setHistory(prev => prev.filter(entry => entry.id !== id))
        setFilteredHistory(prev => prev.filter(entry => entry.id !== id))
        // Reload statistics
        await loadStatistics()
        return true
      } else {
        setError(response.error || 'Failed to delete entry')
        return false
      }
    } catch (err) {
      setError('Failed to delete entry: ' + (err instanceof Error ? err.message : 'Unknown error'))
      return false
    }
  }, [loadStatistics])

  // Clear all history
  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      const response: HistoryResponse<void> = await window.api.clearHistory()
      if (response.success) {
        setHistory([])
        setFilteredHistory([])
        setStatistics(null)
        return true
      } else {
        setError(response.error || 'Failed to clear history')
        return false
      }
    } catch (err) {
      setError('Failed to clear history: ' + (err instanceof Error ? err.message : 'Unknown error'))
      return false
    }
  }, [])

  // Export history
  const exportHistory = useCallback(async (): Promise<string | null> => {
    try {
      const response: HistoryResponse<string> = await window.api.exportHistory()
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || 'Failed to export history')
        return null
      }
    } catch (err) {
      setError('Failed to export history: ' + (err instanceof Error ? err.message : 'Unknown error'))
      return null
    }
  }, [])

  // Import history
  const importHistory = useCallback(async (merge: boolean = false): Promise<number | null> => {
    try {
      const response: HistoryResponse<number> = await window.api.importHistory(merge)
      if (response.success && response.data !== undefined) {
        // Reload data after import
        await loadHistory()
        await loadStatistics()
        return response.data
      } else {
        setError(response.error || 'Failed to import history')
        return null
      }
    } catch (err) {
      setError('Failed to import history: ' + (err instanceof Error ? err.message : 'Unknown error'))
      return null
    }
  }, [loadHistory, loadStatistics])

  // Check if URL is already downloaded
  const checkUrlDownloaded = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response: HistoryResponse<boolean> = await window.api.checkUrlDownloaded(url)
      return response.success && response.data === true
    } catch (err) {
      console.error('Failed to check URL:', err)
      return false
    }
  }, [])

  // Get recent downloads
  const getRecentDownloads = useCallback(async (limit: number = 10): Promise<HistoryEntry[]> => {
    try {
      const response: HistoryResponse<HistoryEntry[]> = await window.api.getRecentDownloads(limit)
      return response.success && response.data ? response.data : []
    } catch (err) {
      console.error('Failed to get recent downloads:', err)
      return []
    }
  }, [])

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadHistory(),
      loadStatistics()
    ])
  }, [loadHistory, loadStatistics])

  // Apply filters when filter changes
  useEffect(() => {
    if (history.length > 0) {
      applyFilters()
    }
  }, [filter, applyFilters, history.length])

  // Initial load and event listeners
  useEffect(() => {
    loadHistory()
    loadStatistics()

    // Set up event listeners for real-time updates
    const unsubscribeEntryAdded = window.api.onHistoryEntryAdded((entry: HistoryEntry) => {
      setHistory(prev => [entry, ...prev])
      // Check if the new entry matches current filters
      if (!filter.searchTerm && !filter.dateFrom && !filter.dateTo && !filter.format) {
        setFilteredHistory(prev => [entry, ...prev])
      } else {
        // Re-apply filters to include new entry if it matches
        applyFilters()
      }
      loadStatistics()
    })
    
    const unsubscribeEntryDeleted = window.api.onHistoryEntryDeleted((entry: HistoryEntry) => {
      setHistory(prev => prev.filter(h => h.id !== entry.id))
      setFilteredHistory(prev => prev.filter(h => h.id !== entry.id))
      loadStatistics()
    })
    
    const unsubscribeCleared = window.api.onHistoryCleared(() => {
      setHistory([])
      setFilteredHistory([])
      setStatistics(null)
    })

    const unsubscribeImported = window.api.onHistoryImported(() => {
      refreshData()
    })

    return () => {
      unsubscribeEntryAdded()
      unsubscribeEntryDeleted()
      unsubscribeCleared()
      unsubscribeImported()
    }
  }, [loadHistory, loadStatistics, refreshData, filter, applyFilters])

  return {
    // State
    history,
    filteredHistory,
    statistics,
    loading,
    error,
    
    // Filter management
    filter,
    setFilter,
    clearFilter,
    
    // Actions
    loadHistory,
    loadStatistics,
    deleteEntry,
    clearHistory,
    exportHistory,
    importHistory,
    checkUrlDownloaded,
    getRecentDownloads,
    
    // Real-time updates
    refreshData
  }
}