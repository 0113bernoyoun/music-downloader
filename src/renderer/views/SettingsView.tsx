import React, { useState } from 'react'
import { useSettings } from '../contexts'

const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    resetSettings, 
    exportSettings, 
    importSettings, 
    validateSettings, 
    selectDirectory 
  } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSettingChange = async (key: keyof typeof settings, value: any) => {
    try {
      setIsSaving(true)

      // 설정 검증
      const validationResult = await validateSettings({ [key]: value })
      if (!validationResult.success) {
        setMessage({ type: 'error', text: `설정 검증 실패: ${validationResult.error}` })
        return
      }

      if (!validationResult.isValid) {
        setMessage({ type: 'error', text: `올바르지 않은 설정 값입니다: ${key}` })
        return
      }

      await updateSettings({ [key]: value })
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' })
      console.error('Failed to update settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectDirectory = async () => {
    try {
      const directory = await selectDirectory()
      if (directory) {
        await handleSettingChange('defaultOutputPath', directory)
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
      setMessage({ type: 'error', text: '폴더 선택에 실패했습니다.' })
    }
  }

  const handleReset = async () => {
    if (window.confirm('모든 설정을 초기화하시겠습니까?')) {
      try {
        setIsSaving(true)
        await resetSettings()
        setMessage({ type: 'success', text: '설정이 초기화되었습니다.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        setMessage({ type: 'error', text: '설정 초기화에 실패했습니다.' })
        console.error('Failed to reset settings:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleExport = async () => {
    try {
      setIsSaving(true)
      const result = await exportSettings()
      if (result.success) {
        setMessage({ type: 'success', text: `설정이 내보내기되었습니다: ${result.filePath}` })
      } else {
        setMessage({ type: 'error', text: result.error || '설정 내보내기에 실패했습니다.' })
      }
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '설정 내보내기에 실패했습니다.' })
      console.error('Failed to export settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImport = async (merge: boolean = false) => {
    try {
      setIsSaving(true)
      const result = await importSettings(merge)
      if (result.success) {
        setMessage({ type: 'success', text: `설정이 가져오기되었습니다: ${result.filePath}` })
      } else {
        setMessage({ type: 'error', text: result.error || '설정 가져오기에 실패했습니다.' })
      }
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '설정 가져오기에 실패했습니다.' })
      console.error('Failed to import settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="view">
      <div className="view-header">
        <h1 className="view-title">설정</h1>
        <p className="view-subtitle">
          다운로드 기본값 및 앱 설정을 관리하세요
        </p>
      </div>

      {message && (
        <div className={`card status-${message.type}`} style={{ marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      {/* 다운로드 설정 */}
      <div className="card">
        <h2 className="mb-3">📥 다운로드 설정</h2>
        
        <div className="form-group">
          <label className="form-label">기본 저장 위치</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              value={settings.defaultOutputPath}
              readOnly
              placeholder="저장 폴더를 선택하세요"
            />
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={handleSelectDirectory}
              disabled={isSaving}
            >
              폴더 선택
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="default-format" className="form-label">
            기본 오디오 형식
          </label>
          <select
            id="default-format"
            className="form-select"
            value={settings.defaultFormat}
            onChange={(e) => handleSettingChange('defaultFormat', e.target.value)}
            disabled={isSaving}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="flac">FLAC</option>
            <option value="aac">AAC</option>
            <option value="ogg">OGG</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="default-quality" className="form-label">
            기본 음질
          </label>
          <select
            id="default-quality"
            className="form-select"
            value={settings.defaultQuality}
            onChange={(e) => handleSettingChange('defaultQuality', e.target.value)}
            disabled={isSaving}
          >
            <option value="128">128 kbps</option>
            <option value="192">192 kbps</option>
            <option value="320">320 kbps</option>
            <option value="best">최고 품질</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="max-downloads" className="form-label">
            최대 동시 다운로드 수: {settings.maxConcurrentDownloads}개
          </label>
          <input
            id="max-downloads"
            type="range"
            min="1"
            max="5"
            value={settings.maxConcurrentDownloads}
            onChange={(e) => handleSettingChange('maxConcurrentDownloads', parseInt(e.target.value))}
            disabled={isSaving}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>1개</span>
            <span>5개</span>
          </div>
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="card">
        <h2 className="mb-3">🔔 알림 설정</h2>
        
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
              disabled={isSaving}
            />
            <span>다운로드 완료 시 알림 표시</span>
          </label>
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="card">
        <h2 className="mb-3">🎨 테마 설정</h2>
        
        <div className="form-group">
          <label htmlFor="theme" className="form-label">
            테마
          </label>
          <select
            id="theme"
            className="form-select"
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
            disabled={isSaving}
          >
            <option value="system">시스템 설정 따르기</option>
            <option value="light">라이트 테마</option>
            <option value="dark">다크 테마</option>
          </select>
        </div>
      </div>

      {/* 고급 설정 */}
      <div className="card">
        <h2 className="mb-3">⚙️ 고급 설정</h2>
        
        <div className="form-group">
          <label className="form-label">설정 백업 및 복원</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExport}
              disabled={isSaving}
            >
              📤 설정 내보내기
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleImport(false)}
              disabled={isSaving}
            >
              📥 설정 가져오기
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleImport(true)}
              disabled={isSaving}
              style={{ fontSize: '0.875rem' }}
            >
              🔄 설정 병합 가져오기 (기존 설정 유지)
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            설정을 JSON 파일로 백업하거나 복원할 수 있습니다.
          </p>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isSaving}
            style={{ width: '100%' }}
          >
            🔄 모든 설정 초기화
          </button>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            ⚠️ 주의: 이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="card">
        <h2 className="mb-3">ℹ️ 앱 정보</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
          <div>
            <strong>버전:</strong> 1.0.0
          </div>
          <div>
            <strong>플랫폼:</strong> {navigator.platform}
          </div>
          <div>
            <strong>Electron:</strong> {window.electron?.versions.electron || 'N/A'}
          </div>
          <div>
            <strong>Node.js:</strong> {window.electron?.versions.node || 'N/A'}
          </div>
        </div>
      </div>

      {isSaving && (
        <div className="card text-center">
          <p>설정을 저장하는 중...</p>
        </div>
      )}
    </div>
  )
}

export default SettingsView