import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { ContextProviders } from './contexts'
import { ErrorBoundary, DownloadErrorFallback, SettingsErrorFallback } from './components'
import LegalNoticeDialog from './components/LegalNoticeDialog'
import './assets/index.css'

// Views
import MainView from './views/MainView'
import SettingsView from './views/SettingsView'
import DownloadsView from './views/DownloadsView'

const Navigation: React.FC = () => {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'nav-link nav-link-active' : 'nav-link'
  }

  return (
    <nav className="app-nav">
      <div className="app-header">
        <div className="app-icon">🎵</div>
        <h1 className="app-title">Music Downloader</h1>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>다운로드</Link>
        <Link to="/downloads" className={isActive('/downloads')}>목록</Link>
        <Link to="/settings" className={isActive('/settings')}>설정</Link>
      </div>
    </nav>
  )
}

function App(): JSX.Element {
  const [showLegalNotice, setShowLegalNotice] = useState(true)
  const [appReady, setAppReady] = useState(false)

  const handleLegalAccept = () => {
    setShowLegalNotice(false)
    setAppReady(true)
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error:', error)
        console.error('Error Info:', errorInfo)
        // 실제 프로덕션에서는 오류 리포팅 서비스로 전송
      }}
    >
      <ContextProviders>
        <LegalNoticeDialog 
          isOpen={showLegalNotice} 
          onAccept={handleLegalAccept} 
        />
        {appReady && (
          <Router>
            <div className="app">
              <Navigation />
            
            <main className="app-main">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <ErrorBoundary fallback={DownloadErrorFallback}>
                      <MainView />
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/downloads" 
                  element={
                    <ErrorBoundary fallback={DownloadErrorFallback}>
                      <DownloadsView />
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ErrorBoundary fallback={SettingsErrorFallback}>
                      <SettingsView />
                    </ErrorBoundary>
                  } 
                />
              </Routes>
            </main>
            
              <footer className="app-footer">
                <p>Music Downloader v1.0.0 - YouTube 음악 다운로드 도구</p>
              </footer>
            </div>
          </Router>
        )}
      </ContextProviders>
    </ErrorBoundary>
  )
}

export default App