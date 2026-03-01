import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

// ─────────────────────────────────────────────────────────────────
// useAuth — supabase configured (mocked)
// (null-supabase tests live in useAuthNull.test.ts to avoid mock conflicts)
// ─────────────────────────────────────────────────────────────────
const {
  mockUnsubscribe,
  mockSubscription,
  mockGetSession,
  mockSignInWithOtp,
  mockSignOut,
  mockOnAuthStateChange,
} = vi.hoisted(() => {
  const mockUnsubscribe       = vi.fn()
  const mockSubscription      = { unsubscribe: mockUnsubscribe }
  const mockGetSession        = vi.fn()
  const mockSignInWithOtp     = vi.fn()
  const mockSignOut           = vi.fn()
  const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: mockSubscription } })
  return { mockUnsubscribe, mockSubscription, mockGetSession, mockSignInWithOtp, mockSignOut, mockOnAuthStateChange }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:        mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp:     mockSignInWithOtp,
      signOut:           mockSignOut,
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
  mockSignInWithOtp.mockResolvedValue({ error: null })
  mockSignOut.mockResolvedValue(undefined)
})

describe('useAuth — supabase configured', () => {
  it('calls getSession on mount', async () => {
    renderHook(() => useAuth())
    await waitFor(() => expect(mockGetSession).toHaveBeenCalledOnce())
  })

  it('sets user from an existing session', async () => {
    const fakeUser = { id: 'user-1', email: 'a@b.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user: fakeUser } } })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).toEqual(fakeUser))
  })

  it('sets loading to false after getSession resolves', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('subscribes to auth state changes on mount', async () => {
    renderHook(() => useAuth())
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalledOnce())
  })

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useAuth())
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })

  it('updates user when onAuthStateChange fires', async () => {
    const fakeUser = { id: 'u2', email: 'b@c.com' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      setTimeout(() => cb('SIGNED_IN', { user: fakeUser }), 0)
      return { data: { subscription: mockSubscription } }
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).toEqual(fakeUser))
  })

  it('signIn calls signInWithOtp with the email', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.signIn('hello@world.com') })
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'hello@world.com' })
    )
  })

  it('signIn returns { error: null } on success', async () => {
    const { result } = renderHook(() => useAuth())
    let res: { error: Error | null }
    await act(async () => { res = await result.current.signIn('ok@ok.com') })
    expect(res!.error).toBeNull()
  })

  it('signIn returns the error when signInWithOtp fails', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: new Error('invalid email') })
    const { result } = renderHook(() => useAuth())
    let res: { error: Error | null }
    await act(async () => { res = await result.current.signIn('bad') })
    expect(res!.error?.message).toBe('invalid email')
  })

  it('signOut calls supabase.auth.signOut', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.signOut() })
    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})
