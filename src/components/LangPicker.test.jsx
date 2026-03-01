import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LangPicker from './LangPicker'
import { LANGS } from '../contexts/LangContext'

const setLang = vi.fn()

// Helper — render with a given active lang
const setup = (lang = 'es') => {
  const user = userEvent.setup()
  render(<LangPicker lang={lang} setLang={setLang} />)
  return { user }
}

beforeEach(() => setLang.mockClear())

describe('LangPicker', () => {
  it('shows the current language flag and code', () => {
    setup('es')
    expect(screen.getByText('ES')).toBeInTheDocument()
    expect(screen.getByText(LANGS.es.flag)).toBeInTheDocument()
  })

  it('dropdown is initially closed', () => {
    setup('es')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('clicking the button opens the dropdown', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('dropdown lists all available languages', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(Object.keys(LANGS).length)
  })

  it('clicking a language calls setLang with that code', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    await user.click(screen.getByRole('option', { name: /English/i }))
    expect(setLang).toHaveBeenCalledWith('en')
  })

  it('selecting a language closes the dropdown', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    await user.click(screen.getByRole('option', { name: /English/i }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('the current language option has aria-selected=true', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    const selected = screen.getAllByRole('option').find(o => o.getAttribute('aria-selected') === 'true')
    expect(selected).toBeTruthy()
  })

  it('clicking outside the picker closes the dropdown', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Simulate mousedown outside the component
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('clicking the toggle button again closes the dropdown', async () => {
    const { user } = setup('es')
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    await user.click(screen.getByRole('button', { name: /Idioma:/i }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
