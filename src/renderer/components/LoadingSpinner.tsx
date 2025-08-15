import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  inline?: boolean
  className?: string
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  inline = false,
  className = '',
  color = 'primary'
}) => {
  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'small': return 'spinner-small'
      case 'large': return 'spinner-large'
      default: return 'spinner-medium'
    }
  }

  const getColorClass = (color: string): string => {
    switch (color) {
      case 'secondary': return 'spinner-secondary'
      case 'success': return 'spinner-success'
      case 'warning': return 'spinner-warning'
      case 'error': return 'spinner-error'
      default: return 'spinner-primary'
    }
  }

  if (inline) {
    return (
      <span 
        data-testid="loading-spinner-inline"
        className={`loading-spinner-inline ${getSizeClass(size)} ${getColorClass(color)} ${className}`}
      >
        <span className="spinner" />
        {text && <span className="spinner-text">{text}</span>}
      </span>
    )
  }

  return (
    <div 
      data-testid="loading-spinner"
      className={`loading-spinner ${getSizeClass(size)} ${getColorClass(color)} ${className}`}
    >
      <div className="spinner-container">
        <div className="spinner" />
        {text && <p className="spinner-text">{text}</p>}
      </div>
    </div>
  )
}

// 사용하기 쉬운 프리셋 컴포넌트들
export const LoadingDots: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <div className={`loading-dots ${className || ''}`}>
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="dot"></span>
    {text && <span className="dots-text">{text}</span>}
  </div>
)

export const LoadingPulse: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <div className={`loading-pulse ${className || ''}`}>
    <div className="pulse-circle"></div>
    {text && <span className="pulse-text">{text}</span>}
  </div>
)

export const LoadingBars: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <div className={`loading-bars ${className || ''}`}>
    <div className="bar bar1"></div>
    <div className="bar bar2"></div>
    <div className="bar bar3"></div>
    <div className="bar bar4"></div>
    {text && <span className="bars-text">{text}</span>}
  </div>
)

export default LoadingSpinner