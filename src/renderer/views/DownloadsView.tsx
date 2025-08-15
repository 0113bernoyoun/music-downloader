import React, { useCallback, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { useDownload, useSettings } from '../contexts'
import { DownloadProgress, StatusIndicator } from '../components'

// 완료된 다운로드 아이템 컴포넌트 (React.memo로 최적화)
const CompletedDownloadItem: React.FC<{
  result: any
  onOpenFolder: (path: string) => void
  onClearDownload: (id: string) => void
}> = memo(({ result, onOpenFolder, onClearDownload }) => {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ marginBottom: '0.5rem' }}>
            {result.metadata?.title || `Download ${result.id.slice(0, 8)}`}
          </h4>
          <div className={`status ${result.success ? 'status-success' : 'status-error'}`}>
            {result.success ? '다운로드 완료' : '실패'}
          </div>
          {result.error && (
            <p className="text-error mt-1" style={{ fontSize: '0.875rem' }}>
              오류: {result.error}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {result.success && result.outputPath && (
            <button
              className="btn btn-outline"
              onClick={() => onOpenFolder(result.outputPath!)}
            >
              폴더 열기
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => onClearDownload(result.id)}
          >
            목록에서 제거
          </button>
        </div>
      </div>
    </div>
  )
})

CompletedDownloadItem.displayName = 'CompletedDownloadItem'

const DownloadsView: React.FC = () => {
  const { state, pauseDownload, resumeDownload, cancelDownload, clearDownload } = useDownload()
  const { openDownloadFolder } = useSettings()

  // 함수들을 useCallback으로 메모이제이션
  const handlePauseResume = useCallback(async (id: string, status: string) => {
    try {
      if (status === 'downloading') {
        await pauseDownload(id)
      } else {
        await resumeDownload(id)
      }
    } catch (error) {
      console.error('Failed to pause/resume download:', error)
    }
  }, [pauseDownload, resumeDownload])

  const handleCancel = useCallback(async (id: string) => {
    try {
      await cancelDownload(id)
    } catch (error) {
      console.error('Failed to cancel download:', error)
    }
  }, [cancelDownload])

  const handleOpenFolder = useCallback(async (path: string) => {
    try {
      await openDownloadFolder(path)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }, [openDownloadFolder])

  const handleClearDownload = useCallback((id: string) => {
    clearDownload(id)
  }, [clearDownload])

  // 순수 함수들을 useCallback으로 메모이제이션 (의존성 없음)
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'status-success'
      case 'downloading': return 'status-info'
      case 'converting': return 'status-warning'
      case 'failed': return 'status-error'
      default: return 'status-info'
    }
  }, [])

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '대기 중'
      case 'downloading': return '다운로드 중'
      case 'converting': return '변환 중'
      case 'completed': return '완료'
      case 'failed': return '실패'
      default: return status
    }
  }, [])

  // 활성 다운로드 배열을 useMemo로 메모이제이션
  const activeDownloadsArray = useMemo(() => {
    return Array.from(state.activeDownloads.values())
  }, [state.activeDownloads])

  // 최근 오류 목록을 useMemo로 메모이제이션
  const recentErrors = useMemo(() => {
    return state.errors.slice(-5)
  }, [state.errors])

  return (
    <div className="view">
      <div className="view-header">
        <h1 className="view-title">다운로드 목록</h1>
        <p className="view-subtitle">
          진행 중인 다운로드와 완료된 항목을 확인하세요
        </p>
      </div>

      {/* 진행 중인 다운로드 */}
      {state.activeDownloads.size > 0 && (
        <div className="card">
          <h2 className="mb-3">📥 진행 중인 다운로드 ({state.activeDownloads.size}개)</h2>
          
          {activeDownloadsArray.map((download) => (
            <DownloadProgress
              key={download.id}
              downloadId={download.id}
              showControls={true}
              onCancel={(id) => {
                console.log(`Download ${id} cancelled from UI`)
              }}
            />
          ))}
        </div>
      )}

      {/* 완료된 다운로드 */}
      {state.completedDownloads.length > 0 && (
        <div className="card">
          <h2 className="mb-3">✅ 완료된 다운로드 ({state.completedDownloads.length}개)</h2>
          
          {state.completedDownloads.map((result) => (
            <CompletedDownloadItem
              key={result.id}
              result={result}
              onOpenFolder={handleOpenFolder}
              onClearDownload={handleClearDownload}
            />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {state.activeDownloads.size === 0 && state.completedDownloads.length === 0 && (
        <div className="card text-center">
          <div style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
            <h3>📭 다운로드 목록이 비어있습니다</h3>
            <p className="mt-2">메인 페이지에서 YouTube URL을 입력하여 다운로드를 시작하세요.</p>
            <Link to="/" className="btn btn-primary mt-3">
              다운로드 페이지로 가기
            </Link>
          </div>
        </div>
      )}

      {/* 에러 목록 */}
      {recentErrors.length > 0 && (
        <div className="card">
          <h2 className="mb-3">⚠️ 최근 오류 ({state.errors.length}개)</h2>
          
          {recentErrors.map((error, index) => (
            <div key={index} className="card status-error" style={{ marginBottom: '1rem' }}>
              <div>
                <strong>{error.type} 오류:</strong> {error.message}
                {error.downloadId && (
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    다운로드 ID: {error.downloadId}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DownloadsView