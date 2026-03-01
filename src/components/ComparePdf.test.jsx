/**
 * ComparePdf tests — covers render, file upload, comparison flow,
 * diff view, identical PDFs, and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── mock extractPdfPages ──────────────────────────────────────────
const { mockExtractPdfPages } = vi.hoisted(() => {
  const mockExtractPdfPages = vi.fn()
  return { mockExtractPdfPages }
})

vi.mock('../utils/convert', () => ({
  extractPdfPages: mockExtractPdfPages,
}))

import ComparePdf from './ComparePdf'

const makeFile = (name = 'doc.pdf') =>
  new File(['pdf content'], name, { type: 'application/pdf' })

beforeEach(() => {
  mockExtractPdfPages.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────
// Initial render
// ─────────────────────────────────────────────────────────────────
describe('ComparePdf — initial render', () => {
  it('shows the "Segundo PDF" label', () => {
    render(<ComparePdf file={makeFile()} />)
    expect(screen.getByText(/Segundo PDF para comparar/)).toBeInTheDocument()
  })

  it('shows the drop zone text', () => {
    render(<ComparePdf file={makeFile()} />)
    expect(screen.getByText(/Arrastra aquí el segundo PDF/)).toBeInTheDocument()
  })

  it('renders the Compare button', () => {
    render(<ComparePdf file={makeFile()} />)
    expect(screen.getByText('⇄ Comparar PDFs')).toBeInTheDocument()
  })

  it('Compare button is disabled when no second file', () => {
    render(<ComparePdf file={makeFile()} />)
    expect(screen.getByText('⇄ Comparar PDFs')).toBeDisabled()
  })
})

// ─────────────────────────────────────────────────────────────────
// File upload
// ─────────────────────────────────────────────────────────────────
describe('ComparePdf — file upload', () => {
  it('shows the second file name after input change', async () => {
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile('first.pdf')} />)

    const input = document.querySelector('input[type="file"]')
    const file2 = makeFile('second.pdf')
    await user.upload(input, file2)

    expect(screen.getByText('second.pdf')).toBeInTheDocument()
  })

  it('enables Compare button after uploading second file', async () => {
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile()} />)

    const input = document.querySelector('input[type="file"]')
    await user.upload(input, makeFile('second.pdf'))

    expect(screen.getByText('⇄ Comparar PDFs')).not.toBeDisabled()
  })

  it('shows remove button after file2 is selected', async () => {
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile()} />)

    const input = document.querySelector('input[type="file"]')
    await user.upload(input, makeFile('second.pdf'))

    // Remove button is the × character
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('removes file2 when × is clicked', async () => {
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile()} />)

    const input = document.querySelector('input[type="file"]')
    await user.upload(input, makeFile('second.pdf'))

    await user.click(screen.getByText('×'))
    // Drop zone text returns
    expect(screen.getByText(/Arrastra aquí el segundo PDF/)).toBeInTheDocument()
  })

  it('accepts file via drag and drop', () => {
    render(<ComparePdf file={makeFile()} />)
    const label = screen.getByText(/Arrastra aquí el segundo PDF/).closest('label')

    const file2 = makeFile('dropped.pdf')
    fireEvent.drop(label, {
      dataTransfer: { files: [file2] },
    })

    expect(screen.getByText('dropped.pdf')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Comparison — successful
// ─────────────────────────────────────────────────────────────────
describe('ComparePdf — comparison', () => {
  beforeEach(() => {
    mockExtractPdfPages.mockResolvedValue(['Hello world foo', 'Page two text'])
  })

  const setupWithFile2 = async () => {
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile('first.pdf')} />)
    const input = document.querySelector('input[type="file"]')
    await user.upload(input, makeFile('second.pdf'))
    return user
  }

  it('calls extractPdfPages for both files', async () => {
    const user = await setupWithFile2()
    await user.click(screen.getByText('⇄ Comparar PDFs'))
    await waitFor(() => expect(mockExtractPdfPages).toHaveBeenCalledTimes(2))
  })

  it('shows diff results after comparison', async () => {
    const user = await setupWithFile2()
    await user.click(screen.getByText('⇄ Comparar PDFs'))
    await waitFor(() => screen.getByText(/palabras añadidas/))
    expect(screen.getByText(/palabras añadidas/)).toBeInTheDocument()
  })

  it('shows "Los documentos son idénticos" when content is the same', async () => {
    const text = 'identical content'
    mockExtractPdfPages.mockResolvedValue([text])
    const user = await setupWithFile2()
    await user.click(screen.getByText('⇄ Comparar PDFs'))
    await waitFor(() => screen.getByText(/Los documentos son idénticos/))
    expect(screen.getByText(/Los documentos son idénticos/)).toBeInTheDocument()
  })

  it('shows total added and removed word counts', async () => {
    // first.pdf has "Hello world", second.pdf has "Hello universe" → 1 removed, 1 added
    mockExtractPdfPages
      .mockResolvedValueOnce(['Hello world'])
      .mockResolvedValueOnce(['Hello universe'])

    const user = await setupWithFile2()
    await user.click(screen.getByText('⇄ Comparar PDFs'))

    await waitFor(() => screen.getByText(/palabras añadidas/))
    expect(screen.getByText(/palabras añadidas/)).toBeInTheDocument()
    expect(screen.getByText(/palabras eliminadas/)).toBeInTheDocument()
  })

  it('shows page navigation buttons when there are multiple pages', async () => {
    mockExtractPdfPages
      .mockResolvedValueOnce(['Page one text', 'Page two different'])
      .mockResolvedValueOnce(['Page one text', 'Page two other content'])

    const user = await setupWithFile2()
    await user.click(screen.getByText('⇄ Comparar PDFs'))

    // Page nav buttons are "p.1", "p.2 ●" etc. (● when page has diff)
    await waitFor(() => screen.getByText('p.1'))
    expect(screen.getByText('p.1')).toBeInTheDocument()
    expect(screen.getByText(/^p\.2/)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────
describe('ComparePdf — error handling', () => {
  it('shows error message when extractPdfPages throws', async () => {
    mockExtractPdfPages.mockRejectedValue(new Error('Failed to parse PDF'))
    const user = userEvent.setup()
    render(<ComparePdf file={makeFile()} />)
    const input = document.querySelector('input[type="file"]')
    await user.upload(input, makeFile('second.pdf'))
    await user.click(screen.getByText('⇄ Comparar PDFs'))

    await waitFor(() => screen.getByText(/Failed to parse PDF/))
    expect(screen.getByText(/Failed to parse PDF/)).toBeInTheDocument()
  })
})
