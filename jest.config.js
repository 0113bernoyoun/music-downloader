module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',
  
  // 모듈 파일 확장자
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  
  // TypeScript 파일 변환
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // 테스트 설정 파일
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main/**/*', // Electron 메인 프로세스 제외
    '!src/**/*.d.ts',
    '!src/test/**/*'
  ],
  
  // 모듈 경로 해석
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // 모듈 이름 매핑 (올바른 속성명)
  moduleNameMapper: {
    // CSS 및 asset 파일 mock
    '\\.(css|less|sass|scss|styl)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/test/__mocks__/fileMock.js',
    // Electron 관련 모듈 mock
    '^electron$': '<rootDir>/src/test/__mocks__/electronMock.js',
    // 모듈 경로 별칭
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 테스트 실행 전 정리
  clearMocks: true,
  restoreMocks: true,
  
  // 병렬 테스트 실행
  maxWorkers: '50%',
  
  // 테스트 타임아웃 (30초)
  testTimeout: 30000
}