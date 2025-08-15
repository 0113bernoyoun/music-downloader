import React, { useEffect, useRef } from 'react'
import { useDownload, useSettings } from '../contexts'
import { StatusIndicator, LoadingSpinner, FilePathSelector } from '../components'
import { useMainViewStore } from '../stores/MainViewStore'

const MainView: React.FC = () => {
  // Zustand store 사용
  const {
    url, format, quality, metadata, validation, isDownloading, message,
    setUrl, setFormat, setQuality, setMetadata, setValidation, setIsDownloading, setMessage,
    resetForm, clearMessage
  } = useMainViewStore()
  
  const settingsInitialized = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUrlRef = useRef<string>('')
  const extractingUrlsRef = useRef<Set<string>>(new Set())

  const { startDownload, validateUrl, extractMetadata } = useDownload()
  const { settings, selectDirectory, updateSettings } = useSettings()

  // YouTube URL 정규식 패턴 (개별 비디오, 플레이리스트, 쇼츠 지원)
  const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|youtu\.be\/|m\.youtube\.com\/(watch\?v=|playlist\?list=)|music\.youtube\.com\/).+/i

  const validateYouTubeUrl = (url: string): boolean => {
    return youtubeUrlPattern.test(url.trim())
  }

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => clearMessage(), 5000)
  }

  const isPlaylistUrl = (url: string): boolean => {
    return url.includes('playlist?list=') || url.includes('list=')
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setMetadata(null)
    
    // 이전 타이머가 있으면 취소
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    if (!value.trim()) {
      setValidation({ isValid: null, isValidating: false, error: null })
      lastUrlRef.current = ''
      return
    }

    // 즉시 URL 형식 검사
    if (!validateYouTubeUrl(value)) {
      setValidation({ 
        isValid: false, 
        isValidating: false, 
        error: '올바른 YouTube URL을 입력해주세요 (동영상, 플레이리스트, 쇼츠 지원)' 
      })
      lastUrlRef.current = ''
      return
    }

    const trimmedUrl = value.trim()
    
    // 같은 URL이면 다시 요청하지 않음
    if (lastUrlRef.current === trimmedUrl) {
      return
    }

    // 이미 추출 중인 URL이면 요청하지 않음
    if (extractingUrlsRef.current.has(trimmedUrl)) {
      console.log('Already extracting metadata for URL:', trimmedUrl)
      return
    }

    // 1초 후 메타데이터 추출 실행 (debouncing 증가)
    debounceTimeoutRef.current = setTimeout(async () => {
      // 다시 한번 URL 체크
      if (lastUrlRef.current === trimmedUrl || extractingUrlsRef.current.has(trimmedUrl)) {
        return
      }
      
      lastUrlRef.current = trimmedUrl
      extractingUrlsRef.current.add(trimmedUrl)
      
      // URL이 유효한 형식이면 서버 검증 시작
      setValidation({ isValid: null, isValidating: true, error: null })
      
      try {
        // 플레이리스트인지 확인
        if (isPlaylistUrl(trimmedUrl)) {
          showMessage('info', '플레이리스트가 감지되었습니다. 첫 번째 동영상의 정보를 가져옵니다.')
        }

        // URL 기본 형식이 맞다면 메타데이터 직접 추출 시도
        const meta = await extractMetadata(trimmedUrl)
        
        // 메타데이터 추출 성공 여부와 상관없이 항상 진행 가능하게 설정
        setValidation({ isValid: true, isValidating: false, error: null })
        setMetadata(meta)
        
        if (meta && meta.title === 'Unknown Title') {
          showMessage('info', '메타데이터를 가져올 수 없지만 다운로드는 가능합니다')
        } else if (meta && meta.title !== 'Unknown Title') {
          if (isPlaylistUrl(trimmedUrl)) {
            showMessage('success', '플레이리스트 정보를 가져왔습니다. 전체 플레이리스트가 다운로드됩니다.')
          } else {
            showMessage('success', '동영상 정보를 성공적으로 가져왔습니다')
          }
        } else {
          // meta가 null인 경우에도 기본 메타데이터로 진행
          setMetadata({
            title: isPlaylistUrl(trimmedUrl) ? 'Playlist' : 'Unknown Title',
            artist: 'Unknown Artist',
            duration: 'Unknown',
            thumbnail: '',
            url: trimmedUrl,
            description: 'Metadata extraction failed',
            uploadDate: undefined,
            viewCount: undefined
          })
          showMessage('info', '메타데이터를 가져올 수 없지만 다운로드는 가능합니다')
        }
      } catch (error) {
        console.error('Metadata extraction failed, but continuing with fallback:', error)
        
        // 에러가 발생해도 진행 가능하도록 설정
        setValidation({ isValid: true, isValidating: false, error: null })
        setMetadata({
          title: isPlaylistUrl(trimmedUrl) ? 'Playlist' : 'Unknown Title',
          artist: 'Unknown Artist',
          duration: 'Unknown',
          thumbnail: '',
          url: trimmedUrl,
          description: 'Metadata extraction failed',
          uploadDate: undefined,
          viewCount: undefined
        })
        showMessage('info', '메타데이터를 가져올 수 없지만 다운로드는 가능합니다')
      } finally {
        // 완료 후 추출 중 목록에서 제거
        extractingUrlsRef.current.delete(trimmedUrl)
      }
    }, 1000)
  }

  // 설정값으로 초기값 설정 (한 번만)
  useEffect(() => {
    if (!settingsInitialized.current && settings.defaultFormat && settings.defaultQuality) {
      setFormat(settings.defaultFormat)
      setQuality(settings.defaultQuality)
      settingsInitialized.current = true
    }
  }, [settings.defaultFormat, settings.defaultQuality])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleDownload = async () => {
    if (!url.trim() || validation.isValid !== true) {
      showMessage('error', '유효한 YouTube URL을 입력해주세요')
      return
    }

    if (!settings.defaultOutputPath) {
      showMessage('error', '저장 폴더를 선택해주세요')
      return
    }

    setIsDownloading(true)
    
    try {
      const downloadOptions = {
        url: url.trim(),
        format: format as 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg',
        quality: quality as '128' | '192' | '320' | 'best',
        outputPath: settings.defaultOutputPath
      }
      
      const downloadId = await startDownload(downloadOptions)
      if (downloadId) {
        showMessage('success', '다운로드가 시작되었습니다. 다운로드 목록에서 진행상황을 확인하세요')
        
        // 폼 초기화
        resetForm()
      }
    } catch (error: any) {
      console.error('Download failed:', error)
      showMessage('error', error.message || '다운로드 시작 중 오류가 발생했습니다')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSelectDirectory = async () => {
    console.log('MainView handleSelectDirectory called')
    try {
      console.log('Calling selectDirectory from useSettings...')
      const directory = await selectDirectory()
      console.log('Got directory:', directory)
      if (directory) {
        console.log('Updating settings with directory:', directory)
        await updateSettings({ defaultOutputPath: directory })
        showMessage('success', '저장 폴더가 설정되었습니다')
      } else {
        console.log('No directory selected')
      }
    } catch (error) {
      console.error('Error in handleSelectDirectory:', error)
      showMessage('error', '폴더 선택 중 오류가 발생했습니다')
    }
  }

  const handleRetry = () => {
    if (url.trim()) {
      handleUrlChange(url)
    }
  }

  const canDownload = () => {
    return url.trim() && 
           validation.isValid === true && 
           settings.defaultOutputPath && 
           !isDownloading
  }

  return (
    <div className="view">
      <div className="view-header">
        <h1 className="view-title">🎵 YouTube 음악 다운로더</h1>
        <p className="view-subtitle">
          YouTube URL을 입력하여 고음질 음악 파일로 변환하세요
        </p>
      </div>

      {/* 글로벌 메시지 */}
      {message && (
        <div className={`card status-${message.type}`} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="card">
        {/* URL 입력 섹션 */}
        <div className="form-group">
          <label htmlFor="url" className="form-label">
            🔗 YouTube URL *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="url"
              type="text"
              className={`form-input ${validation.isValid === false ? 'error' : validation.isValid === true ? 'success' : ''}`}
              placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isDownloading}
              style={{
                paddingRight: validation.isValidating ? '3rem' : '1rem'
              }}
            />
            
            {/* 상태 인디케이터 */}
            {validation.isValidating && (
              <div style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--primary-color)'
              }}>
                🔄
              </div>
            )}
            
            {validation.isValid === true && !validation.isValidating && (
              <div style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--success-color)'
              }}>
                ✅
              </div>
            )}
          </div>
          
          {/* URL 검증 상태 메시지 */}
          {validation.isValidating && (
            <div className="mt-1">
              <LoadingSpinner 
                size="small" 
                text="동영상 정보를 확인하는 중..." 
                inline
                color="primary"
              />
            </div>
          )}
          
          
          {validation.isValid === true && (
            <div className="mt-1">
              <StatusIndicator 
                status="success" 
                text="유효한 YouTube URL입니다"
                size="small"
              />
            </div>
          )}
        </div>

        {/* 메타데이터 표시 - 개선된 디자인 */}
        {metadata && (
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%)',
            border: '1px solid var(--primary-color)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
              {metadata.thumbnail && (
                <img 
                  src={metadata.thumbnail} 
                  alt="썸네일"
                  style={{ 
                    width: '120px', 
                    height: '90px', 
                    borderRadius: '6px',
                    objectFit: 'cover'
                  }}
                />
              )}
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="mb-2" style={{ 
                  color: 'var(--primary-color)',
                  wordBreak: 'break-word',
                  lineHeight: '1.4'
                }}>
                  🎵 {metadata.title}
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  {metadata.artist && (
                    <div><strong>👤 아티스트:</strong> {metadata.artist}</div>
                  )}
                  {metadata.duration && (
                    <div><strong>⏱️ 재생시간:</strong> {metadata.duration}</div>
                  )}
                  {metadata.viewCount && (
                    <div><strong>👁️ 조회수:</strong> {metadata.viewCount.toLocaleString()}</div>
                  )}
                  {metadata.uploadDate && (
                    <div><strong>📅 업로드:</strong> {metadata.uploadDate}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 다운로드 옵션 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="format" className="form-label">
              🎼 오디오 형식
            </label>
            <select
              id="format"
              className="form-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={isDownloading}
            >
              <option value="mp3">MP3 (호환성 우수)</option>
              <option value="wav">WAV (무손실)</option>
              <option value="flac">FLAC (무손실 압축)</option>
              <option value="aac">AAC (효율적 압축)</option>
              <option value="ogg">OGG (오픈소스)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="quality" className="form-label">
              🎚️ 음질
            </label>
            <select
              id="quality"
              className="form-select"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={isDownloading}
            >
              <option value="128">128 kbps (표준)</option>
              <option value="192">192 kbps (고품질)</option>
              <option value="320">320 kbps (최고품질)</option>
              <option value="best">원본 최고 품질</option>
            </select>
          </div>
        </div>

        {/* 저장 위치 */}
        <FilePathSelector
          value={settings.defaultOutputPath || ''}
          label="저장 위치"
          placeholder="저장할 폴더를 선택해주세요"
          required
          disabled={isDownloading}
          selectType="folder"
          showClearButton
          selectDirectory={selectDirectory}
          onSelect={async (path) => {
            await updateSettings({ defaultOutputPath: path })
          }}
          onClear={() => updateSettings({ defaultOutputPath: '' })}
        />

        {/* 다운로드 버튼 */}
        <div className="form-group" style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className={`btn ${canDownload() ? 'btn-primary' : 'btn-outline'}`}
            onClick={handleDownload}
            disabled={!canDownload()}
            style={{ 
              width: '100%', 
              fontSize: '1.1rem',
              padding: '1rem',
              position: 'relative'
            }}
          >
            {isDownloading ? (
              <>
                🔄 다운로드 시작 중...
              </>
            ) : canDownload() ? (
              <>
                ⬇️ 다운로드 시작 ({format.toUpperCase()}, {quality === 'best' ? '최고품질' : quality + ' kbps'})
              </>
            ) : !url.trim() ? (
              '🔗 YouTube URL을 입력해주세요'
            ) : validation.isValid !== true ? (
              '⚠️ 유효한 YouTube URL이 필요합니다'
            ) : !settings.defaultOutputPath ? (
              '📁 저장 폴더를 선택해주세요'
            ) : (
              '다운로드 준비 중...'
            )}
          </button>
          
          {canDownload() && (
            <p className="text-center mt-2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              💡 다운로드 진행상황은 '다운로드 목록' 탭에서 확인하실 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MainView