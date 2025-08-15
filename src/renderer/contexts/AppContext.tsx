import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { Settings, API } from '../types'

interface AppState {
  isInitialized: boolean
  version: string
}

interface AppContextType {
  state: AppState
  setInitialized: (initialized: boolean) => void
}

const defaultState: AppState = {
  isInitialized: false,
  version: '1.0.0'
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState)

  // useCallback으로 함수 메모이제이션
  const setInitialized = useCallback((initialized: boolean) => {
    setState(prev => ({
      ...prev,
      isInitialized: initialized
    }))
  }, [])

  useEffect(() => {
    // Initialize app state
    const initializeApp = async () => {
      try {
        // Check if Electron API is available
        if (window.api) {
          setInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [])

  // Context value를 useMemo로 메모이제이션하여 불필요한 리렌더링 방지
  const value: AppContextType = useMemo(() => ({
    state,
    setInitialized
  }), [state, setInitialized])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = (): AppContextType => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}