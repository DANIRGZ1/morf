import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── vi.hoisted() lifts these values before the vi.mock factories run,
//    avoiding Temporal Dead Zone errors that would occur with plain const ────
const { mockPdfSave, mockPdfDoc } = vi.hoisted(() => {
  const mockPdfSave = vi.fn()
  const mockPdfDoc  = { save: (...args) => mockPdfSave(...args) }
  return { mockPdfSave, mockPdfDoc }
})

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue(mockPdfDoc),
    load:   vi.fn().mockResolvedValue(mockPdfDoc),
  },
}))

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({ value: '<p>Test content</p>' }),
    images: { imgElement: vi.fn(fn => fn) },
  },
}))

// Static imports — resolved after the vi.mock factories above ───────────────
import {
  basename,
  parsePageRange,
  escapeRtf,
  scaleToA4,
  compressPdf,
  wordToPdf,
} from './convert'

// ─────────────────────────────────────────────────────────────────
// basename
// ─────────────────────────────────────────────────────────────────
describe('basename', () => {
  it('strips a simple extension', () => {
    expect(basename({ name: 'document.pdf' })).toBe('document')
  })

  it('strips only the last extension for compound names', () => {
    expect(basename({ name: 'archive.tar.gz' })).toBe('archive.tar')
  })

  it('returns the full name when there is no extension', () => {
    expect(basename({ name: 'noextension' })).toBe('noextension')
  })

  it('handles uppercase extensions', () => {
    expect(basename({ name: 'REPORT.PDF' })).toBe('REPORT')
  })

  it('handles filenames with multiple dots', () => {
    expect(basename({ name: 'my.file.name.docx' })).toBe('my.file.name')
  })

  it('handles a single-character extension', () => {
    expect(basename({ name: 'file.z' })).toBe('file')
  })
})

