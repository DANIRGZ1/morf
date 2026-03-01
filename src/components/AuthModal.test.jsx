/**
 * AuthModal — tests for the sign-in form and its state transitions.
 * Supabase and useAuth are mocked so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthModal from './AuthModal'

// ── Mock useAuth so we control signIn ────────────────────────────────────────
const mockSignIn = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: mockSignIn, user: null, loading: false, signOut: vi.fn() }),
}))

// ── Mock supabase so the "no supabase" branch is NOT rendered ────────────────
vi.mock('../lib/supabase', () => ({
  supabase: { auth: {} }, // truthy → renders the form
}))

const onClose = vi.fn()
// The email input has placeholder="tu@correo.com"
const EMAIL_PLACEHOLDER = 'tu@correo.com'

const setup = () => {
  const user = userEvent.setup()
  render(<AuthModal onClose={onClose} />)
  return { user, emailInput: () => screen.getByPlaceholderText(EMAIL_PLACEHOLDER) }
}

beforeEach(() => {
  mockSignIn.mockReset()
  onClose.mockClear()
  mockSignIn.mockResolvedValue({ error: null })
})

describe('AuthModal — initial render', () => {
  it('renders the email input', () => {
    const { emailInput } = setup()
    expect(emailInput()).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    setup()
    expect(screen.getByRole('button', { name: /enlace mágico/i })).toBeInTheDocument()
  })

  it('renders the close button', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('does not show a confirmation message initially', () => {
    setup()
    expect(screen.queryByText(/revisa tu correo/i)).not.toBeInTheDocument()
  })
})

describe('AuthModal — form submission', () => {
  it('calls signIn with the typed email', async () => {
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'hello@world.com')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('hello@world.com'))
  })

  it('shows the confirmation screen on success', async () => {
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'ok@ok.com')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() =>
      expect(screen.getByText(/revisa tu correo/i)).toBeInTheDocument()
    )
  })

  it('displays the submitted email in the confirmation message', async () => {
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() => expect(screen.getByText('test@test.com')).toBeInTheDocument())
  })

  it('does nothing when the email input is empty (whitespace)', async () => {
    const { user, emailInput } = setup()
    await user.type(emailInput(), '   ')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})

describe('AuthModal — error handling', () => {
  it('shows a rate-limit message for "too many" errors', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('too many requests') })
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'a@b.com')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() =>
      expect(screen.getByText(/demasiados intentos/i)).toBeInTheDocument()
    )
  })

  it('shows an invalid-email message for "invalid email" errors', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('invalid email') })
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'a@b.com') // must be valid email format to pass HTML5 validation
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() =>
      expect(screen.getByText(/no es válido/i)).toBeInTheDocument()
    )
  })

  it('shows a generic error for unexpected failures', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('something else') })
    const { user, emailInput } = setup()
    await user.type(emailInput(), 'a@b.com')
    await user.click(screen.getByRole('button', { name: /enlace mágico/i }))
    await waitFor(() =>
      expect(screen.getByText(/inténtalo de nuevo/i)).toBeInTheDocument()
    )
  })
})

describe('AuthModal — close behavior', () => {
  it('calls onClose when the close button is clicked', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
