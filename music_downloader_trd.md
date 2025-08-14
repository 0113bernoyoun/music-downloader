# Music Downloader - 기술 요구사항 명세서 (TRD)

## 1. 기술 스택 개요

### 1.1 핵심 기술
- **Electron 25.0.0** - 크로스 플랫폼 데스크톱 애플리케이션 프레임워크
- **Node.js 18+** - JavaScript 런타임 환경
- **TypeScript 5.0.0** - 정적 타입 검사 및 개발 생산성
- **React 18.2.0** - 사용자 인터페이스 라이브러리
- **Material-UI 5.14.0** - UI 컴포넌트 프레임워크

### 1.2 빌드 및 개발 도구
- **Vite 4.0.0** - 빌드 도구 및 개발 서버
- **electron-builder 24.0.0** - 크로스 플랫폼 패키징
- **Concurrently** - 병렬 스크립트 실행
- **ESLint & Prettier** - 코드 품질 관리

### 1.3 핵심 기능 라이브러리
- **youtube-dl-exec 2.5.6** - 다운로드 엔진
- **ffmpeg-static 5.2.0** - 오디오 처리 및 변환
- **@emotion/react & @emotion/styled** - CSS-in-JS 스타일링

## 2. 아키텍처 설계

### 2.1 애플리케이션 구조
```
music-downloader/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── core/               # 핵심 비즈니스 로직
│   │   │   ├── download.ts     # 다운로드 매니저
│   │   │   ├── metadata.ts     # 메타데이터 추출
│   │   │   ├── converter.ts    # 오디오 변환
│   │   │   └── settings.ts     # 설정 관리
│   │   ├── ipc/               # IPC 통신 레이어
│   │   │   └── handlers.ts     # IPC 핸들러
│   │   ├── utils/             # 유틸리티 함수
│   │   │   ├── fileManager.ts  # 파일 시스템 관리
│   │   │   └── logger.ts       # 로깅 시스템
│   │   ├── main.ts            # 메인 프로세스 진입점
│   │   └── preload.ts         # 프리로드 스크립트
│   └── renderer/               # React 렌더러 프로세스
│       ├── components/         # 재사용 가능한 컴포넌트
│       ├── contexts/          # React 컨텍스트
│       ├── hooks/             # 커스텀 훅
│       ├── utils/             # 프론트엔드 유틸리티
│       ├── views/             # 페이지 컴포넌트
│       ├── types/             # TypeScript 타입 정의
│       ├── App.tsx            # 메인 앱 컴포넌트
│       └── main.tsx           # React 진입점
├── assets/                     # 정적 리소스
├── dist/                      # 빌드 출력 디렉토리
├── release/                   # 패키징 출력 디렉토리
└── [설정파일들]
```

### 2.2 프로세스 아키텍처
```
┌─────────────────────┐
│   Main Process     │
│  (Node.js/Electron) │
│                     │
│  ┌─────────────────┐│
│  │  Core Modules   ││
│  │  - Download     ││
│  │  - Metadata     ││
│  │  - Settings     ││
│  └─────────────────┘│
│                     │
│  ┌─────────────────┐│
│  │  IPC Handlers   ││
│  └─────────────────┘│
└─────────────────────┘
           │
           │ IPC Communication
           │
┌─────────────────────┐
│ Renderer Process   │
│   (React/Browser)   │
│                     │
│  ┌─────────────────┐│
│  │  UI Components  ││
│  │  - MainView     ││
│  │  - Settings     ││
│  │  - Downloads    ││
│  └─────────────────┘│
│                     │
│  ┌─────────────────┐│
│  │  State Mgmt     ││
│  │  - Contexts     ││
│  │  - Hooks        ││
│  └─────────────────┘│
└─────────────────────┘
```

## 3. 플랫폼별 요구사항

### 3.1 Windows
- **최소 요구사항**: Windows 10 x64
- **권장 사양**: Windows 11 x64
- **의존성**: 
  - Visual C++ Redistributable 2019+
  - .NET Framework 4.8+
- **패키징**: NSIS 설치 파일 + 포터블 버전
- **코드 서명**: 가능한 경우 Windows Authenticode 적용

### 3.2 macOS
- **최소 요구사항**: macOS 10.15 (Catalina)
- **권장 사양**: macOS 12.0+ (Monterey)
- **아키텍처**: Intel x64 + Apple Silicon (Universal Binary)
- **패키징**: DMG 및 PKG 형식
- **공증**: Apple Notarization (배포 시)
- **권한**: 다운로드 폴더 접근 권한

### 3.3 Linux
- **지원 배포판**: 
  - Ubuntu 18.04+
  - Debian 10+
  - CentOS 8+
  - Fedora 35+
