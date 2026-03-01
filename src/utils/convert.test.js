import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── vi.hoisted() lifts these values before the vi.mock factories run,
//    avoiding Temporal Dead Zone errors that would occur with plain const ────
const { mockPdfSave, mockPdfDoc, mockPage, mockSetRotation } = vi.hoisted(() => {
  const mockPdfSave      = vi.fn()
  const mockSetRotation  = vi.fn()
  const mockPage = {
    getRotation: vi.fn(() => ({ angle: 0 })),
    setRotation: mockSetRotation,
    drawImage:   vi.fn(),
  }
  const mockPdfDoc = {
    save:           (...args) => mockPdfSave(...args),
    copyPages:      vi.fn().mockResolvedValue([mockPage]),
    addPage:        vi.fn().mockReturnValue(mockPage),
    getPageIndices: vi.fn().mockReturnValue([0, 1]),
    getPageCount:   vi.fn().mockReturnValue(5),
    getPages:       vi.fn().mockReturnValue([mockPage]),
    embedJpg:       vi.fn().mockResolvedValue({ width: 200, height: 150 }),
    embedPng:       vi.fn().mockResolvedValue({ width: 200, height: 150 }),
  }
  return { mockPdfSave, mockPdfDoc, mockPage, mockSetRotation }
})

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue(mockPdfDoc),
    load:   vi.fn().mockResolvedValue(mockPdfDoc),
  },
  degrees:       vi.fn(angle => ({ type: 'degrees', angle })),
  rgb:           vi.fn((r, g, b) => ({ r, g, b })),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold' },
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
  convertOdtNode,
  compressPdf,
  wordToPdf,
  mergePdfs,
  rotatePdf,
  pngToJpg,
  jpgToPng,
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

// ─────────────────────────────────────────────────────────────────
// convertOdtNode — pure XML-node-to-HTML converter
// ─────────────────────────────────────────────────────────────────
describe('convertOdtNode', () => {
  it('returns the text content of a text node', () => {
    const node = document.createTextNode('hello')
    expect(convertOdtNode(node)).toBe('hello')
  })

  it('wraps a <p> element in <p> tags', () => {
    const el = document.createElement('p')
    el.textContent = 'paragraph'
    expect(convertOdtNode(el)).toBe('<p>paragraph</p>')
  })

  it('wraps a <h> element in <h2> tags', () => {
    const el = document.createElement('h')
    el.textContent = 'heading'
    expect(convertOdtNode(el)).toBe('<h2>heading</h2>')
  })

  it('<span> passes children through without a wrapper', () => {
    const span = document.createElement('span')
    span.textContent = 'inline'
    expect(convertOdtNode(span)).toBe('inline')
  })

  it('<s> returns spaces based on text:c attribute', () => {
    const el = document.createElement('s')
    el.setAttribute('text:c', '3')
    expect(convertOdtNode(el)).toBe('   ')
  })

  it('<s> without text:c defaults to one space', () => {
    const el = document.createElement('s')
    expect(convertOdtNode(el)).toBe(' ')
  })

  it('<tab> returns four non-breaking spaces', () => {
    const el = document.createElement('tab')
    expect(convertOdtNode(el)).toBe('&nbsp;&nbsp;&nbsp;&nbsp;')
  })

  it('<line-break> returns <br/>', () => {
    const el = document.createElement('line-break')
    expect(convertOdtNode(el)).toBe('<br/>')
  })

  it('<list> and <list-item> produce a <ul><li> structure', () => {
    const list = document.createElement('list')
    const item = document.createElement('list-item')
    item.textContent = 'item'
    list.appendChild(item)
    expect(convertOdtNode(list)).toBe('<ul><li>item</li></ul>')
  })

  it('<table>, <table-row>, <table-cell> produce correct HTML structure', () => {
    const table = document.createElement('table')
    const row   = document.createElement('table-row')
    const cell  = document.createElement('table-cell')
    cell.textContent = 'data'
    row.appendChild(cell)
    table.appendChild(row)
    expect(convertOdtNode(table)).toBe('<table><tr><td>data</td></tr></table>')
  })

  it('<a> wraps children in an <a> tag', () => {
    const el = document.createElement('a')
    el.textContent = 'link'
    expect(convertOdtNode(el)).toBe('<a>link</a>')
  })

  it('unknown tags pass children through unchanged', () => {
    const el = document.createElement('unknown-tag')
    el.textContent = 'pass'
    expect(convertOdtNode(el)).toBe('pass')
  })

  it('recursively converts nested elements', () => {
    const p    = document.createElement('p')
    const span = document.createElement('span')
    span.textContent = 'nested'
    p.appendChild(span)
    expect(convertOdtNode(p)).toBe('<p>nested</p>')
  })
})

