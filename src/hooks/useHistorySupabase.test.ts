/**
 * useHistory — branches that require a userId / Supabase integration.
 * These are kept in a separate file so vi.mock() can target the supabase
 * module without affecting the plain-localStorage tests in useHistory.test.js.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHistory } from './useHistory'

// vi.hoisted lifts these before the vi.mock factory runs (avoids TDZ errors)
const { mockFrom, mockThen, mockInsert, mockDeleteEq } = vi.hoisted(() => {
  const mockThen     = vi.fn()
  const mockInsert   = vi.fn()
  const mockDeleteEq = vi.fn()

  // Fluent query chain: .select().eq().order().limit().then(...)
  const chain: Record<string, unknown> = {}
  chain.select  = () => chain
  chain.eq      = () => chain
  chain.order   = () => chain
  chain.limit   = () => chain
  chain.then    = mockThen
  chain.insert  = mockInsert
  chain.delete  = () => ({ eq: mockDeleteEq })

  const mockFrom = vi.fn(() => chain)
  return { mockFrom, mockThen, mockInsert, mockDeleteEq }
})

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  // Default: Supabase returns no data
  mockThen.mockImplementation((cb: (r: { data: null }) => void) => cb({ data: null }))
  mockInsert.mockResolvedValue({ error: null })
  mockDeleteEq.mockResolvedValue({ error: null })
})

// ─────────────────────────────────────────────────────────────────
// userId provided — Supabase sync branches
// ─────────────────────────────────────────────────────────────────
describe('useHistory — with userId (Supabase sync)', () => {
  const USER_ID = 'user-abc'

  it('queries Supabase for history on mount when userId is given', async () => {
    renderHook(() => useHistory(USER_ID))
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('conversions'))
  })

  it('populates history from Supabase data', async () => {
    const rows = [
      { filename: 'cloud.pdf', tool: 'PDF → Word', created_at: '2025-01-01T00:00:00Z' },
    ]
    mockThen.mockImplementation((cb: (r: { data: typeof rows }) => void) => cb({ data: rows }))
    const { result } = renderHook(() => useHistory(USER_ID))
    await waitFor(() => expect(result.current.history[0].filename).toBe('cloud.pdf'))
    expect(result.current.history[0].date).toBe('2025-01-01T00:00:00Z')
  })

  it('does NOT write to localStorage when userId is provided', () => {
    const { result } = renderHook(() => useHistory(USER_ID))
    act(() => result.current.addToHistory('f.pdf', 'Merge PDFs'))
    expect(localStorage.getItem('morf_history')).toBeNull()
  })

  it('calls supabase.from("conversions").insert when adding with userId', () => {
    const { result } = renderHook(() => useHistory(USER_ID))
    act(() => result.current.addToHistory('doc.pdf', 'PDF → Word'))
    expect(mockFrom).toHaveBeenCalledWith('conversions')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, filename: 'doc.pdf' })
    )
  })

  it('calls supabase delete on clearHistory when userId is provided', () => {
    const { result } = renderHook(() => useHistory(USER_ID))
    act(() => result.current.clearHistory())
    expect(mockFrom).toHaveBeenCalledWith('conversions')
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', USER_ID)
  })
})

// ─────────────────────────────────────────────────────────────────
// Optional size field in history entry
// ─────────────────────────────────────────────────────────────────
describe('useHistory — size field', () => {
  it('includes size in the history entry when provided', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('big.pdf', 'Compress', 2048))
    expect(result.current.history[0].size).toBe(2048)
  })

  it('omits size from the history entry when not provided', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.addToHistory('small.pdf', 'Compress'))
    expect(result.current.history[0]).not.toHaveProperty('size')
  })
})
