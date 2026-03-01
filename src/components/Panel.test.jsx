/**
 * Panel tests — covers TOOL_BASE, FilePreviewModal, DropboxImportButton,
 * GoogleDriveImportButton, FileRow, and the core Panel render.
 *
 * Heavy convert utilities and AI sub-components are mocked so the suite
 * stays fast and purely unit-level.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
import * as convert from '../utils/convert'

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

// ─────────────────────────────────────────────────────────────────
// Panel — convert flow (done state)
// ─────────────────────────────────────────────────────────────────
describe('Panel — convert flow', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('shows done state after successful pdf-word conversion', async () => {
    const user = userEvent.setup()
    convert.pdfToWord.mockResolvedValue(undefined)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('pdf-word')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.conv_done)).toBeInTheDocument())
  })

  it('shows done state after successful split conversion', async () => {
    const user = userEvent.setup()
    convert.splitPdf.mockResolvedValue(undefined)

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

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.conv_done)).toBeInTheDocument())
  })

  it('shows done state after successful merge conversion', async () => {
    const user = userEvent.setup()
    convert.mergePdfs.mockResolvedValue(undefined)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('merge')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.conv_done)).toBeInTheDocument())
  })

  it('shows done state after compress with compress result', async () => {
    const user = userEvent.setup()
    const mockBlob = new Blob(['x'.repeat(512)], { type: 'application/pdf' })
    convert.compressPdfToBlob.mockResolvedValue(mockBlob)

    const file = new File(['x'.repeat(1024)], 'test.pdf', { type: 'application/pdf' })
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

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.conv_done)).toBeInTheDocument())
  })

  it('shows error state after failed conversion', async () => {
    const user = userEvent.setup()
    convert.splitPdf.mockRejectedValue(new Error('PDF corrupted'))

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

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.err_title)).toBeInTheDocument())
  })

  it('retry button in error state returns to idle', async () => {
    const user = userEvent.setup()
    convert.splitPdf.mockRejectedValue(new Error('fail'))

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

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => screen.getByText(T_ES.err_retry))
    await user.click(screen.getByText(T_ES.err_retry))
    expect(screen.getByText(T_ES.convert)).toBeInTheDocument()
  })

  it('shows error state when file is too large', async () => {
    const user = userEvent.setup()

    // Create file > 200MB by faking the size
    const file = new File(['content'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 201 * 1024 * 1024, configurable: true })

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

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => expect(screen.getByText(T_ES.err_title)).toBeInTheDocument())
  })

  it('shows reconvert button in done state', async () => {
    const user = userEvent.setup()
    convert.pdfToWord.mockResolvedValue(undefined)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel
          tool={mkTool('pdf-word')}
          onClose={vi.fn()}
          showToast={vi.fn()}
          preloadedFile={file}
        />
      </Wrapper>
    )

    await user.click(screen.getByText(T_ES.convert))
    await waitFor(() => screen.getByText(T_ES.conv_done))
    expect(screen.getByText(T_ES.reconvert || 'Repetir conversión')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Panel — tool-specific UIs
// ─────────────────────────────────────────────────────────────────
describe('Panel — sign-pdf UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows signature pad for sign-pdf with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('sign-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getAllByText(/Dibuja tu firma/).length).toBeGreaterThan(0)
  })

  it('shows page options for sign-pdf', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('sign-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('Primera')).toBeInTheDocument()
    expect(screen.getByText('Última')).toBeInTheDocument()
    expect(screen.getByText('Todas')).toBeInTheDocument()
  })

  it('convert button is disabled without signature', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('sign-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.convert).closest('button')).toBeDisabled()
  })

  it('shows position arrow buttons for sign-pdf', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('sign-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    // Arrow buttons like ↖, ↗, etc.
    expect(screen.getByText('↖')).toBeInTheDocument()
    expect(screen.getByText('↘')).toBeInTheDocument()
  })
})

describe('Panel — crop-pdf UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows crop margin inputs for crop-pdf with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('crop-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.crop_label || 'Márgenes a recortar (mm)')).toBeInTheDocument()
  })
})

describe('Panel — annotate-pdf UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows annotation text input for annotate-pdf with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('annotate-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByPlaceholderText(T_ES.annot_text || 'Texto de la anotación…')).toBeInTheDocument()
  })

  it('convert is disabled without annotations', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('annotate-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.convert).closest('button')).toBeDisabled()
  })

  it('can add an annotation and it appears in the list', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('annotate-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )

    const input = screen.getByPlaceholderText(T_ES.annot_text || 'Texto de la anotación…')
    await user.type(input, 'My annotation text')
    await user.click(screen.getByText(T_ES.annot_add_btn || '+ Añadir'))

    expect(screen.getByText(/My annotation text/)).toBeInTheDocument()
  })
})

describe('Panel — redact-pdf UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows redact zone inputs for redact-pdf with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('redact-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.redact_add || 'Añadir zona de redacción (en % del tamaño de página)')).toBeInTheDocument()
  })

  it('can add a redact zone', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('redact-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )

    await user.click(screen.getByText(T_ES.redact_add_btn || '+ Añadir zona'))
    // A redact zone entry should appear
    expect(screen.getByText(/X:10%/)).toBeInTheDocument()
  })
})

describe('Panel — AI sub-component tools', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders ChatPdf for chat-pdf tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('chat-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('ChatPdf')).toBeInTheDocument()
  })

  it('renders VisualAnnotate for visual-annotate tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('visual-annotate')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('VisualAnnotate')).toBeInTheDocument()
  })

  it('renders SummarizePdf for summarize-pdf tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('summarize-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('SummarizePdf')).toBeInTheDocument()
  })

  it('renders ComparePdf for compare-pdf tool with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('compare-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('ComparePdf')).toBeInTheDocument()
  })

  it('does not show convert button for AI tools', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('chat-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.queryByText(T_ES.convert)).not.toBeInTheDocument()
  })
})

describe('Panel — ocr-pdf UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows language buttons for ocr-pdf with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('ocr-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('changing ocr language selects the button', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('ocr-pdf')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    await user.click(screen.getByText('Español'))
    // Español button should now be active (no crash)
    expect(screen.getByText('Español')).toBeInTheDocument()
  })
})

describe('Panel — delete-pages UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows pages input for delete-pages with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('delete-pages')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByPlaceholderText('1, 3, 5-7')).toBeInTheDocument()
  })
})

describe('Panel — coming soon tool', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders coming soon message for protect-pdf', () => {
    render(
      <Wrapper>
        <Panel tool={mkTool('protect-pdf')} onClose={vi.fn()} showToast={vi.fn()} />
      </Wrapper>
    )
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })

  it('shows cancel button for coming soon tool', () => {
    render(
      <Wrapper>
        <Panel tool={mkTool('protect-pdf')} onClose={vi.fn()} showToast={vi.fn()} />
      </Wrapper>
    )
    expect(screen.getByText(T_ES.cancel)).toBeInTheDocument()
  })
})

describe('Panel — file removal', () => {
  afterEach(() => vi.restoreAllMocks())

  it('remove button removes the file from the list', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'remove-me.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('compress')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )

    expect(screen.getByText('remove-me.pdf')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Eliminar remove-me.pdf'))
    expect(screen.queryByText('remove-me.pdf')).not.toBeInTheDocument()
  })
})

describe('Panel — compress quality buttons', () => {
  afterEach(() => vi.restoreAllMocks())

  it('can change compress quality to low', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('compress')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    await user.click(screen.getByText(T_ES.q_low))
    // No crash, button exists
    expect(screen.getByText(T_ES.q_low)).toBeInTheDocument()
  })

  it('can change compress quality to high', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('compress')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    await user.click(screen.getByText(T_ES.q_high))
    expect(screen.getByText(T_ES.q_high)).toBeInTheDocument()
  })
})

describe('Panel — ocr-searchable UI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows language dropdown for ocr-searchable with preloaded file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    render(
      <Wrapper>
        <Panel tool={mkTool('ocr-searchable')} onClose={vi.fn()} showToast={vi.fn()} preloadedFile={file} />
      </Wrapper>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
