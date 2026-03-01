import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFreemium } from './useFreemium'

const MB = 1024 * 1024
const makeFile = (sizeBytes) => ({ name: 'test.pdf', size: sizeBytes })

beforeEach(() => localStorage.clear())

describe('useFreemium — PRO_ONLY_TOOLS', () => {
  it('blocks a pro-only tool on the free plan and sets upgradeReason to "pro"', () => {
    const { result } = renderHook(() => useFreemium())
    let allowed
    act(() => { allowed = result.current.checkLimits([makeFile(MB)], 'ocr-pdf') })
    expect(allowed).toBe(false)
    expect(result.current.showUpgrade).toBe(true)
    expect(result.current.upgradeReason).toBe('pro')
  })

  it('allows a pro-only tool when the user is on the pro plan', () => {
    localStorage.setItem('morf_pro', 'true')
    const { result } = renderHook(() => useFreemium())
    expect(result.current.checkLimits([makeFile(MB)], 'ocr-pdf')).toBe(true)
  })

  it('upgradeReason is "batch" when blocked by batch limit', () => {
    const { result } = renderHook(() => useFreemium())
    const files = [makeFile(MB), makeFile(MB), makeFile(MB)]
    act(() => { result.current.checkLimits(files, 'merge') })
    expect(result.current.upgradeReason).toBe('batch')
  })

  it('upgradeReason is "size" when blocked by file size', () => {
    const { result } = renderHook(() => useFreemium())
    act(() => { result.current.checkLimits([makeFile(11 * MB)], 'compress') })
    expect(result.current.upgradeReason).toBe('size')
  })
})

describe('useFreemium — free plan', () => {
  it('allows a file within the 10 MB limit', () => {
    const { result } = renderHook(() => useFreemium())
    expect(result.current.checkLimits([makeFile(5 * MB)], 'compress')).toBe(true)
  })

  it('blocks a file exceeding 10 MB and shows the upgrade modal', () => {
    const { result } = renderHook(() => useFreemium())
    let allowed
    act(() => { allowed = result.current.checkLimits([makeFile(11 * MB)], 'compress') })
    expect(allowed).toBe(false)
    expect(result.current.showUpgrade).toBe(true)
  })

  it('blocks merge when more than 2 files are supplied', () => {
    const { result } = renderHook(() => useFreemium())
    const files = [makeFile(MB), makeFile(MB), makeFile(MB)]
    let allowed
    act(() => { allowed = result.current.checkLimits(files, 'merge') })
    expect(allowed).toBe(false)
    expect(result.current.showUpgrade).toBe(true)
  })

  it('allows merge with exactly 2 files', () => {
    const { result } = renderHook(() => useFreemium())
    expect(result.current.checkLimits([makeFile(MB), makeFile(MB)], 'merge')).toBe(true)
  })

  it('batch limit only applies to the merge tool, not others', () => {
    const { result } = renderHook(() => useFreemium())
    const files = [makeFile(MB), makeFile(MB), makeFile(MB)]
    // 3 small files for img-pdf should be allowed on free plan
    expect(result.current.checkLimits(files, 'img-pdf')).toBe(true)
  })

  it('showUpgrade starts as false', () => {
    const { result } = renderHook(() => useFreemium())
    expect(result.current.showUpgrade).toBe(false)
  })

  it('setShowUpgrade can dismiss the modal', () => {
    const { result } = renderHook(() => useFreemium())
    act(() => result.current.checkLimits([makeFile(11 * MB)], 'compress'))
    act(() => result.current.setShowUpgrade(false))
    expect(result.current.showUpgrade).toBe(false)
  })
})

describe('useFreemium — pro plan', () => {
  beforeEach(() => localStorage.setItem('morf_pro', 'true'))

  it('allows files larger than 10 MB', () => {
    const { result } = renderHook(() => useFreemium())
    expect(result.current.checkLimits([makeFile(50 * MB)], 'compress')).toBe(true)
  })

  it('allows merging more than 2 files', () => {
    const { result } = renderHook(() => useFreemium())
    const files = Array.from({ length: 10 }, () => makeFile(MB))
    expect(result.current.checkLimits(files, 'merge')).toBe(true)
  })

  it('never shows the upgrade modal', () => {
    const { result } = renderHook(() => useFreemium())
    act(() => result.current.checkLimits([makeFile(200 * MB)], 'compress'))
    expect(result.current.showUpgrade).toBe(false)
  })
})
