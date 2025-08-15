import React, { useState } from 'react'

interface FilePathSelectorProps {
  value: string
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
  onSelect: (path: string) => Promise<void>
  onClear?: () => void
  selectType?: 'folder' | 'file'
  showClearButton?: boolean
  selectDirectory?: () => Promise<string | null>
}

const FilePathSelector: React.FC<FilePathSelectorProps> = ({
  value,
  placeholder = '폴더를 선택하세요',
  label,
  required = false,
  disabled = false,
  className = '',
  onSelect,
  onClear,
  selectType = 'folder',
  showClearButton = false,
  selectDirectory
}) => {
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async () => {
    console.log('FilePathSelector handleSelect called')
    setIsSelecting(true)
    setError(null)
    
    try {
      console.log('selectDirectory function available:', !!selectDirectory)
      if (!selectDirectory) {
        throw new Error('폴더 선택 기능을 사용할 수 없습니다')
      }

      console.log('Calling selectDirectory...')
      // selectDirectory props 함수를 사용하여 폴더 선택
      const result = await selectDirectory()
      console.log('selectDirectory returned:', result)
      
      if (result && result !== value) {
        console.log('Calling onSelect with:', result)
        await onSelect(result)
      } else {
        console.log('No result or same as current value')
      }
    } catch (error: any) {
      console.error('Directory selection error:', error)
      setError(error.message || `${selectType === 'folder' ? '폴더' : '파일'} 선택 중 오류가 발생했습니다`)
    } finally {
      console.log('Setting isSelecting to false')
      setIsSelecting(false)
    }
  }

  const handleClear = () => {
    if (onClear) {
      onClear()
    }
    setError(null)
  }

  return (
    <div className={`file-path-selector ${className}`}>
      {label && (
        <label className="form-label">
          {selectType === 'folder' ? '📁' : '📄'} {label} {required && '*'}
        </label>
      )}
      
      <div className="file-path-input-group">
        <input
          type="text"
          className={`form-input ${error ? 'error' : value ? 'success' : ''}`}
          value={value}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
        />
        
        <div className="file-path-buttons">
          {showClearButton && value && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClear}
              disabled={disabled || isSelecting}
              title="지우기"
            >
              🗑️
            </button>
          )}
          
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              console.log('Button clicked! disabled:', disabled, 'isSelecting:', isSelecting)
              handleSelect()
            }}
            disabled={disabled || isSelecting}
          >
            {isSelecting ? (
              <>🔄 선택 중...</>
            ) : (
              <>{selectType === 'folder' ? '📂' : '📁'} {selectType === 'folder' ? '폴더' : '파일'} 선택</>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <p className="file-path-error status-error mt-1">
          ⚠️ {error}
        </p>
      )}
      
      {!value && required && (
        <p className="file-path-help text-error mt-1" style={{ fontSize: '0.875rem' }}>
          ⚠️ {selectType === 'folder' ? '폴더를' : '파일을'} 선택해주세요
        </p>
      )}
      
      {value && (
        <p className="file-path-help text-success mt-1" style={{ fontSize: '0.875rem' }}>
          ✅ 선택됨: {value.length > 50 ? '...' + value.slice(-50) : value}
        </p>
      )}
    </div>
  )
}

export default FilePathSelector