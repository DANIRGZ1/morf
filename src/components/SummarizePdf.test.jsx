/**
 * SummarizePdf tests — covers render states, API key input,
 * language selector, summarize flow, and error handling.
 *
 * Key component details:
 *  - Button text: "✦ Resumir con IA" (idle), "Extrayendo texto…" (extracting), "Resumiendo…" (loading)
 *  - Language select: options "Resumen en español" / "Summary in English"
 *  - Summary markdown is rendered with renderSummary() helper
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── mock extractPdfText ───────────────────────────────────────────
const { mockExtractPdfText } = vi.hoisted(() => {
  const mockExtractPdfText = vi.fn()
  return { mockExtractPdfText }
})

vi.mock('../utils/convert', () => ({
  extractPdfText: mockExtractPdfText,
}))

import SummarizePdf from './SummarizePdf'

const makeFile = () => new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' })

beforeEach(() => {
  mockExtractPdfText.mockReset()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────────
// Extracting state
// ─────────────────────────────────────────────────────────────────
describe('SummarizePdf — extracting state', () => {
  it('shows "Extrayendo texto…" inside the button while extracting', () => {
    mockExtractPdfText.mockReturnValue(new Promise(() => {}))
    render(<SummarizePdf file={makeFile()} />)
    // Button shows "Extrayendo texto…" when extracting=true
    expect(screen.getByText(/Extrayendo texto/)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// After extraction
// ─────────────────────────────────────────────────────────────────
describe('SummarizePdf — after extraction', () => {
  beforeEach(() => {
    mockExtractPdfText.mockResolvedValue('This is a long PDF text.')
  })

  it('renders the API key input', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('sk-ant-api03-…')).toBeInTheDocument()
  })

  it('renders the language selector with Spanish option', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByText('Resumen en español')).toBeInTheDocument()
  })

  it('renders the language selector with English option', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByText('Summary in English')).toBeInTheDocument()
  })

  it('renders the Resumir button ("✦ Resumir con IA")', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByText(/Resumir con IA/))
    expect(screen.getByText(/Resumir con IA/)).toBeInTheDocument()
  })

  it('Resumir button is disabled without API key', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByRole('button', { name: /Resumir con IA/i }))
    expect(screen.getByRole('button', { name: /Resumir con IA/i })).toBeDisabled()
  })

  it('shows Anthropic key hint', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByText(/console\.anthropic\.com/)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// With API key
// ─────────────────────────────────────────────────────────────────
describe('SummarizePdf — with API key', () => {
  beforeEach(() => {
    localStorage.setItem('morf_anthropic_key', 'sk-ant-test-key')
    mockExtractPdfText.mockResolvedValue('Long document text here for testing purposes')
  })

  it('Resumir button is enabled when API key is set', async () => {
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByRole('button', { name: /Resumir con IA/i }))
    expect(screen.getByRole('button', { name: /Resumir con IA/i })).not.toBeDisabled()
  })

  it('shows "Resumiendo…" loading state while request is pending', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByRole('button', { name: /Resumir con IA/i }))
    await user.click(screen.getByRole('button', { name: /Resumir con IA/i }))

    expect(screen.getByText(/Resumiendo/)).toBeInTheDocument()
  })

  it('shows summary content after successful fetch', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: '## Resumen ejecutivo\n\nEste documento trata de X.' }],
      }),
    }))

    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByRole('button', { name: /Resumir con IA/i }))
    await user.click(screen.getByRole('button', { name: /Resumir con IA/i }))

    await waitFor(() => screen.getByText(/Resumen ejecutivo/))
    expect(screen.getByText(/Resumen ejecutivo/)).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    }))

    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByRole('button', { name: /Resumir con IA/i }))
    await user.click(screen.getByRole('button', { name: /Resumir con IA/i }))

    await waitFor(() => screen.getByText(/Rate limit exceeded/))
    expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument()
  })

  it('language select changes to English', async () => {
    const user = userEvent.setup()
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'en')
    expect(select.value).toBe('en')
  })
})

// ─────────────────────────────────────────────────────────────────
// Extraction error
// ─────────────────────────────────────────────────────────────────
describe('SummarizePdf — extraction error', () => {
  it('shows error when extractPdfText rejects', async () => {
    mockExtractPdfText.mockRejectedValue(new Error('PDF corrupted'))
    render(<SummarizePdf file={makeFile()} />)
    await waitFor(() => screen.getByText(/Error al extraer el texto del PDF/))
    expect(screen.getByText(/Error al extraer el texto del PDF/)).toBeInTheDocument()
  })
})
