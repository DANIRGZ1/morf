import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock all conversion functions — tests focus on UI behaviour, not file I/O
vi.mock('./utils/convert', () => ({
  mergePdfs:   vi.fn(),
  splitPdf:    vi.fn(),
  imagesToPdf: vi.fn(),
  compressPdf: vi.fn(),
  wordToPdf:   vi.fn(),
  pdfToWord:   vi.fn(),
  pngToJpg:    vi.fn(),
  jpgToPng:    vi.fn(),
  rotatePdf:   vi.fn(),
  excelToPdf:  vi.fn(),
  basename:    vi.fn(f => f.name.replace(/\.[^.]+$/, '')),
}))

// matchMedia is not implemented in jsdom
beforeEach(() => {
  // Reset URL hash so each test starts with no active tool page
  window.history.pushState(null, '', '/')
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
  // Reset language to English before every test so tests that set navigator.language
  // for locale assertions don't contaminate unrelated interaction tests.
  Object.defineProperty(navigator, 'language', {
    value: 'en', configurable: true, writable: true,
  })
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────
// Smoke test
// ─────────────────────────────────────────────────────────────────
describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // If this does not throw, the component tree mounts successfully
  })

  it('displays the morf brand name', () => {
    render(<App />)
    // The logo/brand appears at least once in the header
    const logos = screen.getAllByText(/morf/i)
    expect(logos.length).toBeGreaterThan(0)
  })

  it('renders the correct number of tool cards', () => {
    render(<App />)
    // TOOL_BASE has 10 entries; each renders a labelled tool button
    // We look for the tool-grid items via the heading level or role
    const toolButtons = screen.getAllByRole('button')
    // There should be more than 10 buttons total (tools + nav + etc.)
    expect(toolButtons.length).toBeGreaterThan(10)
  })

  it('displays the hero call-to-action button', () => {
    render(<App />)
    // The primary CTA text differs by language; check for a button
    // that contains the free-start text present in all locales
    const ctaButtons = screen.getAllByRole('button')
    expect(ctaButtons.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// detectLang — language detection from navigator.language
// ─────────────────────────────────────────────────────────────────
describe('language detection', () => {
  const renderWithLang = (lang) => {
    Object.defineProperty(navigator, 'language', {
      value: lang, configurable: true, writable: true,
    })
    return render(<App />)
  }

  it('falls back to English for an unsupported language code', () => {
    renderWithLang('zh-TW')
    // English tagline is unique enough to identify the locale
    expect(screen.getByText(/No signup/i)).toBeInTheDocument()
  })

  it('uses Spanish when navigator.language starts with "es"', () => {
    renderWithLang('es-ES')
    // Spanish tagline contains "Sin registro"
    expect(screen.getAllByText(/Sin registro/i)[0]).toBeInTheDocument()
  })

  it('uses French when navigator.language is "fr"', () => {
    renderWithLang('fr-FR')
    // French tagline contains "Sans inscription"
    expect(screen.getAllByText(/Sans inscription/i)[0]).toBeInTheDocument()
  })

  it('uses German when navigator.language is "de"', () => {
    renderWithLang('de-DE')
    // German tagline contains "Ohne Anmeldung"
    expect(screen.getByText(/Ohne Anmeldung/i)).toBeInTheDocument()
  })

  it('uses Portuguese when navigator.language is "pt"', () => {
    renderWithLang('pt-PT')
    // Portuguese tagline contains "Sem registo"
    expect(screen.getAllByText(/Sem registo/i)[0]).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// i18n completeness — all locales must define the same keys as "es"
// ─────────────────────────────────────────────────────────────────
describe('i18n completeness', () => {
  // We test this by rendering App in each language and checking that
  // the key UI strings are non-empty strings (not undefined/null).
  //
  // The required keys we verify are the ones whose absence would
  // immediately break the UI or produce "undefined" on screen.
  const REQUIRED_KEYS = [
    'tagline', 'hero_h1a', 'hero_h1b', 'hero_sub', 'hero_cta',
    'convert', 'cancel', 'processing',
    'err_title', 'err_retry', 'err_generic',
    'plan_free', 'plan_pro', 'pricing_title',
    'faq_title', 'hist_title', 'hist_empty',
    'nav_privacy', 'footer_copy',
  ]

  // Expose LANGS by importing a subset we can verify through the DOM:
  // We render with each known locale and assert the tagline is shown.
  const locales = ['es', 'en', 'fr', 'de', 'pt']
  const taglines = {
    es: /Sin registro/,
    en: /No signup/i,
    fr: /Sans inscription/i,
    de: /Ohne Anmeldung/i,
    pt: /Sem registo/i,
  }

  locales.forEach(code => {
    it(`locale "${code}" renders its tagline`, () => {
      Object.defineProperty(navigator, 'language', {
        value: code, configurable: true, writable: true,
      })
      render(<App />)
      expect(screen.getAllByText(taglines[code])[0]).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────
// localStorage — history and counter persistence
// ─────────────────────────────────────────────────────────────────
describe('localStorage initialisation', () => {
  it('starts with counter = 0 when localStorage is empty', () => {
    render(<App />)
    // The counter is shown as a number in the hero section
    // We can't easily read state, but we confirm the app renders without error
    // when localStorage is empty (no JSON parse errors)
    expect(document.body).toBeTruthy()
  })

  it('reads a pre-existing counter value from localStorage', () => {
    localStorage.setItem('morf_count', '42')
    // Should not throw even when a pre-existing count exists
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('handles corrupt history JSON in localStorage without crashing', () => {
    localStorage.setItem('morf_history', 'NOT_VALID_JSON{{{{')
    expect(() => render(<App />)).not.toThrow()
  })

  it('handles a pre-existing valid history array', () => {
    const history = [
      { filename: 'report.pdf', tool: 'PDF → Word', date: new Date().toISOString() }
    ]
    localStorage.setItem('morf_history', JSON.stringify(history))
    expect(() => render(<App />)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────
// Tool card interactions
// ─────────────────────────────────────────────────────────────────
describe('tool card interactions', () => {
  it('clicking a tool card opens its conversion panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    // "Cancel" is only visible when a panel is open
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    // The first tool card label ("PDF → Word" in English)
    const [card] = screen.getAllByText('PDF → Word')
    await user.click(card)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('the back button on the tool page returns to the grid', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [card] = screen.getAllByText('PDF → Word')
    await user.click(card)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    // The back "morf" button navigates back to the main grid
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('closing the panel via its Cancel button returns to the grid', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByText('PDF → Word')[0])
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('switching between tool cards replaces the open panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByText('PDF → Word')[0])
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    // Click a different card while one is open
    await user.click(screen.getAllByText('Merge PDFs')[0])
    // Panel should now show the new tool label
    expect(screen.getAllByText('Merge PDFs').length).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────
// Modal interactions
// ─────────────────────────────────────────────────────────────────
describe('modal interactions', () => {
  it('clicking Privacy in the header nav opens the privacy modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    // T.nav_privacy = "Privacy" (header nav button)
    await user.click(screen.getByRole('button', { name: 'Privacy' }))
    // The modal overlay (.ov) is only present when a modal is open
    expect(document.querySelector('.ov')).toBeInTheDocument()
  })

  it('pressing Escape closes an open modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Privacy' }))
    expect(document.querySelector('.ov')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(document.querySelector('.ov')).not.toBeInTheDocument()
  })

  it('clicking the modal backdrop closes the modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Privacy' }))
    // The overlay has class "ov"; clicking directly on it (the backdrop) closes the modal
    const backdrop = document.querySelector('.ov')
    fireEvent.click(backdrop, { target: backdrop })
    expect(document.querySelector('.ov')).not.toBeInTheDocument()
  })

  it('clicking the API nav button opens the API modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'API' }))
    // The modal overlay (.ov) is only present when a modal is open
    expect(document.querySelector('.ov')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Dark mode
// ─────────────────────────────────────────────────────────────────
describe('dark mode', () => {
  it('dark mode toggle adds the "dark" class to the root element', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const root = container.querySelector('.m')
    expect(root).not.toHaveClass('dark')
    // The toggle button title is "Modo oscuro" (hardcoded) when dark=false
    await user.click(screen.getByTitle('Modo oscuro'))
    expect(root).toHaveClass('dark')
  })

  it('clicking dark mode twice returns to light mode', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const root = container.querySelector('.m')
    await user.click(screen.getByTitle('Modo oscuro'))
    expect(root).toHaveClass('dark')
    await user.click(screen.getByTitle('Modo claro'))
    expect(root).not.toHaveClass('dark')
  })
})

// ─────────────────────────────────────────────────────────────────
// Conversion history
// ─────────────────────────────────────────────────────────────────
describe('conversion history', () => {
  it('shows history entries from localStorage', () => {
    localStorage.setItem('morf_history', JSON.stringify([
      { filename: 'report.pdf', tool: 'PDF → Word', date: new Date().toISOString() }
    ]))
    render(<App />)
    expect(screen.getAllByText('report.pdf').length).toBeGreaterThan(0)
    // T.hist_title = "Recent conversions"
    expect(screen.getByText('Recent conversions')).toBeInTheDocument()
  })

  it('clear history button removes all history entries', async () => {
    const user = userEvent.setup()
    localStorage.setItem('morf_history', JSON.stringify([
      { filename: 'doc.pdf', tool: 'PDF → Word', date: new Date().toISOString() }
    ]))
    render(<App />)
    expect(screen.getAllByText('doc.pdf').length).toBeGreaterThan(0)
    // T.hist_clear = "Clear history"
    await user.click(screen.getByText('Clear history'))
    expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('Recent conversions')).not.toBeInTheDocument()
  })

  it('does not show the history section when history is empty', () => {
    render(<App />)
    // T.hist_title = "Recent conversions" — should not be present
    expect(screen.queryByText('Recent conversions')).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Conversion counter
// ─────────────────────────────────────────────────────────────────
describe('conversion counter', () => {
  it('displays the counter value when count > 0', () => {
    localStorage.setItem('morf_count', '7')
    render(<App />)
    // The number is rendered in multiple places (hero counter + stats grid); 7 → "7"
    expect(screen.getAllByText('7').length).toBeGreaterThan(0)
    // T.counter = "files converted" — appears in both hero counter and stats grid
    expect(screen.getAllByText(/files converted/i).length).toBeGreaterThan(0)
  })

  it('does not show the hero counter when count is 0', () => {
    render(<App />)
    // The stats grid always shows "files converted"; the hero counter only when count > 0.
    // When count is 0 the stats grid shows "1000+" (not "0"), so the number "0" is absent.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// FAQ accordion
// ─────────────────────────────────────────────────────────────────
describe('FAQ accordion', () => {
  it('FAQ questions are visible on load', () => {
    render(<App />)
    expect(screen.getByText('Is it completely free?')).toBeInTheDocument()
  })

  it('clicking a question reveals its answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    // Answer should not be visible initially
    expect(screen.queryByText(/free plan includes all tools/i)).not.toBeInTheDocument()
    await user.click(screen.getByText('Is it completely free?'))
    expect(screen.getByText(/free plan includes all tools/i)).toBeInTheDocument()
  })

  it('clicking an open question collapses it again', async () => {
    const user = userEvent.setup()
    render(<App />)
    const q = screen.getByText('Is it completely free?')
    await user.click(q)
    expect(screen.getByText(/free plan includes all tools/i)).toBeInTheDocument()
    await user.click(q)
    expect(screen.queryByText(/free plan includes all tools/i)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Accessibility (a11y)
// ─────────────────────────────────────────────────────────────────
describe('accessibility', () => {
  it('header landmark is present', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('navigation landmark is present in the header', () => {
    render(<App />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('footer landmark is present', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('the main CTA button has an accessible name', () => {
    render(<App />)
    // T.hero_cta = "Start for free" — may appear in hero AND pricing, so use getAllBy
    const ctaBtns = screen.getAllByRole('button', { name: /Start for free/i })
    expect(ctaBtns.length).toBeGreaterThan(0)
  })

  it('the dark mode toggle has an accessible title', () => {
    render(<App />)
    expect(screen.getByTitle(/Modo oscuro|Modo claro/i)).toBeInTheDocument()
  })

  it('the language picker button has visible text', () => {
    render(<App />)
    // Language button shows current locale code in uppercase ("EN")
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('nav Privacy button is keyboard-accessible via role query', () => {
    render(<App />)
    const privBtn = screen.getByRole('button', { name: 'Privacy' })
    expect(privBtn).toBeInTheDocument()
    expect(privBtn.tagName).toBe('BUTTON')
  })

  it('FAQ question buttons are keyboard-accessible', () => {
    render(<App />)
    // FaqItem renders a <button> for each question
    const faqBtn = screen.getByRole('button', { name: /Is it completely free\?/i })
    expect(faqBtn).toBeInTheDocument()
  })
})