- **패키징**: AppImage (우선), deb, rpm
- **의존성**: 
  - glibc 2.28+
  - GTK 3.0+
  - libnotify

## 4. 기술적 구현 요구사항

### 4.1 보안 요구사항
```typescript
// 보안 설정 (main.ts)
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,        // Node.js API 비활성화
    contextIsolation: true,        // 컨텍스트 격리
    enableRemoteModule: false,     // Remote 모듈 비활성화
    preload: path.join(__dirname, 'preload.js'),
    sandbox: false,                // 파일 시스템 접근을 위해 비활성화
    webSecurity: true             // 웹 보안 활성화
  }
})
```

### 4.2 IPC 통신 인터페이스
```typescript
// 타입 정의
interface DownloadOptions {
  url: string
  format: 'mp3' | 'wav' | 'flac'
  quality: '128' | '192' | '320' | 'best'
  outputPath: string
  metadata?: {
    title?: string
    artist?: string
    album?: string
  }
}

interface DownloadProgress {
  id: string
  progress: number  // 0-100
  speed: string     // "1.2 MB/s"
  eta: string      // "00:05:30"
  status: 'pending' | 'downloading' | 'converting' | 'completed' | 'failed'
}

// IPC API 정의
interface ElectronAPI {
  // 다운로드 관련
  startDownload: (options: DownloadOptions) => Promise<string>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  getDownloadProgress: (id: string) => Promise<DownloadProgress>
  
  // 메타데이터 관련
  extractMetadata: (url: string) => Promise<VideoMetadata>
  validateUrl: (url: string) => Promise<boolean>
  
  // 설정 관련
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  
  // 파일 시스템 관련
  selectDirectory: () => Promise<string | null>
  openDownloadFolder: (path: string) => Promise<void>
  
  // 이벤트 리스너
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
  onDownloadComplete: (callback: (result: DownloadResult) => void) => void
  onError: (callback: (error: ErrorInfo) => void) => void
}
```

### 4.3 다운로드 엔진 구현
```typescript
// download.ts 핵심 구조
export class DownloadManager {
  private activeDownloads = new Map<string, DownloadJob>()
  private downloadQueue: DownloadOptions[] = []
  private maxConcurrentDownloads = 3

  async startDownload(options: DownloadOptions): Promise<string> {
    const downloadId = this.generateId()
    const job = new DownloadJob(downloadId, options)
    
    // YouTube-dl 옵션 설정
    const ytdlOptions = {
      extractAudio: true,
      audioFormat: options.format,
      audioQuality: options.quality,
      output: path.join(options.outputPath, '%(title)s.%(ext)s'),
      embedThumbnail: true,
      addMetadata: true,
      noPlaylist: true,
      writeInfoJson: false,
      writeThumbnail: false
    }

    // FFmpeg 경로 설정
    if (ffmpegPath) {
      ytdlOptions.ffmpegLocation = ffmpegPath
    }

    this.activeDownloads.set(downloadId, job)
    this.processDownload(job, ytdlOptions)
    
    return downloadId
  }

  private async processDownload(job: DownloadJob, options: any) {
    try {
      const process = youtubeDl(job.options.url, options, {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      // 진행 상황 파싱
      process.stdout?.on('data', (data) => {
        this.parseProgress(job.id, data.toString())
      })

      // 에러 처리
      process.stderr?.on('data', (data) => {
        this.handleError(job.id, data.toString())
      })

      await process
      this.completeDownload(job.id)
    } catch (error) {
      this.failDownload(job.id, error)
    }
  }
}
```

### 4.4 오디오 변환 처리
```typescript
// converter.ts
export class AudioConverter {
  async convertAudio(
    inputPath: string, 
    outputPath: string, 
    options: ConversionOptions
  ): Promise<void> {
    const ffmpeg = spawn(ffmpegPath!, [
      '-i', inputPath,
      '-acodec', this.getCodec(options.format),
      '-ab', `${options.bitrate}k`,
      '-ar', '44100',
      '-ac', '2',
      outputPath
    ])

    return new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`FFmpeg exited with code ${code}`))
      })
    })
  }

  private getCodec(format: string): string {
    switch (format) {
      case 'mp3': return 'libmp3lame'
      case 'wav': return 'pcm_s16le'
      case 'flac': return 'flac'
      default: return 'libmp3lame'
    }
  }
}
```

### 4.5 에러 처리 및 로깅
```typescript
// logger.ts
export class Logger {
  private logFile: string

  constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    this.logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`)
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    console.log(logEntry)
    if (data) console.log(data)
    
    fs.appendFileSync(this.logFile, logEntry + '\n')
  }
}
```

## 5. 빌드 및 배포 요구사항

### 5.1 개발 환경 설정
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite --host 0.0.0.0 --port 3000",
    "dev:main": "tsc -p tsconfig.main.json --watch",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "package": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder",
    "dist:all": "npm run build && electron-builder --mac --win --linux",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux"
  }
}
```

