# 🤝 Contributing to Music Downloader

Music Downloader 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

- [시작하기](#-시작하기)
- [개발 환경 설정](#-개발-환경-설정)
- [코딩 가이드라인](#-코딩-가이드라인)
- [커밋 가이드라인](#-커밋-가이드라인)
- [Pull Request 프로세스](#-pull-request-프로세스)
- [이슈 리포팅](#-이슈-리포팅)
- [테스트 가이드라인](#-테스트-가이드라인)

## 🚀 시작하기

### 저장소 Fork 및 클론
```bash
# 1. 저장소 Fork (GitHub에서)
# 2. 로컬에 클론
git clone https://github.com/your-username/music-downloader.git
cd music-downloader

# 3. 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/original-repo/music-downloader.git
```

### 개발 브랜치 생성
```bash
# main 브랜치에서 새 브랜치 생성
git checkout -b feature/your-feature-name
```

## 🛠 개발 환경 설정

### 필수 요구사항
- **Node.js**: 18.0.0 이상
- **npm**: 8.0.0 이상
- **Git**: 2.30.0 이상

### 환경 설정
```bash
# 의존성 설치 및 초기 체크
npm run setup

# 개발 서버 실행
npm run dev
```

### 개발 도구 확인
```bash
# 모든 검사 실행
npm run check

# 개별 검사
npm run typecheck    # TypeScript 타입 체크
npm run lint         # ESLint 검사
npm run test         # 테스트 실행
```

## 📝 코딩 가이드라인

### TypeScript 사용 규칙
- **타입 안전성**: 모든 함수와 변수에 적절한 타입 지정
- **any 타입 금지**: 특별한 경우가 아니면 `any` 사용 금지
- **엄격한 타입 체크**: `strict: true` 설정 준수

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email: string
}

const fetchUser = async (id: string): Promise<UserData> => {
  // implementation
}

// ❌ Bad
const fetchUser = async (id: any): Promise<any> => {
  // implementation
}
```

### React 컴포넌트 규칙
- **함수형 컴포넌트**: 클래스 컴포넌트 대신 함수형 컴포넌트 사용
- **성능 최적화**: 필요시 `memo`, `useCallback`, `useMemo` 활용
- **Props 타입**: 모든 props에 TypeScript 인터페이스 정의

```typescript
// ✅ Good
interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = memo(({ onClick, disabled, children }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
})
```

### 폴더 구조 규칙
```
src/
├── main/              # Electron 메인 프로세스
│   ├── core/         # 핵심 비즈니스 로직
│   ├── ipc/          # IPC 핸들러
│   └── utils/        # 유틸리티
└── renderer/         # React 렌더러
    ├── components/   # 재사용 컴포넌트
    ├── views/        # 페이지 컴포넌트
    ├── contexts/     # React Context
    ├── stores/       # Zustand 스토어
    ├── hooks/        # 커스텀 훅
    └── utils/        # 유틸리티
```

### 네이밍 컨벤션
- **파일명**: PascalCase (컴포넌트), camelCase (유틸리티)
- **변수/함수**: camelCase
- **상수**: UPPER_SNAKE_CASE
- **타입/인터페이스**: PascalCase
- **컴포넌트**: PascalCase

```typescript
// ✅ Good
const API_BASE_URL = 'https://api.example.com'
interface UserProfile { }
const handleSubmit = () => { }
const UserCard: React.FC = () => { }

// ❌ Bad
const api_base_url = 'https://api.example.com'
interface userProfile { }
const HandleSubmit = () => { }
const userCard: React.FC = () => { }
```

## 📝 커밋 가이드라인

### 커밋 메시지 형식
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 커밋 타입
- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 변경
- **style**: 코드 스타일 변경 (포맷팅, 세미콜론 등)
- **refactor**: 코드 리팩토링
- **test**: 테스트 추가 또는 수정
- **chore**: 빌드 프로세스 또는 보조 도구 변경

### 커밋 예시
```bash
feat(download): add batch download functionality
fix(ui): resolve progress bar display issue
docs(readme): update installation instructions
refactor(core): optimize metadata extraction logic
test(integration): add download manager tests
```

## 🔍 Pull Request 프로세스

### 1. 브랜치 준비
```bash
# 최신 main 브랜치로 업데이트
git checkout main
git pull upstream main

# 기능 브랜치 리베이스
git checkout feature/your-feature
git rebase main
```

### 2. 코드 품질 검사
```bash
# 모든 검사 통과 확인
npm run check

# 린트 자동 수정
npm run lint:fix

# 포맷팅 적용
npm run format
```

### 3. Pull Request 생성
- **제목**: 명확하고 구체적인 제목
- **설명**: 변경사항, 이유, 테스트 방법 포함
- **체크리스트**: 모든 요구사항 확인

#### PR 템플릿
```markdown
## 📋 변경사항
- 새로운 기능/수정사항 설명

## 🎯 목적
- 이 변경이 필요한 이유

## 🧪 테스트
- [ ] 단위 테스트 작성/수정
- [ ] 통합 테스트 확인
- [ ] 수동 테스트 완료

## ✅ 체크리스트
- [ ] 타입스크립트 타입 체크 통과
- [ ] ESLint 검사 통과
- [ ] 모든 테스트 통과
- [ ] 문서 업데이트 (필요시)
```

## 🐛 이슈 리포팅

### 버그 리포트
```markdown
## 🐛 버그 설명
명확하고 간결한 버그 설명

## 🔄 재현 방법
1. 단계 1
2. 단계 2
3. 오류 발생

## 🎯 예상 동작
정상적으로 작동해야 하는 방식

## 📱 환경 정보
- OS: [e.g. macOS 12.0]
- Node.js: [e.g. 18.5.0]
- App Version: [e.g. 1.0.0]
```

### 기능 요청
```markdown
## 🚀 기능 설명
새로운 기능에 대한 명확한 설명

## 💡 동기
이 기능이 필요한 이유

## 📋 상세 요구사항
- 요구사항 1
- 요구사항 2

## 🎨 추가 컨텍스트
스크린샷, 목업, 참고 자료 등
```

## 🧪 테스트 가이드라인

### 테스트 작성 원칙
- **단위 테스트**: 모든 핵심 함수와 컴포넌트
- **통합 테스트**: 컴포넌트 간 상호작용
- **커버리지**: 최소 80% 코드 커버리지 유지

### 테스트 구조
```typescript
describe('ComponentName', () => {
  describe('기능 그룹', () => {
    it('구체적인 동작을 설명', () => {
      // Arrange
      const props = { /* test props */ }
      
      // Act
      render(<Component {...props} />)
      
      // Assert
      expect(screen.getByText('텍스트')).toBeInTheDocument()
    })
  })
})
```

### 테스트 파일 위치
```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
└── views/
    ├── MainView.tsx
    └── __tests__/
        └── MainView.test.tsx
```

## 📚 추가 리소스

### 개발 문서
- [프로젝트 설정 가이드](CLAUDE.md)
- [기술 요구사항](docs/music_downloader_trd.md)
- [개발 태스크](docs/tasks.md)

### 참고 자료
- [React 공식 문서](https://react.dev)
- [Electron 공식 문서](https://electronjs.org)
- [TypeScript 가이드](https://typescript-lang.org)

## 🤔 질문이나 도움이 필요한 경우

- **GitHub Issues**: 버그 리포트나 기능 요청
- **GitHub Discussions**: 일반적인 질문이나 토론
- **코드 리뷰**: Pull Request에서 피드백 요청

---

**기여해주셔서 감사합니다! 🎉**

프로젝트 발전에 도움을 주시는 모든 분들께 감사드립니다. 여러분의 기여가 Music Downloader를 더 나은 도구로 만들어갑니다.