import '@testing-library/jest-dom'
import { vi } from 'vitest'

// URL APIs — jsdom doesn't implement these
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Canvas API — jsdom has no rendering engine
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
}))
HTMLCanvasElement.prototype.toBlob = vi.fn((callback, type) => {
  callback(new Blob(['mock-image-data'], { type: type || 'image/png' }))
})

// window.open — suppress actual popup attempts
global.open = vi.fn()

// IntersectionObserver — not implemented in jsdom
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