### 5.2 Electron Builder 설정
```json
{
  "build": {
    "appId": "com.musicdownloader.app",
    "productName": "Music Downloader",
    "directories": {
      "output": "release",
      "buildResources": "assets"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "node_modules/ffmpeg-static",
        "to": "ffmpeg",
        "filter": ["**/*"]
      }
    ],
    "asar": true,
    "asarUnpack": [
      "**/node_modules/ffmpeg-static/**/*",
      "**/node_modules/youtube-dl-exec/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "assets/icon.icns",
      "category": "public.app-category.music",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "assets/entitlements.mac.plist",
      "entitlementsInherit": "assets/entitlements.mac.plist"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.png",
      "category": "AudioVideo",
      "synopsis": "음악 다운로더",
      "description": "YouTube 등 다양한 플랫폼에서 음악을 다운로드하는 데스크톱 애플리케이션"
    },
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "music-downloader"
    }
  }
}
```

### 5.3 TypeScript 설정
```json
// tsconfig.main.json (메인 프로세스용)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "commonjs",
    "target": "es2020",
    "lib": ["es2020"],
    "noEmit": false,
    "declaration": false,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "src/main/**/*"
  ],
  "exclude": [
    "src/renderer",
    "node_modules",
    "dist"
  ]
}
```

### 5.4 Vite 설정
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['electron']
    }
  },
  server: {
    port: 3000,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@utils': path.resolve(__dirname, 'src/renderer/utils'),
      '@types': path.resolve(__dirname, 'src/renderer/types')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
```

## 6. 성능 및 최적화 요구사항

### 6.1 메모리 사용량
- **최대 메모리 사용량**: 512MB (일반 사용)
- **최대 메모리 사용량**: 1GB (다중 다운로드)
- **메모리 누수 방지**: WeakMap, WeakSet 활용
- **가비지 컬렉션**: 대용량 파일 처리 후 명시적 정리

### 6.2 디스크 사용량
- **임시 파일 관리**: 다운로드 완료 후 자동 정리
- **캐시 크기 제한**: 최대 1GB
- **로그 파일 로테이션**: 7일 보관, 최대 100MB

### 6.3 네트워크 최적화
- **동시 다운로드 제한**: 최대 3개
- **대역폭 조절**: 사용자 설정 가능
- **재시도 로직**: 3회 재시도, 지수 백오프
- **타임아웃 설정**: 30초 연결, 5분 다운로드

## 7. 테스트 요구사항

### 7.1 단위 테스트
- **프레임워크**: Jest + Testing Library
- **커버리지**: 최소 80%
- **대상**: 핵심 비즈니스 로직, 유틸리티 함수

### 7.2 통합 테스트
- **E2E 테스트**: Playwright
- **시나리오**: 다운로드 플로우, 설정 변경, 에러 처리

### 7.3 플랫폼별 테스트
- **Windows**: Windows 10/11, x64
- **macOS**: Intel/Apple Silicon, macOS 10.15+
- **Linux**: Ubuntu 20.04+, CentOS 8+

## 8. 보안 및 규정 준수

### 8.1 데이터 보호
- **로컬 데이터만**: 클라우드 전송 없음
- **설정 암호화**: 민감한 설정값 암호화
- **임시 파일 정리**: 다운로드 후 즉시 삭제

### 8.2 네트워크 보안
- **HTTPS 강제**: 모든 네트워크 요청
- **인증서 검증**: SSL/TLS 인증서 확인
- **프록시 지원**: 기업 환경 고려

### 8.3 코드 서명
- **Windows**: Authenticode 서명
- **macOS**: Apple Developer Certificate
- **Linux**: GPG 서명 (선택사항)

## 9. 유지보수 및 업데이트

### 9.1 자동 업데이트
- **electron-updater 사용**
- **백그라운드 다운로드**
- **사용자 승인 후 설치**

### 9.2 로깅 및 모니터링
- **크래시 리포트**: Electron의 crashReporter
- **사용량 통계**: 익명화된 기본 통계
- **에러 추적**: 로컬 로그 파일

### 9.3 의존성 관리
- **정기 업데이트**: 보안 패치 적용
- **호환성 테스트**: 업데이트 전 충분한 테스트
- **롤백 계획**: 문제 발생 시 이전 버전 복구

---

**문서 버전**: 1.0  
**작성일**: 2025년 8월 14일  
**최종 검토**: 개발팀