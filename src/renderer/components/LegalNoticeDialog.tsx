import React, { useState, useEffect } from 'react'

interface LegalNoticeDialogProps {
  isOpen: boolean
  onAccept: () => void
}

const LegalNoticeDialog: React.FC<LegalNoticeDialogProps> = ({ isOpen, onAccept }) => {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    // 로컬 스토리지에서 동의 여부 확인
    const hasAccepted = localStorage.getItem('legal-notice-accepted')
    if (hasAccepted === 'true') {
      setAccepted(true)
      onAccept()
    }
  }, [onAccept])

  const handleAccept = () => {
    localStorage.setItem('legal-notice-accepted', 'true')
    setAccepted(true)
    onAccept()
  }

  if (!isOpen || accepted) {
    return null
  }

  return (
    <div className="legal-notice-overlay">
      <div className="legal-notice-dialog">
        <div className="legal-notice-header">
          <h2>⚖️ 법적 고지사항</h2>
        </div>
        
        <div className="legal-notice-content">
          <div className="legal-notice-warning">
            <h3>🚨 중요한 법적 고지</h3>
            <p>
              본 프로그램 사용에 따른 <strong>모든 법적 책임은 사용자에게 있습니다.</strong>
            </p>
          </div>

          <div className="legal-notice-rules">
            <h4>📋 사용 시 주의사항:</h4>
            <ul>
              <li>저작권이 보호되는 콘텐츠를 무단으로 다운로드하지 마세요</li>
              <li>개인적, 비상업적 용도로만 사용하세요</li>
              <li>콘텐츠 제작자의 권리를 존중하세요</li>
              <li>관련 법률 및 플랫폼 이용약관을 준수하세요</li>
              <li>YouTube Premium 등 정당한 서비스 이용을 우선 고려하세요</li>
            </ul>
          </div>

          <div className="legal-notice-disclaimer">
            <h4>⚠️ 면책 조항:</h4>
            <p>
              개발자는 본 소프트웨어의 오용으로 인한 어떠한 법적 문제나 손해에 대해서도 
              책임을 지지 않습니다. 사용자는 본인의 책임 하에 관련 법률을 확인하고 
              준수해야 합니다.
            </p>
          </div>

          <div className="legal-notice-educational">
            <p>
              <strong>교육 목적:</strong> 본 프로그램은 기술적 학습 목적으로 제작되었습니다.
            </p>
          </div>
        </div>

        <div className="legal-notice-footer">
          <button 
            className="btn btn-primary legal-accept-btn"
            onClick={handleAccept}
          >
            ✅ 이해했으며 동의합니다
          </button>
          <p className="legal-notice-small">
            동의하지 않으시면 프로그램을 사용할 수 없습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LegalNoticeDialog