import React from 'react'

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending'

interface StatusIndicatorProps {
  status: StatusType
  text: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  showIcon?: boolean
  className?: string
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  icon,
  size = 'medium',
  showIcon = true,
  className = ''
}) => {
  const getDefaultIcon = (status: StatusType): string => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'pending': return '⏳'
      default: return '📄'
    }
  }

  const getStatusClass = (status: StatusType): string => {
    switch (status) {
      case 'success': return 'status-success'
      case 'error': return 'status-error'
      case 'warning': return 'status-warning'
      case 'info': return 'status-info'
      case 'pending': return 'status-pending'
      default: return 'status-info'
    }
  }

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'small': return 'status-small'
      case 'large': return 'status-large'
      default: return ''
    }
  }

  const displayIcon = icon || getDefaultIcon(status)

  return (
    <div className={`status ${getStatusClass(status)} ${getSizeClass(size)} ${className}`}>
      {showIcon && <span className="status-icon">{displayIcon}</span>}
      <span className="status-text">{text}</span>
    </div>
  )
}

export default StatusIndicator