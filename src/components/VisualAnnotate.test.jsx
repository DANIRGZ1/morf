/**
 * VisualAnnotate tests — covers render, mode switching, toolbar controls,
 * canvas mouse interactions, text prompt, and apply/download flow.
 *
 * renderPdfPage and applyEdits are mocked so no real PDF work is done.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── hoist mocks ───────────────────────────────────────────────────
const { mockRenderPdfPage, mockApplyEdits } = vi.hoisted(() => {
  const mockRenderPdfPage = vi.fn()
  const mockApplyEdits = vi.fn()
  return { mockRenderPdfPage, mockApplyEdits }
})

vi.mock('../utils/convert', () => ({
  renderPdfPage: mockRenderPdfPage,
  applyEdits: mockApplyEdits,
}))

import VisualAnnotate from './VisualAnnotate'

// ── helpers ───────────────────────────────────────────────────────
const makeFile = () => new File(['%PDF-1.4 content'], 'test.pdf', { type: 'application/pdf' })

const DEFAULT_RENDER = { pdfW: 595, pdfH: 842, scale: 1, numPages: 3 }

const setup = (props = {}) => {
  const showToast = vi.fn()
  const file = makeFile()
  const user = userEvent.setup()
  const result = render(
    <VisualAnnotate file={file} showToast={showToast} {...props} />
  )
  return { ...result, showToast, file, user }
}

// Mock canvas getBoundingClientRect and dimensions so toCanvas() works
function mockCanvasBCR(canvas) {
  canvas.getBoundingClientRect = vi.fn(() => ({
    left: 0, top: 0, width: 595, height: 842,
    right: 595, bottom: 842,
  }))
  Object.defineProperty(canvas, 'width',  { value: 595, writable: true, configurable: true })
  Object.defineProperty(canvas, 'height', { value: 842, writable: true, configurable: true })
}

// Set up mocks before each test and clear after
beforeEach(() => {
  vi.clearAllMocks()
  mockRenderPdfPage.mockResolvedValue(DEFAULT_RENDER)
  mockApplyEdits.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────
// Render & initial state
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — initial render', () => {
  it('renders without crashing', () => {
    setup()
  })

  it('shows the Texto (clic) mode button', () => {
    setup()
    expect(screen.getByText('Texto (clic)')).toBeInTheDocument()
  })

  it('shows the Redactar (arrastrar) mode button', () => {
    setup()
    expect(screen.getByText('Redactar (arrastrar)')).toBeInTheDocument()
  })

  it('shows page navigation with page 1', () => {
    setup()
    expect(screen.getByText(/1 \//)).toBeInTheDocument()
  })

  it('renders prev and next page buttons', () => {
    setup()
    expect(screen.getByText('‹')).toBeInTheDocument()
    expect(screen.getByText('›')).toBeInTheDocument()
  })

  it('shows text mode hint text', () => {
    setup()
    expect(screen.getByText(/Haz clic en el PDF/)).toBeInTheDocument()
  })

  it('shows font-size select in text mode', () => {
    setup()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('14pt')).toBeInTheDocument()
  })

  it('shows no apply button when no annotations added', () => {
    setup()
    expect(screen.queryByText(/Aplicar y descargar/)).not.toBeInTheDocument()
  })

  it('shows empty-state guidance text when no edits', () => {
    setup()
    expect(screen.getByText(/Añade anotaciones/)).toBeInTheDocument()
  })

  it('calls renderPdfPage on mount with file and page 1', async () => {
    setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalledWith(
      expect.any(File), 1, expect.anything()
    ))
  })
})

// ─────────────────────────────────────────────────────────────────
// Mode switching
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — mode switching', () => {
  it('switches to rect mode and shows redact hint', async () => {
    const { user } = setup()
    await user.click(screen.getByText('Redactar (arrastrar)'))
    expect(screen.getByText(/Arrastra sobre el PDF/)).toBeInTheDocument()
  })

  it('hides color/size controls in rect mode', async () => {
    const { user } = setup()
    await user.click(screen.getByText('Redactar (arrastrar)'))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('can switch back to text mode from rect mode', async () => {
    const { user } = setup()
    await user.click(screen.getByText('Redactar (arrastrar)'))
    await user.click(screen.getByText('Texto (clic)'))
    expect(screen.getByText(/Haz clic en el PDF/)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Text size select
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — text size select', () => {
  it('changes text size when a new size is selected', async () => {
    const { user } = setup()
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '24')
    expect(select.value).toBe('24')
  })

  it('renders size options 8 through 32', () => {
    setup()
    const select = screen.getByRole('combobox')
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual(expect.arrayContaining(['8', '10', '12', '14', '16', '20', '24', '32']))
  })
})

// ─────────────────────────────────────────────────────────────────
// Page navigation
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — page navigation', () => {
  it('prev button is disabled on page 1', () => {
    setup()
    expect(screen.getByText('‹').closest('button')).toBeDisabled()
  })

  it('next button is enabled when numPages > 1', async () => {
    setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())
    expect(screen.getByText('›').closest('button')).not.toBeDisabled()
  })

  it('clicking next increments page display', async () => {
    const { user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())
    await user.click(screen.getByText('›'))
    expect(screen.getByText(/2 \//)).toBeInTheDocument()
  })

  it('clicking prev after next returns to page 1', async () => {
    const { user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())
    await user.click(screen.getByText('›'))
    await user.click(screen.getByText('‹'))
    expect(screen.getByText(/1 \//)).toBeInTheDocument()
  })

  it('rerenders pdf when page changes', async () => {
    const { user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalledWith(
      expect.any(File), 1, expect.anything()
    ))
    vi.clearAllMocks()
    mockRenderPdfPage.mockResolvedValue(DEFAULT_RENDER)

    await user.click(screen.getByText('›'))
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalledWith(
      expect.any(File), 2, expect.anything()
    ))
  })
})

// ─────────────────────────────────────────────────────────────────
// Canvas mouse interactions — text mode
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — text prompt popup', () => {
  it('shows text prompt after mouseup in text mode', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    expect(screen.getByPlaceholderText('Texto…')).toBeInTheDocument()
  })

  it('pressing Escape on the prompt closes the popup', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    fireEvent.keyDown(screen.getByPlaceholderText('Texto…'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Texto…')).not.toBeInTheDocument()
  })

  it('pressing Enter with text adds annotation and closes popup', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    fireEvent.change(screen.getByPlaceholderText('Texto…'), { target: { value: 'Hello annotation' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Texto…'), { key: 'Enter' })

    expect(screen.queryByPlaceholderText('Texto…')).not.toBeInTheDocument()
  })

  it('clicking the ✓ button confirms text annotation', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    fireEvent.change(screen.getByPlaceholderText('Texto…'), { target: { value: 'My text' } })
    fireEvent.click(screen.getByText('✓'))

    expect(screen.queryByPlaceholderText('Texto…')).not.toBeInTheDocument()
  })

  it('clicking the ✕ button cancels the prompt', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByPlaceholderText('Texto…')).not.toBeInTheDocument()
  })

  it('empty text does not add annotation when Enter pressed', async () => {
    const { container } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 200 })
    fireEvent.keyDown(screen.getByPlaceholderText('Texto…'), { key: 'Enter' })
    // Popup stays open when no text entered
    expect(screen.getByPlaceholderText('Texto…')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Canvas mouse interactions — rect mode
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — rect / redact mode', () => {
  it('mouseDown in rect mode does not open text prompt', async () => {
    const { container, user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    await user.click(screen.getByText('Redactar (arrastrar)'))

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseDown(canvas.parentElement, { clientX: 10, clientY: 10 })
    expect(screen.queryByPlaceholderText('Texto…')).not.toBeInTheDocument()
  })

  it('drag creates a redact zone when width and height > 4px', async () => {
    const { container, user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    await user.click(screen.getByText('Redactar (arrastrar)'))

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)
    const wrapper = canvas.parentElement

    fireEvent.mouseDown(wrapper, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(wrapper, { clientX: 200, clientY: 200 })

    // After a valid drag, the apply button appears
    await waitFor(() => expect(screen.getByText(/Aplicar y descargar/)).toBeInTheDocument())
  })

  it('tiny drag (< 4px) does not create a redact zone', async () => {
    const { container, user } = setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())

    await user.click(screen.getByText('Redactar (arrastrar)'))

    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)
    const wrapper = canvas.parentElement

    fireEvent.mouseDown(wrapper, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(wrapper, { clientX: 12, clientY: 12 })
    fireEvent.mouseUp(wrapper, { clientX: 12, clientY: 12 })

    expect(screen.queryByText(/Aplicar y descargar/)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Edits summary and apply
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — edits summary', () => {
  const addTextAnnotation = async (container, text = 'Note') => {
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())
    const canvas = container.querySelector('canvas')
    mockCanvasBCR(canvas)

    fireEvent.mouseUp(canvas.parentElement, { clientX: 100, clientY: 100 })
    fireEvent.change(screen.getByPlaceholderText('Texto…'), { target: { value: text } })
    fireEvent.keyDown(screen.getByPlaceholderText('Texto…'), { key: 'Enter' })
  }

  it('shows apply button after adding a text annotation', async () => {
    const { container } = setup()
    await addTextAnnotation(container)
    expect(screen.getByText(/Aplicar y descargar/)).toBeInTheDocument()
  })

  it('shows annotation count in summary', async () => {
    const { container } = setup()
    await addTextAnnotation(container)
    expect(screen.getByText(/1 anotación/)).toBeInTheDocument()
  })

  it('shows annotation chip with page and text info', async () => {
    const { container } = setup()
    await addTextAnnotation(container, 'AnnotNote')
    // The chip renders "p.1: AnnotNote" inside a span
    expect(screen.getByText(/p\.1: AnnotNote/)).toBeInTheDocument()
  })

  it('can remove a text annotation chip', async () => {
    const { container } = setup()
    await addTextAnnotation(container)

    fireEvent.click(screen.getByText('×'))
    expect(screen.queryByText(/Aplicar y descargar/)).not.toBeInTheDocument()
  })

  it('calls applyEdits when apply button clicked', async () => {
    const { container } = setup()
    await addTextAnnotation(container)

    fireEvent.click(screen.getByText(/Aplicar y descargar/))
    await waitFor(() => expect(mockApplyEdits).toHaveBeenCalledOnce())
  })

  it('shows success toast after successful apply', async () => {
    const { container, showToast } = setup()
    await addTextAnnotation(container)

    fireEvent.click(screen.getByText(/Aplicar y descargar/))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('PDF editado descargado'))
  })

  it('shows error toast when applyEdits throws', async () => {
    mockApplyEdits.mockRejectedValue(new Error('write failed'))
    const { container, showToast } = setup()
    await addTextAnnotation(container)

    fireEvent.click(screen.getByText(/Aplicar y descargar/))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Error: write failed'))
  })
})

// ─────────────────────────────────────────────────────────────────
// renderPdfPage lifecycle
// ─────────────────────────────────────────────────────────────────
describe('VisualAnnotate — renderPdfPage lifecycle', () => {
  it('handles renderPdfPage rejection gracefully', async () => {
    mockRenderPdfPage.mockRejectedValue(new Error('pdf load failed'))
    setup()
    await waitFor(() => expect(mockRenderPdfPage).toHaveBeenCalled())
    // No crash
  })

  it('does not call renderPdfPage when no file provided', () => {
    render(<VisualAnnotate file={null} showToast={vi.fn()} />)
    expect(mockRenderPdfPage).not.toHaveBeenCalled()
  })
})
