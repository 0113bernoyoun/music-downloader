/**
 * 테마 관리 유틸리티
 * 시스템 테마 감지 및 테마 적용 기능 제공
 */

export type ThemeType = 'light' | 'dark' | 'system'

export class ThemeManager {
  private static instance: ThemeManager | null = null
  private currentTheme: ThemeType = 'system'
  private mediaQuery: MediaQueryList | null = null
  private listeners: Set<(theme: 'light' | 'dark') => void> = new Set()

  private constructor() {
    this.setupMediaQuery()
    this.applyInitialTheme()
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  /**
   * 시스템 다크 모드 감지 설정
   */
  private setupMediaQuery(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this))
    }
  }

  /**
   * 시스템 테마 변경 핸들러
   */
  private handleSystemThemeChange(e: MediaQueryListEvent): void {
    if (this.currentTheme === 'system') {
      const theme = e.matches ? 'dark' : 'light'
      this.applyTheme(theme)
      this.notifyListeners(theme)
    }
  }

  /**
   * 초기 테마 적용
   */
  private applyInitialTheme(): void {
    const resolvedTheme = this.resolveTheme(this.currentTheme)
    this.applyTheme(resolvedTheme)
  }

  /**
   * 테마 설정
   */
  public setTheme(theme: ThemeType): void {
    this.currentTheme = theme
    const resolvedTheme = this.resolveTheme(theme)
    this.applyTheme(resolvedTheme)
    this.notifyListeners(resolvedTheme)
  }

  /**
   * 현재 테마 가져오기
   */
  public getCurrentTheme(): ThemeType {
    return this.currentTheme
  }

  /**
   * 실제 적용된 테마 가져오기 (system 해결됨)
   */
  public getResolvedTheme(): 'light' | 'dark' {
    return this.resolveTheme(this.currentTheme)
  }

  /**
   * 테마 해결 (system -> light/dark)
   */
  private resolveTheme(theme: ThemeType): 'light' | 'dark' {
    if (theme === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light'
    }
    return theme
  }

  /**
   * DOM에 테마 적용
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      const html = document.documentElement
      
      // 기존 테마 클래스 제거
      html.classList.remove('theme-light', 'theme-dark')
      
      // 새 테마 클래스 추가
      html.classList.add(`theme-${theme}`)
      
      // CSS 변수 업데이트
      html.setAttribute('data-theme', theme)
      
      console.log(`Theme applied: ${theme}`)
    }
  }

  /**
   * 테마 변경 리스너 추가
   */
  public addThemeChangeListener(listener: (theme: 'light' | 'dark') => void): void {
    this.listeners.add(listener)
  }

  /**
   * 테마 변경 리스너 제거
   */
  public removeThemeChangeListener(listener: (theme: 'light' | 'dark') => void): void {
    this.listeners.delete(listener)
  }

  /**
   * 모든 리스너에게 테마 변경 알림
   */
  private notifyListeners(theme: 'light' | 'dark'): void {
    this.listeners.forEach(listener => {
      try {
        listener(theme)
      } catch (error) {
        console.error('Error in theme change listener:', error)
      }
    })
  }

  /**
   * 시스템 테마 감지 지원 여부
   */
  public isSystemThemeSupported(): boolean {
    return this.mediaQuery !== null
  }

  /**
   * 정리 (메모리 누수 방지)
   */
  public destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange.bind(this))
    }
    this.listeners.clear()
    ThemeManager.instance = null
  }
}

// 싱글톤 인스턴스 내보내기
export const themeManager = ThemeManager.getInstance()

/**
 * React 컴포넌트에서 사용할 테마 유틸리티 훅
 */
export const useTheme = () => {
  const manager = ThemeManager.getInstance()
  
  return {
    setTheme: (theme: ThemeType) => manager.setTheme(theme),
    getCurrentTheme: () => manager.getCurrentTheme(),
    getResolvedTheme: () => manager.getResolvedTheme(),
    isSystemThemeSupported: () => manager.isSystemThemeSupported()
  }
}