// ─────────────────────────────────────────────────────────────────
// mergePdfs
// ─────────────────────────────────────────────────────────────────
describe('mergePdfs', () => {
  beforeEach(() => {
    mockPdfSave.mockReset()
    mockPdfSave.mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.copyPages.mockClear()
    mockPdfDoc.addPage.mockClear()
    URL.createObjectURL.mockClear()
  })

  const makeFile = (name = 'a.pdf') =>
    new File([new Uint8Array(10)], name, { type: 'application/pdf' })

  it('copies pages from each source document into the merged doc', async () => {
    await mergePdfs([makeFile('a.pdf'), makeFile('b.pdf')])
    expect(mockPdfDoc.copyPages).toHaveBeenCalledTimes(2)
  })

  it('adds every copied page to the merged document', async () => {
    await mergePdfs([makeFile()])
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith(mockPage)
  })

  it('saves the merged document', async () => {
    await mergePdfs([makeFile()])
    expect(mockPdfSave).toHaveBeenCalled()
  })

  it('triggers a download after merging', async () => {
    await mergePdfs([makeFile()])
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// rotatePdf
// ─────────────────────────────────────────────────────────────────
describe('rotatePdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset()
    mockPdfSave.mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockSetRotation.mockClear()
    mockPage.getRotation.mockReturnValue({ angle: 0 })
    URL.createObjectURL.mockClear()
  })

  const makeFile = () =>
    new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' })

  it('calls setRotation on every page', async () => {
    await rotatePdf(makeFile(), 90)
    expect(mockSetRotation).toHaveBeenCalled()
  })

  it('adds degrees to the page current rotation angle', async () => {
    mockPage.getRotation.mockReturnValue({ angle: 90 })
    await rotatePdf(makeFile(), 90)
    expect(mockSetRotation).toHaveBeenCalledWith({ type: 'degrees', angle: 180 })
  })

  it('wraps the rotation angle at 360', async () => {
    mockPage.getRotation.mockReturnValue({ angle: 270 })
    await rotatePdf(makeFile(), 90)
    expect(mockSetRotation).toHaveBeenCalledWith({ type: 'degrees', angle: 0 })
  })

  it('defaults to 90 degrees when no argument is provided', async () => {
    await rotatePdf(makeFile())
    expect(mockSetRotation).toHaveBeenCalledWith({ type: 'degrees', angle: 90 })
  })

  it('triggers a download for the rotated PDF', async () => {
    await rotatePdf(makeFile(), 90)
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// pngToJpg / jpgToPng — canvas-based image conversions
// ─────────────────────────────────────────────────────────────────
describe('pngToJpg', () => {
  beforeEach(() => {
    URL.createObjectURL.mockClear()
    URL.revokeObjectURL.mockClear()
    vi.stubGlobal('Image', class MockImage {
      set src(_val) { setTimeout(() => this.onload?.(), 0) }
      get naturalWidth()  { return 100 }
      get naturalHeight() { return 80  }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const makeFile = () =>
    new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' })

  it('creates an object URL from the source file', async () => {
    await pngToJpg(makeFile())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('revokes the source object URL after the image is loaded', async () => {
    await pngToJpg(makeFile())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('downloads the converted JPEG (two createObjectURL calls total)', async () => {
    await pngToJpg(makeFile())
    // 1st call: source blob for Image.src; 2nd call: download anchor href
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
  })
})

describe('jpgToPng', () => {
  beforeEach(() => {
    URL.createObjectURL.mockClear()
    URL.revokeObjectURL.mockClear()
    vi.stubGlobal('Image', class MockImage {
      set src(_val) { setTimeout(() => this.onload?.(), 0) }
      get naturalWidth()  { return 100 }
      get naturalHeight() { return 80  }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const makeFile = () =>
    new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })

  it('creates an object URL from the source file', async () => {
    await jpgToPng(makeFile())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('revokes the source object URL after the image is loaded', async () => {
    await jpgToPng(makeFile())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('downloads the converted PNG (two createObjectURL calls total)', async () => {
    await jpgToPng(makeFile())
    // 1st call: source blob for Image.src; 2nd call: download anchor href
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────
// Additional imports for the extended test suite
// ─────────────────────────────────────────────────────────────────
import {
  unlockPdf,
  unlockPdfToBlob,
  watermarkPdf,
  watermarkPdfToBlob,
  numberPagesPdf,
  numberPagesPdfToBlob,
  cropPdf,
  cropPdfToBlob,
  compressPdfToBlob,
  rotatePdfToBlob,
  excelToPdf,
  splitPdf,
} from './convert'

const makeFilePdf = (name = 'doc.pdf') =>
  new File([new Uint8Array(10)], name, { type: 'application/pdf' })

// ─────────────────────────────────────────────────────────────────
// unlockPdf / unlockPdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('unlockPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
  })

  it('saves the document and triggers a download', async () => {
    await unlockPdf(makeFilePdf())
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('download filename contains "-unlocked"', async () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    await unlockPdf(new File([new Uint8Array(10)], 'locked.pdf', { type: 'application/pdf' }))
    const anchor = spy.mock.calls.find(([el]) => el.tagName === 'A')?.[0]
    expect(anchor?.download).toContain('unlocked')
    spy.mockRestore()
  })
})

describe('unlockPdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it('returns a PDF Blob', async () => {
    const blob = await unlockPdfToBlob(makeFilePdf())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('does NOT trigger a download', async () => {
    URL.createObjectURL.mockClear()
    await unlockPdfToBlob(makeFilePdf())
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// watermarkPdf / watermarkPdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('watermarkPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({
      widthOfTextAtSize: vi.fn().mockReturnValue(100),
    })
    mockPage.getSize  = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.drawText = vi.fn()
  })

  it('saves the PDF and triggers a download', async () => {
    await watermarkPdf(makeFilePdf(), 'CONFIDENTIAL')
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('calls drawText on each page', async () => {
    await watermarkPdf(makeFilePdf(), 'DRAFT')
    expect(mockPage.drawText).toHaveBeenCalledWith('DRAFT', expect.any(Object))
  })

  it('uses the default opacity of 0.15', async () => {
    await watermarkPdf(makeFilePdf(), 'SECRET')
    const opts = mockPage.drawText.mock.calls[0][1]
    expect(opts.opacity).toBe(0.15)
  })

  it('respects a custom opacity', async () => {
    await watermarkPdf(makeFilePdf(), 'LOW', 0.05)
    const opts = mockPage.drawText.mock.calls[0][1]
    expect(opts.opacity).toBe(0.05)
  })
})

describe('watermarkPdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([4, 5, 6]))
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({ widthOfTextAtSize: vi.fn().mockReturnValue(80) })
    mockPage.getSize  = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.drawText = vi.fn()
  })

  it('returns a PDF Blob without downloading', async () => {
    URL.createObjectURL.mockClear()
    const blob = await watermarkPdfToBlob(makeFilePdf(), 'DRAFT')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// numberPagesPdf / numberPagesPdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('numberPagesPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({ widthOfTextAtSize: vi.fn().mockReturnValue(30) })
    mockPage.getSize  = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.drawText = vi.fn()
  })

  it('triggers a download', async () => {
    await numberPagesPdf(makeFilePdf())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('draws page numbers on every page', async () => {
    await numberPagesPdf(makeFilePdf())
    expect(mockPage.drawText).toHaveBeenCalled()
  })

  it('download filename contains "-numerado"', async () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    await numberPagesPdf(new File([new Uint8Array(10)], 'report.pdf', { type: 'application/pdf' }))
    const anchor = spy.mock.calls.find(([el]) => el.tagName === 'A')?.[0]
    expect(anchor?.download).toContain('numerado')
    spy.mockRestore()
  })
})

describe('numberPagesPdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([7, 8, 9]))
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({ widthOfTextAtSize: vi.fn().mockReturnValue(30) })
    mockPage.getSize  = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.drawText = vi.fn()
  })

  it('returns a PDF Blob without downloading', async () => {
    URL.createObjectURL.mockClear()
    const blob = await numberPagesPdfToBlob(makeFilePdf())
    expect(blob).toBeInstanceOf(Blob)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// cropPdf / cropPdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('cropPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
    mockPage.getSize    = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.setCropBox = vi.fn()
  })

  it('triggers a download', async () => {
    await cropPdf(makeFilePdf(), { top: 0, bottom: 0, left: 0, right: 0 })
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('calls setCropBox on pages with positive dimensions', async () => {
    await cropPdf(makeFilePdf(), { top: 0, bottom: 0, left: 0, right: 0 })
    expect(mockPage.setCropBox).toHaveBeenCalled()
  })

  it('download filename contains "-recortado"', async () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    await cropPdf(new File([new Uint8Array(10)], 'img.pdf', { type: 'application/pdf' }), { top: 5, bottom: 5, left: 5, right: 5 })
    const anchor = spy.mock.calls.find(([el]) => el.tagName === 'A')?.[0]
    expect(anchor?.download).toContain('recortado')
    spy.mockRestore()
  })
})

describe('cropPdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1]))
    mockPage.getSize    = vi.fn().mockReturnValue({ width: 595, height: 842 })
    mockPage.setCropBox = vi.fn()
  })

  it('returns a PDF Blob without downloading', async () => {
    URL.createObjectURL.mockClear()
    const blob = await cropPdfToBlob(makeFilePdf(), { top: 0, bottom: 0, left: 0, right: 0 })
    expect(blob).toBeInstanceOf(Blob)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// compressPdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('compressPdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it('returns a PDF Blob', async () => {
    const blob = await compressPdfToBlob(makeFilePdf(), 'medium')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('does NOT trigger a download', async () => {
    URL.createObjectURL.mockClear()
    await compressPdfToBlob(makeFilePdf(), 'high')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('passes objectsPerTick=100 for high compression', async () => {
    await compressPdfToBlob(makeFilePdf(), 'high')
    expect(mockPdfSave).toHaveBeenCalledWith(
      expect.objectContaining({ objectsPerTick: 100 })
    )
  })
})

// ─────────────────────────────────────────────────────────────────
// rotatePdfToBlob
// ─────────────────────────────────────────────────────────────────
describe('rotatePdfToBlob', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockSetRotation.mockClear()
    mockPage.getRotation.mockReturnValue({ angle: 0 })
  })

  it('returns a PDF Blob', async () => {
    const blob = await rotatePdfToBlob(makeFilePdf(), 90)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('does NOT trigger a download', async () => {
    URL.createObjectURL.mockClear()
    await rotatePdfToBlob(makeFilePdf(), 90)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('calls setRotation on all pages', async () => {
    await rotatePdfToBlob(makeFilePdf(), 180)
    expect(mockSetRotation).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// splitPdf
// ─────────────────────────────────────────────────────────────────
describe('splitPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.getPageCount.mockReturnValue(5)
    mockPdfDoc.copyPages.mockClear()
    URL.createObjectURL.mockClear()
  })

  it('creates one output PDF per page in the range', async () => {
    await splitPdf(makeFilePdf(), '1-2')
    expect(mockPdfDoc.copyPages).toHaveBeenCalledTimes(2)
  })

  it('triggers a download for each page', async () => {
    await splitPdf(makeFilePdf(), '1-3')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3)
  })

  it('throws when the range is invalid', async () => {
    await expect(splitPdf(makeFilePdf(), '99')).rejects.toThrow('Rango de páginas inválido')
  })
})

// ─────────────────────────────────────────────────────────────────
// excelToPdf
// ─────────────────────────────────────────────────────────────────
describe('excelToPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.XLSX
  })

  const makeXls = () =>
    new File([new Uint8Array(10)], 'data.xlsx', { type: 'application/vnd.ms-excel' })

  it('returns "popup-blocked" when window.open returns null', async () => {
    window.XLSX = {
      read: vi.fn().mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
      utils: { sheet_to_html: vi.fn().mockReturnValue('<table></table>') },
    }
    vi.spyOn(window, 'open').mockReturnValue(null)
    expect(await excelToPdf(makeXls())).toBe('popup-blocked')
  })

  it('returns "print-dialog" when popup opens', async () => {
    window.XLSX = {
      read: vi.fn().mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
      utils: { sheet_to_html: vi.fn().mockReturnValue('<table></table>') },
    }
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    expect(await excelToPdf(makeXls())).toBe('print-dialog')
  })

  it('writes HTML containing each sheet name', async () => {
    window.XLSX = {
      read: vi.fn().mockReturnValue({
        SheetNames: ['Ventas', 'Gastos'],
        Sheets: { Ventas: {}, Gastos: {} },
      }),
      utils: { sheet_to_html: vi.fn().mockReturnValue('<table></table>') },
    }
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    await excelToPdf(makeXls())
    const html = mockWin.document.write.mock.calls[0][0]
    expect(html).toContain('Ventas')
    expect(html).toContain('Gastos')
  })
})

// ─────────────────────────────────────────────────────────────────
// Additional convert functions — pdf-lib based
// ─────────────────────────────────────────────────────────────────
import {
  repairPdf,
  flattenPdf,
  organizePdf,
  deletePagesPdf,
  signPdfV2,
  annotatePdf,
  redactPdf,
  htmlToPdf,
  downloadAsZip,
} from './convert'

// ─────────────────────────────────────────────────────────────────
// repairPdf — load + save, trivial
// ─────────────────────────────────────────────────────────────────
describe('repairPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
  })

  it('loads and saves the PDF', async () => {
    await repairPdf(makeFilePdf('broken.pdf'))
    expect(mockPdfSave).toHaveBeenCalled()
  })

  it('triggers a download', async () => {
    await repairPdf(makeFilePdf('broken.pdf'))
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// flattenPdf — calls getForm().flatten()
// ─────────────────────────────────────────────────────────────────
describe('flattenPdf', () => {
  let mockFlatten

  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    URL.createObjectURL.mockClear()
    mockFlatten = vi.fn()
    mockPdfDoc.getForm = vi.fn(() => ({ flatten: mockFlatten }))
  })

  afterEach(() => {
    delete mockPdfDoc.getForm
  })

  it('calls getForm().flatten()', async () => {
    await flattenPdf(makeFilePdf())
    expect(mockFlatten).toHaveBeenCalled()
  })

  it('saves and downloads the flattened PDF', async () => {
    await flattenPdf(makeFilePdf())
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('does not throw when getForm().flatten() throws (no form)', async () => {
    mockPdfDoc.getForm = vi.fn(() => ({ flatten: vi.fn().mockImplementation(() => { throw new Error('no form') }) }))
    await expect(flattenPdf(makeFilePdf())).resolves.toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────
// organizePdf — reorders pages via pdf-lib
// ─────────────────────────────────────────────────────────────────
describe('organizePdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.copyPages.mockClear()
    mockPdfDoc.addPage.mockClear()
    URL.createObjectURL.mockClear()
  })

  it('copies pages in the specified order', async () => {
    await organizePdf(makeFilePdf(), [2, 0, 1])
    expect(mockPdfDoc.copyPages).toHaveBeenCalledWith(mockPdfDoc, [2, 0, 1])
  })

  it('adds each copied page', async () => {
    await organizePdf(makeFilePdf(), [0])
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith(mockPage)
  })

  it('saves and downloads the reorganized PDF', async () => {
    await organizePdf(makeFilePdf(), [0, 1])
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// deletePagesPdf — deletes specified pages using parsePageRange
// ─────────────────────────────────────────────────────────────────
describe('deletePagesPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.copyPages.mockClear()
    mockPdfDoc.addPage.mockClear()
    // getPageCount returns 5 by default from mock
    URL.createObjectURL.mockClear()
  })

  it('throws when all pages are deleted', async () => {
    // parsePageRange('1-5', 5) returns [0,1,2,3,4] — all pages
    await expect(deletePagesPdf(makeFilePdf(), '1-5')).rejects.toThrow('No quedan páginas')
  })

  it('keeps undeleted pages and downloads result', async () => {
    // parsePageRange('1', 5) returns [0] — delete page 1, keep 1,2,3,4 (indices 1-4)
    await deletePagesPdf(makeFilePdf(), '1')
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// signPdfV2 — embeds signature image
// ─────────────────────────────────────────────────────────────────
describe('signPdfV2', () => {
  const SIG_DATA_URL =
    'data:image/png;base64,' + btoa('fake-png-bytes')

  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.embedPng.mockClear()
    mockPage.getSize = vi.fn(() => ({ width: 612, height: 792 }))
    mockPage.drawImage = vi.fn()
    URL.createObjectURL.mockClear()
  })

  afterEach(() => {
    delete mockPage.getSize
    delete mockPage.drawImage
  })

  it('embeds the PNG signature', async () => {
    await signPdfV2(makeFilePdf(), SIG_DATA_URL, 'last', 'br')
    expect(mockPdfDoc.embedPng).toHaveBeenCalled()
  })

  it('calls drawImage on the target page', async () => {
    await signPdfV2(makeFilePdf(), SIG_DATA_URL, 'first', 'tl')
    expect(mockPage.drawImage).toHaveBeenCalled()
  })

  it('saves and downloads the signed PDF', async () => {
    await signPdfV2(makeFilePdf(), SIG_DATA_URL)
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('signs all pages when pageSpec="all"', async () => {
    // getPages returns [mockPage] (1 page), so drawImage called once
    mockPage.drawImage = vi.fn()
    await signPdfV2(makeFilePdf(), SIG_DATA_URL, 'all', 'bc')
    expect(mockPage.drawImage).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────
// annotatePdf — draws text annotations via pdf-lib
// ─────────────────────────────────────────────────────────────────
describe('annotatePdf', () => {
  let mockWidthOfText

  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockWidthOfText = vi.fn(() => 100)
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({ widthOfTextAtSize: mockWidthOfText })
    mockPage.getSize = vi.fn(() => ({ width: 612, height: 792 }))
    mockPage.drawText = vi.fn()
    URL.createObjectURL.mockClear()
  })

  afterEach(() => {
    delete mockPdfDoc.embedFont
    delete mockPage.getSize
    delete mockPage.drawText
  })

  const makeAnnotations = () => [
    { page: 1, text: 'DRAFT', pos: 'tc', size: 24, color: 'red' },
  ]

  it('embeds Helvetica font', async () => {
    await annotatePdf(makeFilePdf(), makeAnnotations())
    expect(mockPdfDoc.embedFont).toHaveBeenCalledWith('Helvetica')
  })

  it('calls drawText for each annotation', async () => {
    await annotatePdf(makeFilePdf(), makeAnnotations())
    expect(mockPage.drawText).toHaveBeenCalledWith('DRAFT', expect.objectContaining({ size: 24 }))
  })

  it('saves and downloads the annotated PDF', async () => {
    await annotatePdf(makeFilePdf(), makeAnnotations())
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('works with multiple annotations', async () => {
    const anns = [
      { page: 1, text: 'First', pos: 'tl', size: 12, color: 'black' },
      { page: 1, text: 'Second', pos: 'br', size: 14, color: 'blue' },
    ]
    await annotatePdf(makeFilePdf(), anns)
    expect(mockPage.drawText).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────
// redactPdf — draws black rectangles over sensitive areas
// ─────────────────────────────────────────────────────────────────
describe('redactPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPage.getSize = vi.fn(() => ({ width: 612, height: 792 }))
    mockPage.drawRectangle = vi.fn()
    URL.createObjectURL.mockClear()
  })

  afterEach(() => {
    delete mockPage.getSize
    delete mockPage.drawRectangle
  })

  const makeZones = () => [
    { page: 1, x: 10, y: 20, w: 50, h: 10 },
  ]

  it('calls drawRectangle for each zone', async () => {
    await redactPdf(makeFilePdf(), makeZones())
    expect(mockPage.drawRectangle).toHaveBeenCalledTimes(1)
  })

  it('uses black color for redaction', async () => {
    await redactPdf(makeFilePdf(), makeZones())
    expect(mockPage.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.objectContaining({ r: 0, g: 0, b: 0 }) })
    )
  })

  it('saves and downloads the redacted PDF', async () => {
    await redactPdf(makeFilePdf(), makeZones())
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('handles multiple zones', async () => {
    const zones = [
      { page: 1, x: 0, y: 0, w: 10, h: 10 },
      { page: 1, x: 50, y: 50, w: 20, h: 5 },
    ]
    await redactPdf(makeFilePdf(), zones)
    expect(mockPage.drawRectangle).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────
// htmlToPdf — opens an HTML file in a new window for printing
// ─────────────────────────────────────────────────────────────────
describe('htmlToPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    URL.createObjectURL.mockClear()
    URL.revokeObjectURL.mockClear()
  })

  const makeHtml = (content = '<html><body>Test</body></html>') =>
    new File([content], 'page.html', { type: 'text/html' })

  it('returns "print-dialog" when popup opens', async () => {
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    expect(await htmlToPdf(makeHtml())).toBe('print-dialog')
  })

  it('returns "popup-blocked" and triggers download when popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const result = await htmlToPdf(makeHtml())
    expect(result).toBe('popup-blocked')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('injects autoprint script when not already present', async () => {
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    await htmlToPdf(makeHtml('<html><body>Test</body></html>'))
    // opens the URL (createObjectURL called)
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('does not inject script when window.print already present', async () => {
    const withPrint = '<html><body><script>window.print();</script></body></html>'
    const mockWin = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(mockWin)
    const result = await htmlToPdf(makeHtml(withPrint))
    expect(result).toBe('print-dialog')
  })
})

// ─────────────────────────────────────────────────────────────────
// downloadAsZip — packages blobs into a ZIP file
// ─────────────────────────────────────────────────────────────────
describe('downloadAsZip', () => {
  let mockZipFile
  let mockZipInstance

  beforeEach(() => {
    URL.createObjectURL.mockClear()
    mockZipFile = vi.fn()
    mockZipInstance = {
      file: mockZipFile,
      generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content'])),
    }
    window.JSZip = function JSZip() { return mockZipInstance }
  })

  afterEach(() => {
    delete window.JSZip
  })

  it('adds each item to the zip', async () => {
    const items = [
      { filename: 'a.pdf', blob: new Blob(['aaa']) },
      { filename: 'b.pdf', blob: new Blob(['bbb']) },
    ]
    await downloadAsZip(items)
    expect(mockZipFile).toHaveBeenCalledTimes(2)
    expect(mockZipFile.mock.calls[0][0]).toBe('a.pdf')
    expect(mockZipFile.mock.calls[1][0]).toBe('b.pdf')
  })

  it('generates a zip blob', async () => {
    await downloadAsZip([{ filename: 'x.pdf', blob: new Blob(['x']) }])
    expect(mockZipInstance.generateAsync).toHaveBeenCalledWith({ type: 'blob' })
  })

  it('triggers a download of the zip file', async () => {
    await downloadAsZip([{ filename: 'x.pdf', blob: new Blob(['x']) }])
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// imagesToPdf — embeds JPG, PNG images into a new PDF
// ─────────────────────────────────────────────────────────────────
import { imagesToPdf, pngToJpgBlob, jpgToPngBlob, ensurePdfJs } from './convert'

describe('imagesToPdf', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.embedJpg.mockClear()
    mockPdfDoc.embedPng.mockClear()
    mockPdfDoc.addPage.mockClear()
    // Restore drawImage in case a prior afterEach deleted it
    mockPage.drawImage = vi.fn()
    URL.createObjectURL.mockClear()
  })

  it('embeds a JPG file', async () => {
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    await imagesToPdf([file])
    expect(mockPdfDoc.embedJpg).toHaveBeenCalledOnce()
  })

  it('embeds a PNG file', async () => {
    const file = new File([new Uint8Array(10)], 'image.png', { type: 'image/png' })
    await imagesToPdf([file])
    expect(mockPdfDoc.embedPng).toHaveBeenCalledOnce()
  })

  it('embeds a JPEG file (alternate extension)', async () => {
    const file = new File([new Uint8Array(10)], 'photo.jpeg', { type: 'image/jpeg' })
    await imagesToPdf([file])
    expect(mockPdfDoc.embedJpg).toHaveBeenCalledOnce()
  })

  it('adds a page for each image', async () => {
    const jpg = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' })
    const png = new File([new Uint8Array(10)], 'b.png', { type: 'image/png' })
    await imagesToPdf([jpg, png])
    expect(mockPdfDoc.addPage).toHaveBeenCalledTimes(2)
  })

  it('draws the image on the page', async () => {
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    mockPage.drawImage = vi.fn()
    await imagesToPdf([file])
    expect(mockPage.drawImage).toHaveBeenCalled()
  })

  it('saves the PDF and triggers a download', async () => {
    const file = new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' })
    await imagesToPdf([file])
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// pngToJpgBlob / jpgToPngBlob — canvas-based blob conversions
// ─────────────────────────────────────────────────────────────────
describe('pngToJpgBlob', () => {
  beforeEach(() => {
    URL.createObjectURL.mockClear()
    URL.revokeObjectURL.mockClear()
    vi.stubGlobal('Image', class MockImage {
      set src(_val) { setTimeout(() => this.onload?.(), 0) }
      get naturalWidth()  { return 100 }
      get naturalHeight() { return 80  }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a Blob', async () => {
    const file = new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
    const blob = await pngToJpgBlob(file)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('revokes the source object URL', async () => {
    const file = new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
    await pngToJpgBlob(file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('does NOT trigger a download', async () => {
    const file = new File([new Uint8Array(10)], 'img.png', { type: 'image/png' })
    // Only the source blob URL should be created (not a download anchor)
    await pngToJpgBlob(file)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })
})

describe('jpgToPngBlob', () => {
  beforeEach(() => {
    URL.createObjectURL.mockClear()
    URL.revokeObjectURL.mockClear()
    vi.stubGlobal('Image', class MockImage {
      set src(_val) { setTimeout(() => this.onload?.(), 0) }
      get naturalWidth()  { return 120 }
      get naturalHeight() { return 90  }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a Blob', async () => {
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    const blob = await jpgToPngBlob(file)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('revokes the source object URL', async () => {
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' })
    await jpgToPngBlob(file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})

// ─────────────────────────────────────────────────────────────────
// ensurePdfJs — skips loading when pdfjsLib already exists
// ─────────────────────────────────────────────────────────────────
describe('ensurePdfJs', () => {
  afterEach(() => {
    delete window.pdfjsLib
  })

  it('does not append a script tag when pdfjsLib is already loaded', async () => {
    window.pdfjsLib = { GlobalWorkerOptions: { workerSrc: '' } }
    const spy = vi.spyOn(document.head, 'appendChild')
    await ensurePdfJs()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────
// applyEdits — text annotations + redact zones via pdf-lib
// ─────────────────────────────────────────────────────────────────
import { applyEdits } from './convert'

describe('applyEdits', () => {
  beforeEach(() => {
    mockPdfSave.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockPdfDoc.embedFont = vi.fn().mockResolvedValue({})
    mockPage.getSize = vi.fn(() => ({ width: 612, height: 792 }))
    mockPage.drawText = vi.fn()
    mockPage.drawRectangle = vi.fn()
    URL.createObjectURL.mockClear()
  })

  afterEach(() => {
    delete mockPdfDoc.embedFont
    delete mockPage.getSize
    delete mockPage.drawText
    delete mockPage.drawRectangle
  })

  it('draws text annotations via drawText', async () => {
    const file = makeFilePdf()
    await applyEdits(file, [{ page: 1, text: 'Hello', x: 100, y: 200, size: 14, color: 'red' }], [])
    expect(mockPage.drawText).toHaveBeenCalledWith('Hello', expect.objectContaining({ size: 14 }))
  })

  it('draws redact zones via drawRectangle', async () => {
    const file = makeFilePdf()
    await applyEdits(file, [], [{ page: 1, x: 10, y: 20, w: 50, h: 10 }])
    expect(mockPage.drawRectangle).toHaveBeenCalledTimes(1)
  })

  it('saves and downloads the edited PDF', async () => {
    const file = makeFilePdf()
    await applyEdits(file, [], [])
    expect(mockPdfSave).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('handles empty edits and zones without crashing', async () => {
    const file = makeFilePdf()
    await expect(applyEdits(file, [], [])).resolves.toBeUndefined()
  })

  it('supports blue and black text colors', async () => {
    const file = makeFilePdf()
    const edits = [
      { page: 1, text: 'Blue', x: 10, y: 10, size: 12, color: 'blue' },
      { page: 1, text: 'Black', x: 20, y: 20, size: 12, color: 'black' },
    ]
    await applyEdits(file, edits, [])
    expect(mockPage.drawText).toHaveBeenCalledTimes(2)
  })

  it('uses the last valid page when page index exceeds total', async () => {
    const file = makeFilePdf()
    // page 999 should clamp to last page (getPages returns [mockPage])
    await applyEdits(file, [{ page: 999, text: 'Clamped', x: 0, y: 0, size: 10, color: 'black' }], [])
    expect(mockPage.drawText).toHaveBeenCalled()
  })
})
