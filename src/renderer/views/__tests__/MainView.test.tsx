import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import MainView from '../MainView'
import { ContextProviders } from '../../contexts'

// Mock Context 생성
const mockDownloadContext = {
  state: {
    activeDownloads: new Map(),
    completedDownloads: [],
    errors: []
  },
  startDownload: jest.fn(),
  validateUrl: jest.fn(),
  extractMetadata: jest.fn(),
  pauseDownload: jest.fn(),
  resumeDownload: jest.fn(),
  cancelDownload: jest.fn(),
  clearDownload: jest.fn()
}

const mockSettingsContext = {
  settings: {
    defaultOutputPath: '',
    defaultFormat: 'mp3',
    defaultQuality: '192',
    maxConcurrentDownloads: 3,
    enableNotifications: true,
    theme: 'system'
  },
  updateSettings: jest.fn(),
  resetSettings: jest.fn(),
  selectDirectory: jest.fn(),
  openDownloadFolder: jest.fn()
}

// Context Provider Wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <div>{children}</div>
    </BrowserRouter>
  )
}

// Context mocking
jest.mock('../../contexts', () => ({
  useDownload: () => mockDownloadContext,
  useSettings: () => mockSettingsContext,
  ContextProviders: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// 컴포넌트 mocking
jest.mock('../../components', () => ({
  StatusIndicator: ({ status, text }: { status: string; text: string }) => (
    <div data-testid={`status-${status}`}>{text}</div>
  ),
  LoadingSpinner: ({ text, inline }: { text?: string; inline?: boolean }) => (
    <div data-testid="loading-spinner" className={inline ? 'inline' : ''}>{text}</div>
  ),
  FilePathSelector: ({ 
    value, 
    onSelect, 
    onClear, 
    label 
  }: { 
    value: string; 
    onSelect: (path: string) => void; 
    onClear?: () => void;
    label?: string;
  }) => (
    <div data-testid="file-path-selector">
      <label>{label}</label>
      <input data-testid="path-input" value={value} readOnly />
      <button 
        data-testid="select-button"
        onClick={() => onSelect('/mock/path')}
      >
        선택
      </button>
      {onClear && (
        <button data-testid="clear-button" onClick={onClear}>
          지우기
        </button>
      )}
    </div>
  )
}))

describe('MainView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('컴포넌트가 정상적으로 렌더링됩니다', () => {
    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    expect(screen.getByText('🎵 YouTube 음악 다운로더')).toBeInTheDocument()
    expect(screen.getByText('YouTube URL을 입력하여 고음질 음악 파일로 변환하세요')).toBeInTheDocument()
    expect(screen.getByLabelText('🔗 YouTube URL *')).toBeInTheDocument()
  })

  test('YouTube URL 입력 시 검증이 작동합니다', async () => {
    const user = userEvent.setup()
    mockDownloadContext.validateUrl.mockResolvedValue(true)
    mockDownloadContext.extractMetadata.mockResolvedValue({
      title: '테스트 동영상',
      artist: '테스트 아티스트',
      duration: '3:45',
      viewCount: 1000000,
      thumbnail: 'https://example.com/thumb.jpg'
    })

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    
    await user.type(urlInput, 'https://www.youtube.com/watch?v=TzneFP-n0XM')

    await waitFor(() => {
      expect(mockDownloadContext.validateUrl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=TzneFP-n0XM')
    })
  })

  test('잘못된 URL 형식 입력 시 에러 메시지가 표시됩니다', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    
    await user.type(urlInput, 'invalid-url')

    await waitFor(() => {
      expect(screen.getByTestId('status-error')).toBeInTheDocument()
      expect(screen.getByText(/올바른 YouTube URL을 입력해주세요/)).toBeInTheDocument()
    })
  })

  test('유효한 YouTube URL 입력 시 성공 메시지가 표시됩니다', async () => {
    const user = userEvent.setup()
    mockDownloadContext.validateUrl.mockResolvedValue(true)
    mockDownloadContext.extractMetadata.mockResolvedValue({
      title: '테스트 동영상'
    })

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    
    await user.type(urlInput, 'https://www.youtube.com/watch?v=TzneFP-n0XM')

    await waitFor(() => {
      expect(screen.getByTestId('status-success')).toBeInTheDocument()
    })
  })

  test('메타데이터 추출 시 동영상 정보가 표시됩니다', async () => {
    const user = userEvent.setup()
    mockDownloadContext.validateUrl.mockResolvedValue(true)
    mockDownloadContext.extractMetadata.mockResolvedValue({
      title: '테스트 동영상',
      artist: '테스트 아티스트',
      duration: '3:45',
      viewCount: 1000000,
      thumbnail: 'https://example.com/thumb.jpg'
    })

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    
    await user.type(urlInput, 'https://www.youtube.com/watch?v=TzneFP-n0XM')

    await waitFor(() => {
      expect(screen.getByText('🎵 테스트 동영상')).toBeInTheDocument()
      expect(screen.getByText(/테스트 아티스트/)).toBeInTheDocument()
      expect(screen.getByText(/3:45/)).toBeInTheDocument()
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument()
    })
  })

  test('다운로드 버튼이 조건에 따라 활성화/비활성화됩니다', () => {
    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const downloadButton = screen.getByRole('button', { name: /YouTube URL을 입력해주세요/ })
    expect(downloadButton).toBeDisabled()
  })

  test('저장 폴더 선택이 작동합니다', async () => {
    const user = userEvent.setup()
    mockSettingsContext.updateSettings.mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const selectButton = screen.getByTestId('select-button')
    await user.click(selectButton)

    expect(mockSettingsContext.updateSettings).toHaveBeenCalledWith({
      defaultOutputPath: '/mock/path'
    })
  })

  test('폼 설정값이 올바르게 처리됩니다', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    // 오디오 형식 변경
    const formatSelect = screen.getByLabelText('🎼 오디오 형식')
    await user.selectOptions(formatSelect, 'wav')
    expect(formatSelect).toHaveValue('wav')

    // 음질 변경
    const qualitySelect = screen.getByLabelText('🎚️ 음질')
    await user.selectOptions(qualitySelect, '320')
    expect(qualitySelect).toHaveValue('320')
  })

  test('다운로드 시작이 정상적으로 작동합니다', async () => {
    const user = userEvent.setup()
    
    // Mock 설정
    mockDownloadContext.validateUrl.mockResolvedValue(true)
    mockDownloadContext.extractMetadata.mockResolvedValue({
      title: '테스트 동영상'
    })
    mockDownloadContext.startDownload.mockResolvedValue('download-123')
    mockSettingsContext.settings.defaultOutputPath = '/test/path'
    mockSettingsContext.updateSettings.mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    // URL 입력
    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    await user.type(urlInput, 'https://www.youtube.com/watch?v=TzneFP-n0XM')

    // 검증 완료까지 대기
    await waitFor(() => {
      expect(screen.getByTestId('status-success')).toBeInTheDocument()
    })

    // 다운로드 버튼 클릭
    const downloadButton = screen.getByRole('button', { name: /다운로드 시작/ })
    await user.click(downloadButton)

    expect(mockDownloadContext.startDownload).toHaveBeenCalledWith({
      url: 'https://www.youtube.com/watch?v=TzneFP-n0XM',
      format: 'mp3',
      quality: '192',
      outputPath: '/test/path'
    })
  })

  test('로딩 상태가 올바르게 표시됩니다', async () => {
    const user = userEvent.setup()
    
    // validateUrl이 pending 상태가 되도록 설정
    let resolveValidation: (value: boolean) => void
    mockDownloadContext.validateUrl.mockImplementation(() => {
      return new Promise(resolve => {
        resolveValidation = resolve
      })
    })

    render(
      <TestWrapper>
        <MainView />
      </TestWrapper>
    )

    const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=/)
    await user.type(urlInput, 'https://www.youtube.com/watch?v=TzneFP-n0XM')

    // 로딩 스피너가 표시되는지 확인
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText('동영상 정보를 확인하는 중...')).toBeInTheDocument()

    // 검증 완료
    resolveValidation!(true)
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })
  })
})

