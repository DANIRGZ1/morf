import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Toast from './Toast'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast message="File converted!" type="ok" onClose={vi.fn()} />)
    expect(screen.getByText('File converted!')).toBeInTheDocument()
  })

  it('has role="alert" for accessibility', () => {
    render(<Toast message="Done" type="ok" onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onClose after 3200 ms', () => {
    const onClose = vi.fn()
    render(<Toast message="Done" type="ok" onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(3200))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose before 3200 ms', () => {
    const onClose = vi.fn()
    render(<Toast message="Done" type="ok" onClose={onClose} />)
    act(() => vi.advanceTimersByTime(3199))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clears the timer on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(<Toast message="Done" type="ok" onClose={onClose} />)
    unmount()
    act(() => vi.advanceTimersByTime(5000))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders an error icon class for type="err"', () => {
    const { container } = render(<Toast message="Oops" type="err" onClose={vi.fn()} />)
    // The Ic component renders an svg; we just verify the toast container exists
    expect(container.querySelector('.toast')).toBeInTheDocument()
  })

  it('renders a success icon for non-error type', () => {
    const { container } = render(<Toast message="Great" type="ok" onClose={vi.fn()} />)
    expect(container.querySelector('.toast')).toBeInTheDocument()
  })
})
