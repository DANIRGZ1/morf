import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpgradeModal from './UpgradeModal'

const MOCK_T = {
  feat_size_pro:  'Archivos hasta 500 MB',
  feat_unlimited: 'Herramientas sin límite',
  feat_noad:      'Sin publicidad',
  feat_priority:  'Soporte prioritario',
  feat_tools:     'Todas las herramientas Pro',
  plan_yearly:    '/año',
  plan_monthly:   '/mes',
  plan_cta_pro:   'Activar Pro',
  free_batch:     'Límite de lote alcanzado',
  free_size:      'Archivo demasiado grande',
}

const onClose      = vi.fn()
const setBillingYear = vi.fn()

const setup = ({ reason = undefined, billingYear = false } = {}) => {
  const user = userEvent.setup()
  render(
    <UpgradeModal
      reason={reason}
      billingYear={billingYear}
      setBillingYear={setBillingYear}
      onClose={onClose}
      T={MOCK_T}
    />
  )
  return { user }
}

beforeEach(() => { onClose.mockClear(); setBillingYear.mockClear() })
afterEach(() => vi.restoreAllMocks())

describe('UpgradeModal — rendering', () => {
  it('renders the Pro plan title', () => {
    setup()
    expect(screen.getByText('morf Pro')).toBeInTheDocument()
  })

  it('renders the Activar Pro button', () => {
    setup()
    expect(screen.getByText('Activar Pro')).toBeInTheDocument()
  })

  it('shows monthly price by default', () => {
    setup({ billingYear: false })
    expect(screen.getByText(/€5\.99/)).toBeInTheDocument()
  })

  it('shows yearly price when billingYear is true', () => {
    setup({ billingYear: true })
    // yearly = (5.99 * 12 * 0.75 / 12).toFixed(2) = "4.49"
    expect(screen.getByText(/€4\.49/)).toBeInTheDocument()
  })

  it('shows the -25% badge when billingYear is true', () => {
    setup({ billingYear: true })
    expect(screen.getByText('-25%')).toBeInTheDocument()
  })

  it('does NOT show the -25% badge when billing is monthly', () => {
    setup({ billingYear: false })
    expect(screen.queryByText('-25%')).not.toBeInTheDocument()
  })

  it('renders all pro feature labels', () => {
    setup()
    expect(screen.getByText('Archivos hasta 500 MB')).toBeInTheDocument()
    expect(screen.getByText('Sin publicidad')).toBeInTheDocument()
  })

  it('shows the batch reason message when reason is "batch"', () => {
    setup({ reason: 'batch' })
    expect(screen.getByText('Límite de lote alcanzado')).toBeInTheDocument()
  })

  it('shows the size reason message when reason is "size"', () => {
    setup({ reason: 'size' })
    expect(screen.getByText('Archivo demasiado grande')).toBeInTheDocument()
  })

  it('does not render the reason block when reason is undefined', () => {
    setup()
    expect(screen.queryByText('Límite de lote alcanzado')).not.toBeInTheDocument()
    expect(screen.queryByText('Archivo demasiado grande')).not.toBeInTheDocument()
  })

  it('renders the "Cerrar" button with aria-label', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })
})

describe('UpgradeModal — interactions', () => {
  it('calls onClose when the close button is clicked', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    setup()
    // The overlay div has onClick=onClose
    const overlay = document.querySelector('.ov')
    if (overlay) fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls setBillingYear when the billing toggle is clicked', async () => {
    const { user } = setup({ billingYear: false })
    // The billing toggle button contains "Mes" and "Año"
    const toggle = screen.getByText('Año').closest('button')
    await user.click(toggle)
    expect(setBillingYear).toHaveBeenCalledOnce()
  })

  it('shows an email validation error for an empty submission', async () => {
    const { user } = setup()
    await user.click(screen.getByText('Activar Pro'))
    expect(screen.getByText('Introduce un email válido')).toBeInTheDocument()
  })

  it('shows a validation error for an email without @', async () => {
    const { user } = setup()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'noemail')
    await user.click(screen.getByText('Activar Pro'))
    expect(screen.getByText('Introduce un email válido')).toBeInTheDocument()
  })

  it('clears the error when the user starts typing again', async () => {
    const { user } = setup()
    await user.click(screen.getByText('Activar Pro')) // trigger validation
    expect(screen.getByText('Introduce un email válido')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'a')
    expect(screen.queryByText('Introduce un email válido')).not.toBeInTheDocument()
  })

  it('calls the checkout API when a valid email is submitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: null, error: 'stripe error' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { user } = setup()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'user@example.com')
    await user.click(screen.getByText('Activar Pro'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    vi.unstubAllGlobals()
  })

  it('shows a network error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { user } = setup()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'user@example.com')
    await user.click(screen.getByText('Activar Pro'))
    await waitFor(() =>
      expect(screen.getByText('Error de red. Inténtalo de nuevo.')).toBeInTheDocument()
    )
    vi.unstubAllGlobals()
  })

  it('redirects when the API returns a url', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: 'https://checkout.stripe.com/test' }),
    }))
    const { user } = setup()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'user@example.com')
    await user.click(screen.getByText('Activar Pro'))
    // We can't fully test navigation in jsdom, but fetch must be called
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    vi.unstubAllGlobals()
  })
})
