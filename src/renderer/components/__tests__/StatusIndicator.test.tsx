import React from 'react'
import { render, screen } from '@testing-library/react'
import StatusIndicator from '../StatusIndicator'

describe('StatusIndicator Component', () => {
  test('success 상태를 올바르게 표시합니다', () => {
    render(
      <StatusIndicator 
        status="success" 
        text="작업이 완료되었습니다" 
      />
    )

    const statusElement = screen.getByText('작업이 완료되었습니다')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement.closest('.status')).toHaveClass('status-success')
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  test('error 상태를 올바르게 표시합니다', () => {
    render(
      <StatusIndicator 
        status="error" 
        text="오류가 발생했습니다" 
      />
    )

    const statusElement = screen.getByText('오류가 발생했습니다')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement.closest('.status')).toHaveClass('status-error')
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  test('warning 상태를 올바르게 표시합니다', () => {
    render(
      <StatusIndicator 
        status="warning" 
        text="주의가 필요합니다" 
      />
    )

    const statusElement = screen.getByText('주의가 필요합니다')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement.closest('.status')).toHaveClass('status-warning')
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  test('info 상태를 올바르게 표시합니다', () => {
    render(
      <StatusIndicator 
        status="info" 
        text="정보를 확인하세요" 
      />
    )

    const statusElement = screen.getByText('정보를 확인하세요')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement.closest('.status')).toHaveClass('status-info')
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })

  test('pending 상태를 올바르게 표시합니다', () => {
    render(
      <StatusIndicator 
        status="pending" 
        text="대기 중입니다" 
      />
    )

    const statusElement = screen.getByText('대기 중입니다')
    expect(statusElement).toBeInTheDocument()
    expect(statusElement.closest('.status')).toHaveClass('status-pending')
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  test('사용자 정의 아이콘을 표시합니다', () => {
    render(
      <StatusIndicator 
        status="success" 
        text="사용자 정의 아이콘" 
        icon="🎉"
      />
    )

    expect(screen.getByText('🎉')).toBeInTheDocument()
    expect(screen.queryByText('✅')).not.toBeInTheDocument()
  })

  test('small 크기를 적용합니다', () => {
    render(
      <StatusIndicator 
        status="info" 
        text="작은 크기" 
        size="small"
      />
    )

    const statusElement = screen.getByText('작은 크기')
    expect(statusElement.closest('.status')).toHaveClass('status-small')
  })

  test('large 크기를 적용합니다', () => {
    render(
      <StatusIndicator 
        status="info" 
        text="큰 크기" 
        size="large"
      />
    )

    const statusElement = screen.getByText('큰 크기')
    expect(statusElement.closest('.status')).toHaveClass('status-large')
  })

  test('아이콘을 숨길 수 있습니다', () => {
    render(
      <StatusIndicator 
        status="success" 
        text="아이콘 없음" 
        showIcon={false}
      />
    )

    expect(screen.getByText('아이콘 없음')).toBeInTheDocument()
    expect(screen.queryByText('✅')).not.toBeInTheDocument()
  })

  test('사용자 정의 className을 적용합니다', () => {
    render(
      <StatusIndicator 
        status="info" 
        text="사용자 정의 클래스" 
        className="custom-class"
      />
    )

    const statusElement = screen.getByText('사용자 정의 클래스')
    expect(statusElement.closest('.status')).toHaveClass('custom-class')
  })
})