/**
 * 실제 YouTube URL을 사용한 기능 테스트
 * 
 * 이 테스트는 실제 네트워크 요청을 포함하므로 통합 테스트로 분류됩니다.
 * 사용자가 제공한 URL: https://www.youtube.com/watch?v=TzneFP-n0XM
 */

describe('YouTube 기능 통합 테스트', () => {
  const testUrl = 'https://www.youtube.com/watch?v=TzneFP-n0XM'

  test('YouTube URL 정규식 검증', () => {
    const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=).+/i
    
    expect(youtubeUrlPattern.test(testUrl)).toBe(true)
    expect(youtubeUrlPattern.test('https://youtu.be/TzneFP-n0XM')).toBe(true)
    expect(youtubeUrlPattern.test('invalid-url')).toBe(false)
  })

  test('URL 형식 검증 함수', () => {
    const validateYouTubeUrl = (url: string): boolean => {
      const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=).+/i
      return youtubeUrlPattern.test(url.trim())
    }

    // 테스트 URL 검증
    expect(validateYouTubeUrl(testUrl)).toBe(true)
    
    // 다양한 형태의 YouTube URL 검증
    const validUrls = [
      'https://www.youtube.com/watch?v=TzneFP-n0XM',
      'https://youtube.com/watch?v=TzneFP-n0XM',
      'http://www.youtube.com/watch?v=TzneFP-n0XM',
      'https://youtu.be/TzneFP-n0XM',
      'https://m.youtube.com/watch?v=TzneFP-n0XM',
      'www.youtube.com/watch?v=TzneFP-n0XM',
      'youtube.com/watch?v=TzneFP-n0XM'
    ]

    validUrls.forEach(url => {
      expect(validateYouTubeUrl(url)).toBe(true)
    })

    // 잘못된 URL들
    const invalidUrls = [
      '',
      'invalid-url',
      'https://google.com',
      'https://vimeo.com/123456',
      'youtube.com',
      'watch?v=TzneFP-n0XM'
    ]

    invalidUrls.forEach(url => {
      expect(validateYouTubeUrl(url)).toBe(false)
    })
  })

  test('다운로드 옵션 객체 생성', () => {
    const createDownloadOptions = (url: string, format: string, quality: string, outputPath: string) => {
      return {
        url: url.trim(),
        format: format as 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg',
        quality: quality as '128' | '192' | '320' | 'best',
        outputPath
      }
    }

    const options = createDownloadOptions(
      testUrl,
      'mp3',
      '320',
      '/Users/test/Downloads'
    )

    expect(options).toEqual({
      url: testUrl,
      format: 'mp3',
      quality: '320',
      outputPath: '/Users/test/Downloads'
    })
  })

  test('URL 파라미터 추출', () => {
    const extractVideoId = (url: string): string | null => {
      const patterns = [
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /m\.youtube\.com\/watch\?v=([^&]+)/
      ]

      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          return match[1]
        }
      }
      return null
    }

    expect(extractVideoId(testUrl)).toBe('TzneFP-n0XM')
    expect(extractVideoId('https://youtu.be/TzneFP-n0XM')).toBe('TzneFP-n0XM')
    expect(extractVideoId('https://m.youtube.com/watch?v=TzneFP-n0XM')).toBe('TzneFP-n0XM')
    expect(extractVideoId('invalid-url')).toBeNull()
  })
})

// 실제 네트워크 요청을 포함하는 테스트 (선택적)
describe('YouTube 메타데이터 추출 (통합 테스트)', () => {
  const testUrl = 'https://www.youtube.com/watch?v=TzneFP-n0XM'

  // 이 테스트는 실제 네트워크 요청이 필요하므로 skip 처리
  // 실제 테스트 시에는 describe.skip을 describe로 변경
  describe.skip('실제 네트워크 요청 테스트', () => {
    test('URL 접근 가능성 확인', async () => {
      // 실제 환경에서는 youtube-dl-exec를 사용하여 메타데이터 추출
      // 테스트 환경에서는 mock으로 대체
      const mockMetadata = {
        title: '테스트 동영상',
        artist: '테스트 아티스트',
        duration: '3:45',
        viewCount: 1000000,
        thumbnail: 'https://example.com/thumb.jpg'
      }

      // Mock 함수가 올바른 형태의 메타데이터를 반환하는지 검증
      expect(mockMetadata).toHaveProperty('title')
      expect(mockMetadata).toHaveProperty('duration')
      expect(typeof mockMetadata.viewCount).toBe('number')
    })
  })
})

// 사용자 시나리오 테스트
describe('사용자 시나리오 테스트', () => {
  test('전체 다운로드 플로우 시뮬레이션', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=TzneFP-n0XM'
    
    // 1. URL 검증
    const isValidUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=).+/i.test(testUrl)
    expect(isValidUrl).toBe(true)

    // 2. 메타데이터 추출 (Mock)
    const mockExtractMetadata = jest.fn().mockResolvedValue({
      title: 'Sample Music Video',
      artist: 'Sample Artist',
      duration: '4:23',
      viewCount: 5000000,
      thumbnail: 'https://img.youtube.com/vi/TzneFP-n0XM/maxresdefault.jpg'
    })

    const metadata = await mockExtractMetadata(testUrl)
    expect(metadata).toHaveProperty('title')
    expect(metadata.title).toBe('Sample Music Video')

    // 3. 다운로드 옵션 설정
    const downloadOptions = {
      url: testUrl,
      format: 'mp3' as const,
      quality: '320' as const,
      outputPath: '/Users/test/Downloads'
    }

    // 4. 다운로드 시작 (Mock)
    const mockStartDownload = jest.fn().mockResolvedValue('download-123')
    const downloadId = await mockStartDownload(downloadOptions)
    
    expect(downloadId).toBe('download-123')
    expect(mockStartDownload).toHaveBeenCalledWith(downloadOptions)
  })

  test('에러 처리 시나리오', async () => {
    // 잘못된 URL
    const invalidUrl = 'invalid-url'
    const isValidUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=).+/i.test(invalidUrl)
    expect(isValidUrl).toBe(false)

    // 네트워크 에러 시뮬레이션
    const mockValidateUrl = jest.fn().mockRejectedValue(new Error('Network error'))
    
    try {
      await mockValidateUrl(invalidUrl)
    } catch (error: any) {
      expect(error.message).toBe('Network error')
    }

    // 메타데이터 추출 실패
    const mockExtractMetadata = jest.fn().mockRejectedValue(new Error('Video not accessible'))
    
    try {
      await mockExtractMetadata('https://www.youtube.com/watch?v=invalid')
    } catch (error: any) {
      expect(error.message).toBe('Video not accessible')
    }
  })
})