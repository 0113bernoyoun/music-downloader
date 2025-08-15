# Music Downloader - Claude Code 프로젝트 설정

## 📋 프로젝트 개요
- **프로젝트명**: Music Downloader
- **유형**: Electron + React + TypeScript 데스크톱 앱
- **목적**: YouTube 음악 다운로드 및 오디오 변환
- **개발 기간**: 3.5주 (MVP), 4.5주 (전체)

## 📚 핵심 문서
- **PRD**: `music_downloader_prd.md` - 제품 요구사항 명세서
- **TRD**: `music_downloader_trd.md` - 기술 요구사항 명세서  
- **Tasks**: `tasks.md` - 개발 태스크 로드맵 (22개 주요 태스크)
- **테스트 문서**: `TEST_DOCUMENTATION.md` - 종합 테스트 결과 및 분석

## 📋 Claude 작업 설정
- **문서 작성 언어**: 한국어 (모든 문서, 주석, 설명을 한국어로 작성)
- **코드 주석**: 한국어로 작성
- **커밋 메시지**: 한국어로 작성
- **변수명/함수명**: 영어 (코드 표준 준수)
- **에러 메시지**: 가능한 한국어로 처리

## 🛠 기술 스택
- **Frontend**: React 18.2.0 + TypeScript + Magic UI Components + Tailwind CSS
- **Backend**: Electron 25.0.0 + Node.js 18+
- **Build**: Vite 4.0.0 + electron-builder 24.0.0
- **Core Libraries**: youtube-dl-exec 2.5.6 + ffmpeg-static 5.2.0
- **UI Framework**: Magic UI (AI 기반 현대적 컴포넌트) + Framer Motion + Lucide Icons

## 🏗 프로젝트 구조
```
music-downloader/
├── src/
│   ├── main/           # Electron 메인 프로세스
│   │   ├── core/       # 다운로드, 변환, 설정 로직
│   │   ├── ipc/        # IPC 통신 핸들러
│   │   └── utils/      # 파일 관리, 로깅
│   └── renderer/       # React 렌더러 프로세스
│       ├── components/ # UI 컴포넌트
│       ├── contexts/   # 상태 관리
│       ├── hooks/      # 커스텀 훅
│       └── views/      # 페이지 컴포넌트
├── assets/             # 정적 리소스
├── dist/              # 빌드 출력
└── release/           # 패키징 출력
```

## 🎯 핵심 기능
1. **단일/재생목록 다운로드**: YouTube URL → MP3/WAV 변환
2. **배치 다운로드**: 여러 URL 일괄 처리
3. **사용자 설정**: 저장 위치, 형식, 품질 설정
4. **진행률 추적**: 실시간 다운로드 상태 표시
5. **에러 처리**: 네트워크, 변환, 저장 오류 대응

## 🚀 개발 명령어
```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 패키징 (개발용)
npm run package

# 배포용 빌드
npm run dist

# 테스트
npm test

# 린트 검사
npm run lint

# 타입 체크
npm run typecheck
```

## 📋 현재 진행 상황
- [x] **문서화 완료**: PRD, TRD, Tasks 문서 작성
- [x] **Phase 1**: 프로젝트 환경 설정 (2일)
- [x] **Phase 2**: Electron 메인 프로세스 구현 (3일)
  - [x] Task 2.2: 핵심 비즈니스 로직 구현 (DownloadManager, AudioConverter, SettingsManager, MetadataExtractor)
  - [x] Task 2.3: 유틸리티 및 IPC 통신 시스템 (FileManager, Logger, 완전한 IPC 레이어)
- [x] **Phase 3**: React 렌더러 프로세스 구현 (3일) - **완료**
- [ ] **Phase 4**: 핵심 기능 통합 및 테스트 (4일) - **진행 중**
  - [x] Task 4.1: 단일 다운로드 기능 완성
  - [x] Task 4.2: 다운로드 히스토리 기능 구현 및 테스트 완료 (HistoryManager, IPC, UI 컴포넌트, 68개 테스트 100% 통과)
- [ ] **Phase 5**: 품질 보증 및 최적화 (3일)
- [ ] **Phase 6**: 빌드 및 배포 준비 (2일)

## 🔧 개발 환경 요구사항
- Node.js 18+
- npm 또는 yarn
- Git
- 플랫폼별 빌드 도구:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential

## 📝 중요 고려사항
- **보안**: Node.js API 비활성화, 컨텍스트 격리 필수
- **성능**: 메모리 사용량 최대 512MB, 동시 다운로드 3개 제한
- **크로스 플랫폼**: Windows (NSIS), macOS (DMG), Linux (AppImage)
- **코드 서명**: Windows Authenticode, macOS 공증 필요

## 🎯 다음 단계
1. `npm init` - package.json 초기화
2. TypeScript 설정 파일 생성
3. Electron + React 기본 구조 설정
4. youtube-dl-exec + FFmpeg 연동 테스트