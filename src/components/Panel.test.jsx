/**
 * Panel tests — covers TOOL_BASE, FilePreviewModal, DropboxImportButton,
 * GoogleDriveImportButton, FileRow, and the core Panel render.
 *
 * Heavy convert utilities and AI sub-components are mocked so the suite
 * stays fast and purely unit-level.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── mock all heavy convert utilities ─────────────────────────────
vi.mock('../utils/convert', () => ({
  mergePdfs: vi.fn(), splitPdf: vi.fn(), imagesToPdf: vi.fn(),
  wordToPdf: vi.fn(), pdfToWord: vi.fn(), pngToJpg: vi.fn(),
  jpgToPng: vi.fn(), rotatePdf: vi.fn(), excelToPdf: vi.fn(),
  compressPdfToBlob: vi.fn(), rotatePdfToBlob: vi.fn(),
  pngToJpgBlob: vi.fn(), jpgToPngBlob: vi.fn(),
  downloadAsZip: vi.fn(), basename: vi.fn(s => s),
  parsePageRange: vi.fn(() => []),
  unlockPdf: vi.fn(), unlockPdfToBlob: vi.fn(),
  watermarkPdf: vi.fn(), watermarkPdfToBlob: vi.fn(),
  numberPagesPdf: vi.fn(), numberPagesPdfToBlob: vi.fn(),
  cropPdf: vi.fn(), cropPdfToBlob: vi.fn(),
  grayscalePdf: vi.fn(), grayscalePdfToBlob: vi.fn(),
  pdfToPptx: vi.fn(), pdfToExcel: vi.fn(),
  signPdfV2: vi.fn(), ocrPdf: vi.fn(),
  pdfToImages: vi.fn(), organizePdf: vi.fn(),
  deletePagesPdf: vi.fn(), pptxToPdf: vi.fn(),
  ensurePdfJs: vi.fn(), repairPdf: vi.fn(),
  htmlToPdf: vi.fn(), flattenPdf: vi.fn(),
  annotatePdf: vi.fn(), redactPdf: vi.fn(),
  ocrSearchablePdf: vi.fn(), pdfToMarkdown: vi.fn(),
}))

// ── mock AI sub-components ────────────────────────────────────────
vi.mock('./ChatPdf',       () => ({ default: () => <div>ChatPdf</div> }))
vi.mock('./VisualAnnotate',() => ({ default: () => <div>VisualAnnotate</div> }))
vi.mock('./SummarizePdf',  () => ({ default: () => <div>SummarizePdf</div> }))
vi.mock('./ComparePdf',    () => ({ default: () => <div>ComparePdf</div> }))

// ── mock notify utils ─────────────────────────────────────────────
vi.mock('../utils/notify', () => ({
  requestNotifyPermission: vi.fn(),
  notifyDone: vi.fn(),
}))

// ── mock icons so we don't need SVG setup ─────────────────────────
vi.mock('./icons', () => ({
  Ic: ({ n, ...rest }) => <span data-icon={n} {...rest} />,
}))

import { TOOL_BASE } from './Panel'
import Panel from './Panel'
import { LangCtx, LANGS } from '../contexts/LangContext'

const T_ES = LANGS.es
const Wrapper = ({ children }) => (
  <LangCtx.Provider value={T_ES}>{children}</LangCtx.Provider>
)

// ─────────────────────────────────────────────────────────────────
// TOOL_BASE
// ─────────────────────────────────────────────────────────────────
describe('TOOL_BASE', () => {
  it('exports an array with more than 30 tools', () => {
    expect(Array.isArray(TOOL_BASE)).toBe(true)
    expect(TOOL_BASE.length).toBeGreaterThan(30)
  })

  it('every tool has id, icon, accepts, from, to', () => {
    TOOL_BASE.forEach(tool => {
      expect(tool.id,      `${tool.id} missing id`).toBeTruthy()
      expect(tool.icon,    `${tool.id} missing icon`).toBeTruthy()
      expect(tool.accepts, `${tool.id} missing accepts`).toBeTruthy()
      expect(tool.from,    `${tool.id} missing from`).toBeTruthy()
      expect(tool.to,      `${tool.id} missing to`).toBeTruthy()
    })
  })

  it('includes the pdf-word tool', () => {
    expect(TOOL_BASE.find(t => t.id === 'pdf-word')).toBeTruthy()
  })

  it('includes the merge tool marked as popular', () => {
    const merge = TOOL_BASE.find(t => t.id === 'merge')
    expect(merge).toBeTruthy()
    expect(merge.popular).toBe(true)
  })

  it('includes the ocr-pdf tool marked as pro', () => {
    const ocr = TOOL_BASE.find(t => t.id === 'ocr-pdf')
    expect(ocr).toBeTruthy()
    expect(ocr.pro).toBe(true)
  })

  it('multi-file tools have multi:true', () => {
    const merge = TOOL_BASE.find(t => t.id === 'merge')
    expect(merge.multi).toBe(true)
  })

  it('accepts arrays contain valid extensions', () => {
    TOOL_BASE.forEach(tool => {
      tool.accepts.forEach(ext => {
        expect(ext).toMatch(/^\.[a-z]+$/i)
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────
// Panel — basic render
// ─────────────────────────────────────────────────────────────────
const mkTool = (id = 'compress') => TOOL_BASE.find(t => t.id === id)

const setup = (toolId = 'compress') => {
  const tool      = mkTool(toolId)
  const onClose   = vi.fn()
  const showToast = vi.fn()
  const user      = userEvent.setup()

  render(
    <Wrapper>
      <Panel
        tool={tool}
        onClose={onClose}
        showToast={showToast}
      />
    </Wrapper>
  )

  return { tool, onClose, showToast, user }
}

describe('Panel — render', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders without crashing', () => {
    setup()
    // If it renders, the test passes
  })

  it('shows the drag-and-drop area text', () => {
    setup()
    const dragText = screen.queryByText(T_ES.drag_single) || screen.queryByText(T_ES.drag_multi)
    expect(dragText).toBeInTheDocument()
  })

  it('renders the Convertir button', () => {
    setup()
    expect(screen.getByText(T_ES.convert)).toBeInTheDocument()
  })

  it('renders the Cancelar button', () => {
    setup()
    expect(screen.getByText(T_ES.cancel)).toBeInTheDocument()
  })

  it('calls onClose when Cancelar is clicked', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByText(T_ES.cancel))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders the Dropbox import button', () => {
    setup()
    expect(screen.getByText('Dropbox')).toBeInTheDocument()
  })

  it('renders the Google Drive import button', () => {
    setup()
    expect(screen.getByText('Google Drive')).toBeInTheDocument()
  })

  it('renders the "or click" hint text', () => {
    setup()
    // click_hint is embedded in a combined text node with accepts/max_size
    expect(screen.getByText(new RegExp(T_ES.click_hint))).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Panel — different tools render without crash
// ─────────────────────────────────────────────────────────────────
describe('Panel — tool variety', () => {
  afterEach(() => vi.restoreAllMocks())

  const toolIds = ['compress', 'split', 'rotate', 'merge', 'pdf-word', 'word-pdf', 'watermark-pdf']

  toolIds.forEach(toolId => {
    it(`renders ${toolId} without crashing`, () => {
      setup(toolId)
      expect(screen.getByText(T_ES.convert)).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────
// Panel — file drop
// ─────────────────────────────────────────────────────────────────
describe('Panel — file interaction', () => {
  afterEach(() => vi.restoreAllMocks())

  it('clicking Convertir with no files does not crash', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <Panel tool={mkTool('compress')} onClose={vi.fn()} showToast={vi.fn()} />
      </Wrapper>
    )
    await user.click(screen.getByText(T_ES.convert))
  })

  it('drag over sets drag state visually (no crash)', () => {
    const { container } = render(
      <Wrapper>
        <Panel tool={mkTool('compress')} onClose={vi.fn()} showToast={vi.fn()} />
      </Wrapper>
    )
    const dropZone = container.firstChild
    fireEvent.dragOver(dropZone, { dataTransfer: { items: [] } })
    fireEvent.dragLeave(dropZone)
    // No crash is the assertion
  })
})

// ─────────────────────────────────────────────────────────────────
// Panel — preloaded file
// ─────────────────────────────────────────────────────────────────
describe('Panel — preloadedFile prop', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders with a preloaded file without crashing', () => {
    const file = new File(['content'], 'preloaded.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('compress')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )
    expect(screen.getByText('preloaded.pdf')).toBeInTheDocument()
  })

  it('shows the compress level selector after a file is loaded', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('compress')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.compress_level)).toBeInTheDocument()
  })

  it('shows the pages range input for split tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('split')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )
    expect(screen.getByPlaceholderText(T_ES.pages_ph)).toBeInTheDocument()
  })

  it('shows watermark text input for watermark-pdf tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('watermark-pdf')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )
    // watermark text input should be visible
    expect(screen.getByDisplayValue('CONFIDENCIAL')).toBeInTheDocument()
  })

  it('shows rotation buttons for rotate tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('rotate')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )
    expect(screen.getByText('90°')).toBeInTheDocument()
    expect(screen.getByText('180°')).toBeInTheDocument()
    expect(screen.getByText('270°')).toBeInTheDocument()
  })
})
