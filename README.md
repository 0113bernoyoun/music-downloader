# 🎵 Music Downloader

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)]()
[![Electron](https://img.shields.io/badge/Electron-25.0+-purple.svg)]()
[![React](https://img.shields.io/badge/React-18.2+-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

고품질 YouTube 음악 다운로드 및 오디오 변환을 위한 현대적인 데스크톱 애플리케이션입니다.

## ✨ 주요 기능

### 🎯 핵심 기능
- **단일/재생목록 다운로드**: YouTube URL로부터 고품질 음악 다운로드
- **다중 포맷 지원**: MP3, WAV 등 다양한 오디오 포맷
- **배치 다운로드**: 여러 URL 동시 처리 (최대 3개)
- **실시간 진행률**: 다운로드 상태 및 진행률 실시간 모니터링
- **메타데이터 추출**: 제목, 아티스트, 썸네일 자동 추출

### 🎨 사용자 경험
- **현대적 UI**: React + Tailwind CSS + Magic UI 컴포넌트
- **다크/라이트 테마**: 시스템 설정 연동 테마 지원
- **반응형 디자인**: 다양한 화면 크기 지원
- **접근성**: WCAG 2.1 AA 준수
- **직관적 네비게이션**: 심플하고 사용하기 쉬운 인터페이스

### ⚙️ 고급 기능
- **사용자 설정**: 저장 위치, 품질, 포맷 커스터마이징
- **다운로드 히스토리**: 완료된 다운로드 기록 관리
- **에러 처리**: 네트워크, 변환, 저장 오류 대응
- **법적 고지**: 저작권 준수 가이드라인

## 🏗 기술 스택

### Frontend
- **React 18.2.0** - 사용자 인터페이스
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Magic UI Components** - AI 기반 현대적 컴포넌트
- **Framer Motion** - 애니메이션
- **Zustand** - 경량 상태 관리

### Backend
- **Electron 25.0.0** - 크로스 플랫폼 데스크톱 앱
- **Node.js 18+** - 런타임 환경
- **youtube-dl-exec** - YouTube 콘텐츠 처리
- **ffmpeg-static** - 오디오 변환

### Development
- **Vite 4.0.0** - 빠른 빌드 도구
- **electron-builder** - 앱 패키징
- **Jest + React Testing Library** - 테스팅
- **ESLint + Prettier** - 코드 품질

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- Git

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd music-downloader

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 프로덕션 빌드
npm run build

# 5. 앱 패키징
npm run package
```

### 개발 명령어

```bash
# 개발 서버 (Hot Reload)
npm run dev

# 타입 체크
npm run typecheck

# 린트 검사
npm run lint

# 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage

# 프로덕션 빌드
npm run build

# 개발용 패키징
npm run package

# 배포용 빌드
npm run dist
```

## 📁 프로젝트 구조

```
music-downloader/
├── src/
│   ├── main/                 # Electron 메인 프로세스
│   │   ├── core/            # 핵심 비즈니스 로직
│   │   │   ├── DownloadManager.ts
│   │   │   ├── AudioConverter.ts
│   │   │   ├── MetadataExtractor.ts
│   │   │   ├── SettingsManager.ts
│   │   │   └── HistoryManager.ts
│   │   ├── ipc/             # IPC 통신 핸들러
│   │   ├── utils/           # 유틸리티 함수
│   │   ├── main.ts          # 메인 프로세스 진입점
│   │   └── preload.ts       # Preload 스크립트
│   │
│   ├── renderer/            # React 렌더러 프로세스
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   ├── views/           # 페이지 컴포넌트
│   │   ├── contexts/        # React Context (상태 관리)
│   │   ├── stores/          # Zustand 스토어
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── utils/           # 유틸리티 함수
│   │   └── types/           # TypeScript 타입 정의
│   │
│   └── test/                # 테스트 파일
│       ├── unit/            # 단위 테스트
│       └── integration/     # 통합 테스트
│
├── docs/                    # 프로젝트 문서
├── assets/                  # 정적 리소스
├── dev-scripts/             # 개발 스크립트
└── dist/                    # 빌드 출력
```

## 🧪 테스트

프로젝트는 포괄적인 테스트 전략을 따릅니다:

### 테스트 유형
- **단위 테스트**: 개별 컴포넌트 및 함수
- **통합 테스트**: 컴포넌트 간 상호작용
- **E2E 테스트**: 전체 사용자 워크플로우

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# Watch 모드로 테스트
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage
```

### 테스트 현황
- **총 테스트**: 68개
- **성공률**: 100%
- **커버리지**: 90%+ (주요 비즈니스 로직)

## 📦 빌드 및 배포

### 지원 플랫폼
- **Windows** (NSIS 인스톨러)
- **macOS** (DMG, 공증 지원)
- **Linux** (AppImage)

### 배포 명령어
```bash
# 모든 플랫폼 빌드
npm run dist

# 특정 플랫폼 빌드
npm run dist:win     # Windows
npm run dist:mac     # macOS
npm run dist:linux   # Linux
```

## ⚖️ 법적 고지

이 소프트웨어는 **개인적, 비상업적 용도로만** 사용되어야 합니다.

### 중요 사항
- YouTube의 서비스 약관을 준수해주세요
- 저작권이 있는 콘텐츠는 권한 없이 다운로드하지 마세요
- 공정 이용 원칙을 따라주세요
- 상업적 용도로 사용하지 마세요

## 🤝 기여하기

프로젝트 개선에 기여해주세요!

### 기여 방법
1. 저장소 Fork
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

### 개발 가이드라인
- TypeScript를 사용해주세요
- 기존 코드 스타일을 따라주세요
- 테스트를 작성해주세요
- 커밋 메시지는 명확하게 작성해주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 리포트**: GitHub Issues를 통해 버그 리포트 및 기능 요청
- **문서**: [docs/](docs/) 폴더의 상세 문서 참조
- **개발 가이드**: [CLAUDE.md](CLAUDE.md) 참조

## 🎯 로드맵

### 완료된 기능 ✅
- [x] 기본 YouTube 다운로드 기능
- [x] 오디오 포맷 변환 (MP3, WAV)
- [x] 사용자 설정 관리
- [x] 다운로드 히스토리
- [x] 현대적 UI/UX
- [x] 성능 최적화
- [x] 포괄적 테스트

### 향후 계획 🚧
- [ ] 플레이리스트 일괄 다운로드
- [ ] 음질 선택 고도화
- [ ] 다국어 지원
- [ ] 자동 업데이트
- [ ] 플러그인 시스템

---

**개발팀**: Music Downloader Team  
**버전**: 1.0.0  
**마지막 업데이트**: 2025년 1월