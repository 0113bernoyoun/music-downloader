import React, { memo, useCallback } from 'react'
import { useDownload } from '../contexts'

interface DownloadProgressProps {
  downloadId: string
  compact?: boolean
  showControls?: boolean
  className?: string
  onComplete?: (result: any) => void
  onCancel?: (id: string) => void
}

const DownloadProgress: React.FC<DownloadProgressProps> = memo(({
  downloadId,
  compact = false,
  showControls = true,
  className = '',
  onComplete,
  onCancel
}) => {
  const { state, pauseDownload, resumeDownload, cancelDownload } = useDownload()
  
  // 다운로드 정보 가져오기
  const download = state.activeDownloads.get(downloadId)
  const completedDownload = state.completedDownloads.find(d => d.id === downloadId)
  
  // 다운로드가 없으면 null 반환
  if (!download && !completedDownload) {
    return null
  }

  // 완료된 다운로드 정보 표시
  if (completedDownload) {
    React.useEffect(() => {
      if (onComplete) {
        onComplete(completedDownload)
      }
    }, [completedDownload, onComplete])

    return (
      <div className={`download-progress completed ${className}`}>
        <div className="progress-header">
          <div className="progress-info">
            <h4 className="progress-title">
              {completedDownload.metadata?.title || `Download ${downloadId.slice(0, 8)}`}
            </h4>
            <div className={`status ${completedDownload.success ? 'status-success' : 'status-error'}`}>
              {completedDownload.success ? '✅ 다운로드 완료' : '❌ 다운로드 실패'}
            </div>
          </div>
        </div>
        
        {completedDownload.error && (
          <div className="progress-error status-error">
            <span>⚠️ {completedDownload.error}</span>
          </div>
        )}
      </div>
    )
  }

  // 현재 다운로드가 없으면 null 반환
  if (!download) {
    return null
  }

  // 상태 관련 함수들을 useCallback으로 메모이제이션
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'downloading': return '⬇️'
      case 'converting': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'paused': return '⏸️'
      default: return '📦'
    }
  }, [])

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '대기 중'
      case 'downloading': return '다운로드 중'
      case 'converting': return '변환 중'
      case 'completed': return '완료'
      case 'failed': return '실패'
      case 'paused': return '일시정지'
      default: return status
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'status-success'
      case 'downloading': return 'status-info'
      case 'converting': return 'status-warning'
      case 'failed': return 'status-error'
      case 'paused': return 'status-warning'
      default: return 'status-info'
    }
  }, [])

  // 액션 핸들러들을 useCallback으로 메모이제이션
  const handlePauseResume = useCallback(async () => {
    try {
      if (download.status === 'downloading') {
        await pauseDownload(downloadId)
      } else if (download.status === 'paused') {
        await resumeDownload(downloadId)
      }
    } catch (error) {
      console.error('Failed to pause/resume download:', error)
    }
  }, [download.status, downloadId, pauseDownload, resumeDownload])

  const handleCancel = useCallback(async () => {
    try {
      await cancelDownload(downloadId)
      if (onCancel) {
        onCancel(downloadId)
      }
    } catch (error) {
      console.error('Failed to cancel download:', error)
    }
  }, [downloadId, cancelDownload, onCancel])

  if (compact) {
    return (
      <div className={`download-progress compact ${className}`}>
        <div className="progress-compact">
          <div className="progress-info-compact">
            <span className="progress-title-compact">
              {download.currentFile || `Download ${downloadId.slice(0, 8)}`}
            </span>
            <span className={`status-compact ${getStatusColor(download.status)}`}>
              {getStatusIcon(download.status)} {getStatusText(download.status)}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${download.progress || 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // 일반 진행률 표시
  return (
    <div className={`download-progress ${className}`}>
      <div className="progress-header">
        <div className="progress-info">
          <h4 className="progress-title">
            {download.currentFile || download.metadata?.title || `Download ${downloadId.slice(0, 8)}`}
          </h4>
          <div className={`status ${getStatusColor(download.status)}`}>
            {getStatusIcon(download.status)} {getStatusText(download.status)}
          </div>
        </div>
        
        {showControls && (
          <div className="progress-controls">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePauseResume}
              disabled={download.status === 'completed' || download.status === 'failed'}
              title={download.status === 'downloading' ? '일시정지' : '재시작'}
            >
              {download.status === 'downloading' ? '⏸️' : '▶️'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
              disabled={download.status === 'completed'}
              title="취소"
            >
              ❌
            </button>
          </div>
        )}
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${download.progress || 0}%` }}
        />
      </div>

      <div className="progress-details">
        <div className="progress-stats">
          <span className="progress-percentage">{download.progress || 0}%</span>
          <span className="progress-speed">{download.speed || '--'}</span>
          <span className="progress-eta">ETA: {download.eta || '--'}</span>
        </div>
        
        {download.totalSize && (
          <div className="progress-size">
            <span>{download.downloadedSize || '0 MB'} / {download.totalSize}</span>
          </div>
        )}
      </div>

      {download.error && (
        <div className="progress-error status-error">
          <span>⚠️ {download.error}</span>
        </div>
      )}
    </div>
  )
})

DownloadProgress.displayName = 'DownloadProgress'

export default DownloadProgress