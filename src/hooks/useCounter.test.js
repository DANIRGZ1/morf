import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

beforeEach(() => localStorage.clear())

describe('useCounter', () => {
  it('starts at 0 when localStorage is empty', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('reads an existing count from localStorage', () => {
    localStorage.setItem('morf_count', '42')
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(42)
  })

  it('bumpCount increments the count by 1', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.bumpCount())
    expect(result.current.count).toBe(1)
  })

  it('bumpCount persists the new value to localStorage', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.bumpCount())
    expect(localStorage.getItem('morf_count')).toBe('1')
  })

  it('bumpCount accumulates across multiple calls', () => {
    const { result } = renderHook(() => useCounter())
    act(() => {
      result.current.bumpCount()
      result.current.bumpCount()
      result.current.bumpCount()
    })
    expect(result.current.count).toBe(3)
  })

  it('starts from a pre-existing count and continues incrementing', () => {
    localStorage.setItem('morf_count', '10')
    const { result } = renderHook(() => useCounter())
    act(() => result.current.bumpCount())
    expect(result.current.count).toBe(11)
    expect(localStorage.getItem('morf_count')).toBe('11')
  })
})
