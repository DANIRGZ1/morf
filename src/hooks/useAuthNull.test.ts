/**
 * useAuth — tests for when supabase is NOT configured (env vars absent).
 * Kept in a separate file so no vi.mock overrides the null export.
 * In the test environment VITE_SUPABASE_* are not set, so supabase = null.
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

describe('useAuth — supabase not configured (null)', () => {
  it('starts with user = null', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })

  it('sets loading to false when supabase is null', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('signIn returns an error object (not null) on failure', async () => {
    const { result } = renderHook(() => useAuth())
    let res: { error: Error | null }
    await act(async () => {
      res = await result.current.signIn('test@example.com')
    })
    // Either supabase is null (returns our custom error) or a network call fails;
    // either way error must be an Error instance, not null.
    expect(res!.error).toBeInstanceOf(Error)
  })

  it('signOut resolves without throwing when supabase is null', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await expect(result.current.signOut()).resolves.toBeUndefined()
    })
  })

  it('user remains null after signIn when supabase is null', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.signIn('x@x.com') })
    expect(result.current.user).toBeNull()
  })
})
