import { describe, it, expect, vi, afterEach } from 'vitest'
import { requestNotifyPermission, notifyDone } from './notify'

// ─────────────────────────────────────────────────────────────────
// requestNotifyPermission
// ─────────────────────────────────────────────────────────────────
describe('requestNotifyPermission', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns false when Notification is not in window', async () => {
    const { Notification: _n, ...rest } = window
    vi.stubGlobal('window', rest)
    const result = await requestNotifyPermission()
    expect(result).toBe(false)
  })

  it('returns true when permission is already granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() })
    const result = await requestNotifyPermission()
    expect(result).toBe(true)
  })

  it('returns false when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() })
    const result = await requestNotifyPermission()
    expect(result).toBe(false)
  })

  it('calls requestPermission when permission is default and returns true if granted', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })
    const result = await requestNotifyPermission()
    expect(requestPermission).toHaveBeenCalledOnce()
    expect(result).toBe(true)
  })

  it('returns false when requestPermission resolves to denied', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })
    const result = await requestNotifyPermission()
    expect(result).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────
// notifyDone
// ─────────────────────────────────────────────────────────────────
describe('notifyDone', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when Notification is not in window', async () => {
    const win = { ...window }
    delete win.Notification
    vi.stubGlobal('window', win)
    // Should not throw
    await expect(notifyDone('file.pdf')).resolves.toBeUndefined()
  })

  it('does nothing when permission is not granted', async () => {
    vi.stubGlobal('Notification', class { constructor() {} })
    Object.defineProperty(globalThis.Notification, 'permission', { value: 'default', configurable: true })
    // Should not throw
    await expect(notifyDone('file.pdf')).resolves.toBeUndefined()
  })

  it('does nothing when tab is visible', async () => {
    vi.stubGlobal('Notification', class { constructor() {} })
    Object.defineProperty(globalThis.Notification, 'permission', { value: 'granted', configurable: true })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await expect(notifyDone('file.pdf')).resolves.toBeUndefined()
  })

  it('shows notification via serviceWorker when tab is hidden', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    const reg = { showNotification }
    vi.stubGlobal('Notification', class { constructor() {} })
    Object.defineProperty(globalThis.Notification, 'permission', { value: 'granted', configurable: true })
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: Promise.resolve(reg) },
    })
    await notifyDone('test.pdf')
    expect(showNotification).toHaveBeenCalledOnce()
    const [title, opts] = showNotification.mock.calls[0]
    expect(title).toContain('✅')
    expect(opts.body).toContain('test.pdf')
  })

  it('falls back to new Notification() when serviceWorker throws', async () => {
    const MockNotification = vi.fn()
    MockNotification.permission = 'granted'
    vi.stubGlobal('Notification', MockNotification)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: Promise.reject(new Error('sw failed')) },
    })
    await notifyDone('doc.pdf')
    expect(MockNotification).toHaveBeenCalled()
  })

  it('uses a default body when label is empty', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', class { constructor() {} })
    Object.defineProperty(globalThis.Notification, 'permission', { value: 'granted', configurable: true })
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: Promise.resolve({ showNotification }) },
    })
    await notifyDone('')
    const [, opts] = showNotification.mock.calls[0]
    expect(opts.body).toBe('Tu archivo está listo')
  })
})
