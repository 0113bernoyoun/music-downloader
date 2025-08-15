import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner, { LoadingDots, LoadingPulse, LoadingBars } from '../LoadingSpinner'

describe('LoadingSpinner Component', () => {
  test('기본 스피너가 렌더링됩니다', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    const spinner = document.querySelector('.spinner')
    expect(spinner).toBeInTheDocument()
  })

  test('텍스트와 함께 렌더링됩니다', () => {
    render(<LoadingSpinner text="로딩 중..." />)
    
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  test('인라인 모드로 렌더링됩니다', () => {
    render(<LoadingSpinner text="로딩 중..." inline />)
    
    expect(screen.getByTestId('loading-spinner-inline')).toBeInTheDocument()
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  test('small 크기를 적용합니다', () => {
    render(<LoadingSpinner size="small" />)
    
    const container = screen.getByTestId('loading-spinner')
    expect(container).toHaveClass('spinner-small')
  })

  test('large 크기를 적용합니다', () => {
    render(<LoadingSpinner size="large" />)
    
    const container = screen.getByTestId('loading-spinner')
    expect(container).toHaveClass('spinner-large')
  })

  test('다양한 색상을 적용합니다', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const
    
    colors.forEach(color => {
      const { rerender } = render(<LoadingSpinner color={color} />)
      
      const container = screen.getByTestId('loading-spinner')
      expect(container).toHaveClass(`spinner-${color}`)
      
      rerender(<div />)
    })
  })

  test('사용자 정의 className을 적용합니다', () => {
    render(<LoadingSpinner className="custom-spinner" />)
    
    const container = screen.getByTestId('loading-spinner')
    expect(container).toHaveClass('custom-spinner')
  })
})

describe('LoadingDots Component', () => {
  test('로딩 점들이 렌더링됩니다', () => {
    render(<LoadingDots />)
    
    const dots = document.querySelectorAll('.dot')
    expect(dots).toHaveLength(3)
  })

  test('텍스트와 함께 렌더링됩니다', () => {
    render(<LoadingDots text="처리 중..." />)
    
    expect(screen.getByText('처리 중...')).toBeInTheDocument()
    const dots = document.querySelectorAll('.dot')
    expect(dots).toHaveLength(3)
  })

  test('사용자 정의 className을 적용합니다', () => {
    render(<LoadingDots className="custom-dots" />)
    
    const container = document.querySelector('.loading-dots')
    expect(container).toHaveClass('custom-dots')
  })
})

describe('LoadingPulse Component', () => {
  test('펄스 애니메이션이 렌더링됩니다', () => {
    render(<LoadingPulse />)
    
    const pulseCircle = document.querySelector('.pulse-circle')
    expect(pulseCircle).toBeInTheDocument()
  })

  test('텍스트와 함께 렌더링됩니다', () => {
    render(<LoadingPulse text="연결 중..." />)
    
    expect(screen.getByText('연결 중...')).toBeInTheDocument()
  })

  test('사용자 정의 className을 적용합니다', () => {
    render(<LoadingPulse className="custom-pulse" />)
    
    const container = document.querySelector('.loading-pulse')
    expect(container).toHaveClass('custom-pulse')
  })
})

describe('LoadingBars Component', () => {
  test('로딩 바들이 렌더링됩니다', () => {
    render(<LoadingBars />)
    
    const bars = document.querySelectorAll('.bar')
    expect(bars).toHaveLength(4)
  })

  test('각 바가 올바른 클래스를 가집니다', () => {
    render(<LoadingBars />)
    
    expect(document.querySelector('.bar1')).toBeInTheDocument()
    expect(document.querySelector('.bar2')).toBeInTheDocument()
    expect(document.querySelector('.bar3')).toBeInTheDocument()
    expect(document.querySelector('.bar4')).toBeInTheDocument()
  })

  test('텍스트와 함께 렌더링됩니다', () => {
    render(<LoadingBars text="업로드 중..." />)
    
    expect(screen.getByText('업로드 중...')).toBeInTheDocument()
  })

  test('사용자 정의 className을 적용합니다', () => {
    render(<LoadingBars className="custom-bars" />)
    
    const container = document.querySelector('.loading-bars')
    expect(container).toHaveClass('custom-bars')
  })
})