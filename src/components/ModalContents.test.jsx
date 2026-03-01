/**
 * ModalContents — tests for Privacy, Terms, Contact, and API sub-components.
 * Each component consumes LangCtx, so we wrap them in a provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Privacy, Terms, Contact, API } from './ModalContents'
import { LangCtx, LANGS } from '../contexts/LangContext'

const T_ES = LANGS.es

const Wrapper = ({ children, lang = 'es' }) => (
  <LangCtx.Provider value={LANGS[lang]}>{children}</LangCtx.Provider>
)
const renderWithLang = (ui, lang = 'es') =>
  render(<Wrapper lang={lang}>{ui}</Wrapper>)

// ─────────────────────────────────────────────────────────────────
// Privacy
// ─────────────────────────────────────────────────────────────────
describe('Privacy', () => {
  it('renders the privacy chips', () => {
    renderWithLang(<Privacy />)
    T_ES.priv_chips.forEach(chip => {
      expect(screen.getByText(chip)).toBeInTheDocument()
    })
  })

  it('renders the "Qué datos procesamos" heading in Spanish', () => {
    renderWithLang(<Privacy />)
    expect(screen.getByText('Qué datos procesamos')).toBeInTheDocument()
  })

  it('renders in English when lang is "en"', () => {
    renderWithLang(<Privacy />, 'en')
    expect(screen.getByText('What data we process')).toBeInTheDocument()
  })

  it('renders in French when lang is "fr"', () => {
    renderWithLang(<Privacy />, 'fr')
    expect(screen.getByText('Données traitées')).toBeInTheDocument()
  })

  it('renders in German when lang is "de"', () => {
    renderWithLang(<Privacy />, 'de')
    expect(screen.getByText('Welche Daten wir verarbeiten')).toBeInTheDocument()
  })

  it('renders in Portuguese when lang is "pt"', () => {
    renderWithLang(<Privacy />, 'pt')
    expect(screen.getByText('Que dados processamos')).toBeInTheDocument()
  })

  it('contains a "Qué no recopilamos" section', () => {
    renderWithLang(<Privacy />)
    expect(screen.getByText('Qué no recopilamos')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Terms
// ─────────────────────────────────────────────────────────────────
describe('Terms', () => {
  it('renders the service-use heading in Spanish', () => {
    renderWithLang(<Terms />)
    expect(screen.getByText('1. Uso del servicio')).toBeInTheDocument()
  })

  it('renders in English', () => {
    renderWithLang(<Terms />, 'en')
    expect(screen.getByText('1. Use of the service')).toBeInTheDocument()
  })

  it('renders intellectual property section', () => {
    renderWithLang(<Terms />)
    expect(screen.getByText('2. Propiedad intelectual')).toBeInTheDocument()
  })

  it('renders the limitation of liability section', () => {
    renderWithLang(<Terms />)
    expect(screen.getByText('3. Limitación de responsabilidad')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Contact — labels are not associated via htmlFor, use placeholder
// ─────────────────────────────────────────────────────────────────
describe('Contact', () => {
  const showToast = vi.fn()
  const onClose   = vi.fn()

  beforeEach(() => { showToast.mockClear(); onClose.mockClear() })

  it('renders the name input', () => {
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)
    expect(screen.getByPlaceholderText(T_ES.con_name_ph)).toBeInTheDocument()
  })

  it('renders the email input', () => {
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)
    expect(screen.getByPlaceholderText(T_ES.con_email_ph)).toBeInTheDocument()
  })

  it('renders the message textarea', () => {
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)
    expect(screen.getByPlaceholderText(T_ES.con_msg_ph)).toBeInTheDocument()
  })

  it('calls showToast with an error when a required field is empty', async () => {
    const user = userEvent.setup()
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)
    await user.click(screen.getByText(T_ES.con_send))
    expect(showToast).toHaveBeenCalledWith(T_ES.con_required, 'err')
  })

  it('shows a success screen after filling all fields and sending', async () => {
    // The component uses setTimeout(1800) — real timers + longer waitFor timeout works fine
    const user = userEvent.setup()
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)

    await user.type(screen.getByPlaceholderText(T_ES.con_name_ph),  'Alice')
    await user.type(screen.getByPlaceholderText(T_ES.con_email_ph), 'alice@example.com')
    await user.type(screen.getByPlaceholderText(T_ES.con_msg_ph),   'Hello!')
    await user.click(screen.getByText(T_ES.con_send))

    await waitFor(
      () => expect(screen.getByText(T_ES.con_done_title)).toBeInTheDocument(),
      { timeout: 3000 }
    )
  }, 10000)

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderWithLang(<Contact showToast={showToast} onClose={onClose} />)
    await user.click(screen.getByText(T_ES.con_cancel))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ─────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────
describe('API', () => {
  beforeEach(() => {
    // clipboard.writeText is not available in jsdom — define it safely
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
        writable: true,
      })
    } else {
      vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    }
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders the beta notice', () => {
    renderWithLang(<API />)
    expect(screen.getByText(T_ES.api_beta)).toBeInTheDocument()
  })

  it('renders all API plan names', () => {
    renderWithLang(<API />)
    T_ES.api_plans.forEach(plan => {
      expect(screen.getByText(plan.t)).toBeInTheDocument()
    })
  })

  it('renders copy buttons', () => {
    renderWithLang(<API />)
    const copyBtns = screen.getAllByText(T_ES.api_copy)
    expect(copyBtns.length).toBeGreaterThan(0)
  })

  it('changes the copy button label to "✓ Copiado" after clicking', async () => {
    const user = userEvent.setup()
    renderWithLang(<API />)
    const [firstCopyBtn] = screen.getAllByText(T_ES.api_copy)
    await user.click(firstCopyBtn)
    expect(screen.getByText(T_ES.api_copied)).toBeInTheDocument()
  })

  it('renders the Endpoint heading', () => {
    renderWithLang(<API />)
    expect(screen.getByText('Endpoint')).toBeInTheDocument()
  })

  it('renders the JavaScript heading', () => {
    renderWithLang(<API />)
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
  })

  it('renders the Plans heading in Spanish', () => {
    renderWithLang(<API />)
    expect(screen.getByText('Planes')).toBeInTheDocument()
  })
})