// URL 검증 유틸리티 함수 테스트
describe('YouTube URL Validation', () => {
  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=).+/i
    return youtubeUrlPattern.test(url.trim())
  }

  test('유효한 YouTube URL들을 올바르게 검증합니다', () => {
    const validUrls = [
      'https://www.youtube.com/watch?v=TzneFP-n0XM',
      'https://youtube.com/watch?v=TzneFP-n0XM',
      'http://www.youtube.com/watch?v=TzneFP-n0XM',
      'https://youtu.be/TzneFP-n0XM',
      'https://m.youtube.com/watch?v=TzneFP-n0XM',
      'www.youtube.com/watch?v=TzneFP-n0XM',
      'youtube.com/watch?v=TzneFP-n0XM',
    ]

    validUrls.forEach(url => {
      expect(validateYouTubeUrl(url)).toBe(true)
    })
  })

  test('잘못된 URL들을 올바르게 거부합니다', () => {
    const invalidUrls = [
      '',
      'invalid-url',
      'https://google.com',
      'https://vimeo.com/123456',
      'youtube.com',
      'watch?v=TzneFP-n0XM',
      'https://youtube.com/playlist?list=123',
    ]

    invalidUrls.forEach(url => {
      expect(validateYouTubeUrl(url)).toBe(false)
    })
  })
})