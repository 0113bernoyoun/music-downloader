import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { VideoMetadata } from '../types'

interface ValidationState {
  isValid: boolean | null
  isValidating: boolean
  error: string | null
}

interface MainViewState {
  // 폼 상태
  url: string
  format: string
  quality: string
  metadata: VideoMetadata | null
  validation: ValidationState
  
  // UI 상태
  isDownloading: boolean
  message: { type: 'success' | 'error' | 'info', text: string } | null
  
  // 액션들
  setUrl: (url: string) => void
  setFormat: (format: string) => void
  setQuality: (quality: string) => void
  setMetadata: (metadata: VideoMetadata | null) => void
  setValidation: (validation: ValidationState) => void
  setIsDownloading: (isDownloading: boolean) => void
  setMessage: (message: { type: 'success' | 'error' | 'info', text: string } | null) => void
  
  // 폼 초기화
  resetForm: () => void
  clearMessage: () => void
}

const initialState = {
  url: '',
  format: 'mp3',
  quality: '192',
  metadata: null,
  validation: {
    isValid: null,
    isValidating: false,
    error: null
  },
  isDownloading: false,
  message: null
}

export const useMainViewStore = create<MainViewState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setUrl: (url: string) => set({ url }),
      setFormat: (format: string) => set({ format }),
      setQuality: (quality: string) => set({ quality }),
      setMetadata: (metadata: VideoMetadata | null) => set({ metadata }),
      setValidation: (validation: ValidationState) => set({ validation }),
      setIsDownloading: (isDownloading: boolean) => set({ isDownloading }),
      setMessage: (message: { type: 'success' | 'error' | 'info', text: string } | null) => set({ message }),
      
      resetForm: () => set({
        url: '',
        metadata: null,
        validation: {
          isValid: null,
          isValidating: false,
          error: null
        }
      }),
      
      clearMessage: () => set({ message: null })
    }),
    {
      name: 'main-view-storage',
      // 메타데이터 요청 상태도 유지 (로딩 상태 포함)
      partialize: (state) => ({
        url: state.url,
        format: state.format,
        quality: state.quality,
        metadata: state.metadata,
        validation: state.validation
        // isDownloading과 message는 보안상 페이지 이동 시 초기화
      })
    }
  )
)