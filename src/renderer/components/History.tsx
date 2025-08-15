import React, { useState, useEffect, useCallback } from 'react'
import { 
  HistoryEntry, 
  HistoryFilter, 
  HistoryStatistics,
  HistoryResponse 
} from '../types'
import { 
  Search, 
  Download, 
  Trash2, 
  Calendar,
  SortAsc,
  SortDesc,
  BarChart3,
  FileDownload,
  Upload,
  Music,
  Clock,
  User,
  Filter,
  X
} from 'lucide-react'

interface HistoryProps {
  className?: string
}

const History: React.FC<HistoryProps> = ({ className = '' }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([])
  const [statistics, setStatistics] = useState<HistoryStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filter, setFilter] = useState<HistoryFilter>({
    searchTerm: '',
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Load history data
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response: HistoryResponse<HistoryEntry[]> = await window.api.getAllHistory()
      
      if (response.success && response.data) {
        setHistory(response.data)
        setFilteredHistory(response.data)
      } else {
        setError(response.error || 'Failed to load history')
      }
    } catch (err) {
      setError('Failed to load history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Delete entry
  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {return}
    
    try {
      const response: HistoryResponse<void> = await window.api.deleteHistoryEntry(id)
      if (response.success) {
        await loadHistory()
        await loadStatistics()
      } else {
        setError(response.error || 'Failed to delete entry')
      }
    } catch (err) {
      setError('Failed to delete entry: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Clear all history
  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all history? This action cannot be undone.')) {return}
    
    try {
      const response: HistoryResponse<void> = await window.api.clearHistory()
      if (response.success) {
        setHistory([])
        setFilteredHistory([])
        setStatistics(null)
      } else {
        setError(response.error || 'Failed to clear history')
      }
    } catch (err) {
      setError('Failed to clear history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Export history
  const exportHistory = async () => {
    try {
      const response: HistoryResponse<string> = await window.api.exportHistory()
      if (response.success && response.data) {
        alert(`History exported to: ${response.data}`)
      } else {
        setError(response.error || 'Failed to export history')
      }
    } catch (err) {
      setError('Failed to export history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Import history
  const importHistory = async (merge: boolean = false) => {
    try {
      const response: HistoryResponse<number> = await window.api.importHistory(merge)
      if (response.success && response.data !== undefined) {
        alert(`Successfully imported ${response.data} entries`)
        await loadHistory()
        await loadStatistics()
      } else {
        setError(response.error || 'Failed to import history')
      }
    } catch (err) {
      setError('Failed to import history: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) {return 'Unknown'}
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString()
  }

  // Initialize component
  useEffect(() => {
    loadHistory()
    loadStatistics()

    // Set up event listeners
    const unsubscribeEntryAdded = window.api.onHistoryEntryAdded(() => {
      loadHistory()
      loadStatistics()
    })
    
    const unsubscribeEntryDeleted = window.api.onHistoryEntryDeleted(() => {
      loadHistory()
      loadStatistics()
    })
    
    const unsubscribeCleared = window.api.onHistoryCleared(() => {
      setHistory([])
      setFilteredHistory([])
      setStatistics(null)
    })

    return () => {
      unsubscribeEntryAdded()
      unsubscribeEntryDeleted()
      unsubscribeCleared()
    }
  }, [loadHistory, loadStatistics])

  // Apply filters when filter changes
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading History</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Download History</h2>
          <p className="text-gray-600 mt-1">
            {filteredHistory.length} of {history.length} downloads
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={exportHistory}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FileDownload className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => importHistory(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button
            onClick={clearHistory}
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalDownloads}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(statistics.totalSize)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Music className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Most Used Format</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.entries(statistics.formatDistribution).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <User className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Top Artist</p>
                <p className="text-lg font-bold text-gray-900">
                  {statistics.topArtists[0]?.artist || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by title, artist, or URL..."
              value={filter.searchTerm || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filter.dateFrom || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filter.dateTo || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={filter.format || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, format: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Formats</option>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
                <option value="aac">AAC</option>
                <option value="ogg">OGG</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex space-x-2">
                <select
                  value={filter.sortBy || 'date'}
                  onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                </select>
                <button
                  onClick={() => setFilter(prev => ({ 
                    ...prev, 
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {filter.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center">
            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No downloads found</h3>
            <p className="text-gray-600">
              {history.length === 0 
                ? "You haven't downloaded any music yet. Start by adding a YouTube URL!" 
                : "No downloads match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Track
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {entry.thumbnail ? (
                          <img 
                            src={entry.thumbnail} 
                            alt={entry.title}
                            className="w-12 h-12 rounded-md object-cover mr-4"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center mr-4">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {entry.title}
                          </p>
                          {entry.artist && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {entry.artist}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.format.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{entry.quality}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {entry.duration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDate(entry.downloadDate)}
                      </div>
                      {entry.fileSize && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(entry.fileSize)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => window.api.openDownloadFolder(entry.outputPath)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Open file location"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default History