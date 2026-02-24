import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from './useHistory'

beforeEach(() => localStorage.clear())

describe('useHistory', () => {
  it('initialises with an empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useHistory())
    expect(result.current.history).toEqual([])
  })

  it('reads pre-existing history from localStorage', () => {
    const stored = [{ filename: 'a.pdf', tool: 'PDF → Word', date: '2025-01-01T00:00:00.000Z' }]
    localStorage.setItem('morf_history', JSON.stringify(stored))
    const { result } = renderHook(() => useHistory())
    expect(result.current.history).toEqual(stored)
  })

  it('handles corrupt localStorage JSON gracefully', () => {
    localStorage.setItem('morf_history', 'NOT_VALID_JSON{{{')
    const { result } = renderHook(() => useHistory())
    expect(result.current.history).toEqual([])
  })

  it('addToHistory prepends a new entry', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('file.pdf', 'PDF → Word'))
    expect(result.current.history[0].filename).toBe('file.pdf')
    expect(result.current.history[0].tool).toBe('PDF → Word')
  })

  it('addToHistory stores an ISO date string', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('file.pdf', 'PDF → Word'))
    expect(result.current.history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('addToHistory persists to localStorage', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('file.pdf', 'PDF → Word'))
    const stored = JSON.parse(localStorage.getItem('morf_history'))
    expect(stored[0].filename).toBe('file.pdf')
  })

  it('addToHistory keeps at most 10 entries', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      for (let i = 0; i < 12; i++) result.current.addToHistory(`file${i}.pdf`, 'PDF → Word')
    })
    expect(result.current.history.length).toBe(10)
  })

  it('addToHistory stores entries in reverse chronological order', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.addToHistory('first.pdf', 'PDF → Word')
      result.current.addToHistory('second.pdf', 'PDF → Word')
    })
    expect(result.current.history[0].filename).toBe('second.pdf')
    expect(result.current.history[1].filename).toBe('first.pdf')
  })

  it('clearHistory empties the array', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('a.pdf', 'PDF → Word'))
    act(() => result.current.clearHistory())
    expect(result.current.history).toEqual([])
  })

  it('clearHistory removes the localStorage key', () => {
    localStorage.setItem('morf_history', JSON.stringify([{ filename: 'a.pdf', tool: 'X', date: 'now' }]))
    const { result } = renderHook(() => useHistory())
    act(() => result.current.clearHistory())
    expect(localStorage.getItem('morf_history')).toBeNull()
  })
})
