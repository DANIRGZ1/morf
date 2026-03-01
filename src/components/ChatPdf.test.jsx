/**
 * ChatPdf tests — covers render states, API key input, send flow,
 * error handling, and clear chat.
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

import ChatPdf from './ChatPdf'

const makeFile = () => new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })

beforeEach(() => {
  mockExtractPdfText.mockReset()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────
// Render — extracting state
// ─────────────────────────────────────────────────────────────────
describe('ChatPdf — extracting state', () => {
  it('shows "Extrayendo texto del PDF…" while extracting', async () => {
    // Don't resolve — keeps extracting = true
    mockExtractPdfText.mockReturnValue(new Promise(() => {}))
    render(<ChatPdf file={makeFile()} />)
    expect(screen.getByText(/Extrayendo texto del PDF/)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Render — after extraction done
// ─────────────────────────────────────────────────────────────────
describe('ChatPdf — after extraction', () => {
  beforeEach(() => {
    mockExtractPdfText.mockResolvedValue('PDF text content here')
  })

  it('renders the API key input', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('sk-ant-api03-…')).toBeInTheDocument()
  })

  it('shows "Introduce tu clave de API" when no API key', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByText(/Introduce tu clave de API para empezar/))
    expect(screen.getByText(/Introduce tu clave de API para empezar/)).toBeInTheDocument()
  })

  it('shows the console.anthropic.com hint when no API key', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    expect(screen.getByText(/console\.anthropic\.com/)).toBeInTheDocument()
  })

  it('toggles API key visibility with Ver/Ocultar button', async () => {
    const user = userEvent.setup()
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('sk-ant-api03-…')
    expect(input.type).toBe('password')

    await user.click(screen.getByText('Ver'))
    expect(input.type).toBe('text')

    await user.click(screen.getByText('Ocultar'))
    expect(input.type).toBe('password')
  })

  it('saves API key to localStorage on input', async () => {
    const user = userEvent.setup()
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('sk-ant-api03-…')
    await user.type(input, 'sk-ant-test-key')
    expect(localStorage.getItem('morf_anthropic_key')).toBe('sk-ant-test-key')
  })

  it('disables the send button when input is empty', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    const sendBtn = screen.getByText('Enviar')
    expect(sendBtn).toBeDisabled()
  })

  it('input is disabled without API key', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => expect(mockExtractPdfText).toHaveBeenCalled())
    const chatInput = screen.getByPlaceholderText(/Introduce tu clave API primero/)
    expect(chatInput).toBeDisabled()
  })
})

// ─────────────────────────────────────────────────────────────────
// Render — with API key loaded from localStorage
// ─────────────────────────────────────────────────────────────────
describe('ChatPdf — with API key', () => {
  beforeEach(() => {
    localStorage.setItem('morf_anthropic_key', 'sk-ant-test-key')
    mockExtractPdfText.mockResolvedValue('Some PDF text content')
  })

  it('shows the "ask question" prompt when key is set and extraction done', async () => {
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByText(/Haz cualquier pregunta/))
    expect(screen.getByText(/Haz cualquier pregunta/)).toBeInTheDocument()
  })

  it('enables send button when there is text in the input', async () => {
    const user = userEvent.setup()
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    const input = screen.getByPlaceholderText(/Escribe una pregunta/)
    await user.type(input, '¿Qué dice el documento?')
    expect(screen.getByText('Enviar')).not.toBeDisabled()
  })

  it('sends a message on clicking Enviar and shows it in chat', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Respuesta del asistente' }] }),
    }))

    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    const input = screen.getByPlaceholderText(/Escribe una pregunta/)
    await user.type(input, 'Resumen')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => screen.getByText('Resumen'))
    expect(screen.getByText('Resumen')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('shows assistant response after successful fetch', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Aquí está el resumen.' }] }),
    }))

    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    await user.type(screen.getByPlaceholderText(/Escribe una pregunta/), 'Resume')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => screen.getByText('Aquí está el resumen.'))
    expect(screen.getByText('Aquí está el resumen.')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('shows error message when fetch fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    }))

    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    await user.type(screen.getByPlaceholderText(/Escribe una pregunta/), 'Test')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => screen.getByText(/Invalid API key/))
    expect(screen.getByText(/Invalid API key/)).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('shows Limpiar chat button after receiving a message', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Response' }] }),
    }))

    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    await user.type(screen.getByPlaceholderText(/Escribe una pregunta/), 'Question')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => screen.getByText('Limpiar chat'))
    expect(screen.getByText('Limpiar chat')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('clears messages when Limpiar chat is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'Answer' }] }),
    }))

    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByPlaceholderText(/Escribe una pregunta/))

    await user.type(screen.getByPlaceholderText(/Escribe una pregunta/), 'Hi')
    await user.click(screen.getByText('Enviar'))
    await waitFor(() => screen.getByText('Limpiar chat'))

    await user.click(screen.getByText('Limpiar chat'))
    // After clearing, messages list is empty, so "Haz cualquier pregunta" prompt returns
    await waitFor(() => screen.getByText(/Haz cualquier pregunta/))
    expect(screen.getByText(/Haz cualquier pregunta/)).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})

// ─────────────────────────────────────────────────────────────────
// Extraction error
// ─────────────────────────────────────────────────────────────────
describe('ChatPdf — extraction error', () => {
  it('shows error message when extractPdfText rejects', async () => {
    mockExtractPdfText.mockRejectedValue(new Error('PDF parse failed'))
    render(<ChatPdf file={makeFile()} />)
    await waitFor(() => screen.getByText(/Error al extraer el texto del PDF/))
    expect(screen.getByText(/Error al extraer el texto del PDF/)).toBeInTheDocument()
  })
})