// ─────────────────────────────────────────────────────────────────
// parsePageRange
// ─────────────────────────────────────────────────────────────────
describe('parsePageRange', () => {
  const TOTAL = 10 // pretend the PDF has 10 pages

  it('empty string returns all page indices', () => {
    expect(parsePageRange('', TOTAL)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('whitespace-only string returns all pages', () => {
    expect(parsePageRange('   ', TOTAL)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('single page number is converted to 0-based index', () => {
    expect(parsePageRange('3', TOTAL)).toEqual([2])
  })

  it('first page (1) maps to index 0', () => {
    expect(parsePageRange('1', TOTAL)).toEqual([0])
  })

  it('last valid page maps correctly', () => {
    expect(parsePageRange('10', TOTAL)).toEqual([9])
  })

  it('a range is expanded to all indices between start and end', () => {
    expect(parsePageRange('2-5', TOTAL)).toEqual([1, 2, 3, 4])
  })

  it('mixed single pages and ranges', () => {
    expect(parsePageRange('1, 3-5, 7', TOTAL)).toEqual([0, 2, 3, 4, 6])
  })

  it('out-of-bounds range end is clamped to last page', () => {
    expect(parsePageRange('8-999', TOTAL)).toEqual([7, 8, 9])
  })

  it('overlapping ranges are deduplicated', () => {
    expect(parsePageRange('1-3, 2-4', TOTAL)).toEqual([0, 1, 2, 3])
  })

  it('repeated single pages are deduplicated', () => {
    expect(parsePageRange('2, 2, 2', TOTAL)).toEqual([1])
  })

  it('indices are always returned in ascending order', () => {
    expect(parsePageRange('9, 1, 5', TOTAL)).toEqual([0, 4, 8])
  })

  it('page 0 (non-existent) is ignored → throws when no valid pages remain', () => {
    expect(() => parsePageRange('0', TOTAL)).toThrow('Rango de páginas inválido')
  })

  it('page beyond total is ignored → throws when no valid pages remain', () => {
    expect(() => parsePageRange('99', TOTAL)).toThrow('Rango de páginas inválido')
  })

  it('entirely non-numeric input throws', () => {
    expect(() => parsePageRange('abc', TOTAL)).toThrow('Rango de páginas inválido')
  })

  it('range whose start exceeds total throws', () => {
    expect(() => parsePageRange('50-60', TOTAL)).toThrow('Rango de páginas inválido')
  })

  it('works for a 1-page document', () => {
    expect(parsePageRange('1', 1)).toEqual([0])
  })

  it('strips whitespace around part separators', () => {
    expect(parsePageRange(' 1 , 3 - 5 ', TOTAL)).toEqual([0, 2, 3, 4])
  })
})

// ─────────────────────────────────────────────────────────────────
// escapeRtf
// ─────────────────────────────────────────────────────────────────
describe('escapeRtf', () => {
  it('leaves plain ASCII text unchanged', () => {
    expect(escapeRtf('hello world')).toBe('hello world')
  })

  it('escapes backslashes', () => {
    expect(escapeRtf('a\\b')).toBe('a\\\\b')
  })

  it('escapes multiple backslashes', () => {
    expect(escapeRtf('\\\\')).toBe('\\\\\\\\')
  })

  it('escapes opening braces', () => {
    expect(escapeRtf('a{b')).toBe('a\\{b')
  })

  it('escapes closing braces', () => {
    expect(escapeRtf('a}b')).toBe('a\\}b')
  })

  it('escapes all three special chars in one string', () => {
    expect(escapeRtf('{hello\\world}')).toBe('\\{hello\\\\world\\}')
  })

  it('encodes non-ASCII chars as RTF unicode escapes', () => {
    // 'é' = U+00E9 = 233
    expect(escapeRtf('café')).toBe('caf\\u233?')
  })

  it('encodes multiple non-ASCII chars', () => {
    // ñ = U+00F1 = 241, ü = U+00FC = 252
    expect(escapeRtf('ñü')).toBe('\\u241?\\u252?')
  })

  it('handles empty string', () => {
    expect(escapeRtf('')).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────
// scaleToA4
// ─────────────────────────────────────────────────────────────────
describe('scaleToA4', () => {
  it('image smaller than A4 is not scaled up', () => {
    expect(scaleToA4(400, 600)).toEqual({ w: 400, h: 600 })
  })

  it('image exactly A4-sized is unchanged', () => {
    expect(scaleToA4(595, 842)).toEqual({ w: 595, h: 842 })
  })

  it('image wider than A4 is scaled down, constrained by width', () => {
    const { w, h } = scaleToA4(1190, 842)
    expect(w).toBe(595)
    expect(h).toBe(421)
  })

  it('image taller than A4 is scaled down, constrained by height', () => {
    const { w, h } = scaleToA4(595, 1684)
    expect(w).toBe(298)
    expect(h).toBe(842)
  })

  it('oversized landscape image is constrained by the tighter axis', () => {
    // 1200×900: scale_w = 595/1200 ≈ 0.496, h = round(900*0.496) = 446
    //           scale_h = 842/900 ≈ 0.936 → w would be 1123 (too wide)
    // width is the tighter constraint
    const { w, h } = scaleToA4(1200, 900)
    expect(w).toBe(595)
    expect(h).toBe(446)
  })

  it('portrait oversized image is constrained by height', () => {
    // 400×1000: scale = min(595/400, 842/1000) = min(1.487, 0.842) → 0.842
    const { w, h } = scaleToA4(400, 1000)
    expect(w).toBe(337)
    expect(h).toBe(842)
  })

  it('aspect ratio is preserved after scaling (within rounding tolerance)', () => {
    const { w, h } = scaleToA4(1200, 900)
    const originalRatio = 1200 / 900
    const scaledRatio   = w / h
    expect(Math.abs(scaledRatio - originalRatio)).toBeLessThan(0.01)
  })

  it('respects custom maxW / maxH overrides', () => {
    const { w, h } = scaleToA4(200, 200, 100, 100)
    expect(w).toBe(100)
    expect(h).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────
// wordToPdf — popup-blocked and print-dialog branches
// ─────────────────────────────────────────────────────────────────
describe('wordToPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "popup-blocked" when window.open returns null', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const file = new File(['mock docx'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const result = await wordToPdf(file)
    expect(result).toBe('popup-blocked')
  })

  it('returns "print-dialog" when a popup window opens successfully', async () => {
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    const file = new File(['mock docx'], 'test.docx', { type: 'application/octet-stream' })
    const result = await wordToPdf(file)
    expect(result).toBe('print-dialog')
  })

  it('writes a valid HTML document containing the converted content', async () => {
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    const file = new File(['mock'], 'report.docx', { type: 'application/octet-stream' })
    await wordToPdf(file)
    expect(mockWin.document.write).toHaveBeenCalledOnce()
    const html = mockWin.document.write.mock.calls[0][0]
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Test content') // content from mammoth mock
    expect(html).toContain('report')       // basename used as <title>
  })

  it('triggers a file download as HTML fallback when popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const file = new File(['mock'], 'test.docx', { type: 'application/octet-stream' })
    await wordToPdf(file)
    // download() calls URL.createObjectURL to build the anchor href —
    // this is already mocked globally in vitest.setup.js
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// compressPdf — save options vary by compression level
// ─────────────────────────────────────────────────────────────────
describe('compressPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset()
    mockPdfSave.mockResolvedValue(new Uint8Array(500))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeFile = (sizeKb = 1024) => {
    const content = new Uint8Array(sizeKb * 1024)
    return new File([content], 'test.pdf', { type: 'application/pdf' })
  }

  it('uses objectsPerTick=20 for low compression', async () => {
    await compressPdf(makeFile(), 'low')
    expect(mockPdfSave).toHaveBeenCalledWith(
      expect.objectContaining({ useObjectStreams: false, objectsPerTick: 20 })
    )
  })

  it('uses objectsPerTick=50 for medium compression', async () => {
    await compressPdf(makeFile(), 'medium')
    expect(mockPdfSave).toHaveBeenCalledWith(
      expect.objectContaining({ useObjectStreams: true, objectsPerTick: 50 })
    )
  })

  it('uses objectsPerTick=100 for high compression', async () => {
    await compressPdf(makeFile(), 'high')
    expect(mockPdfSave).toHaveBeenCalledWith(
      expect.objectContaining({ useObjectStreams: true, objectsPerTick: 100 })
    )
  })

  it('disables useObjectStreams only for low level', async () => {
    await compressPdf(makeFile(), 'low')
    expect(mockPdfSave).toHaveBeenCalledWith(
      expect.objectContaining({ useObjectStreams: false })
    )
  })

  it('enables useObjectStreams for medium and high', async () => {
    for (const level of ['medium', 'high']) {
      mockPdfSave.mockClear()
      await compressPdf(makeFile(), level)
      expect(mockPdfSave).toHaveBeenCalledWith(
        expect.objectContaining({ useObjectStreams: true })
      )
    }
  })
})
