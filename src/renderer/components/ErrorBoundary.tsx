import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 오류 로깅
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // 사용자 정의 오류 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 사용자 정의 fallback 컴포넌트가 있으면 사용
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      // 기본 오류 UI
      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

// 기본 오류 화면 컴포넌트
const DefaultErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => {
  return (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <div className="error-boundary-header">
          <h2>🚨 앗! 문제가 발생했습니다</h2>
          <p>예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
        
        <div className="error-boundary-actions">
          <button 
            className="btn btn-primary"
            onClick={retry}
          >
            🔄 다시 시도
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            🔃 앱 새로고침
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="error-boundary-details">
            <summary>개발자 정보 (디버그용)</summary>
            <div className="error-boundary-debug">
              <h4>오류 메시지:</h4>
              <pre>{error.message}</pre>
              
              {error.stack && (
                <>
                  <h4>스택 트레이스:</h4>
                  <pre>{error.stack}</pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// 특정 기능용 오류 화면들
export const DownloadErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="error-boundary download-error">
    <div className="error-boundary-content">
      <div className="error-boundary-header">
        <h3>⬇️ 다운로드 오류</h3>
        <p>다운로드 중 문제가 발생했습니다.</p>
      </div>
      
      <div className="error-boundary-actions">
        <button className="btn btn-primary" onClick={retry}>
          🔄 다운로드 재시도
        </button>
      </div>
      
      {error && (
        <p className="error-boundary-message">
          오류: {error.message}
        </p>
      )}
    </div>
  </div>
)

export const SettingsErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="error-boundary settings-error">
    <div className="error-boundary-content">
      <div className="error-boundary-header">
        <h3>⚙️ 설정 오류</h3>
        <p>설정을 불러오는 중 문제가 발생했습니다.</p>
      </div>
      
      <div className="error-boundary-actions">
        <button className="btn btn-primary" onClick={retry}>
          🔄 설정 다시 불러오기
        </button>
      </div>
    </div>
  </div>
)

export default ErrorBoundary