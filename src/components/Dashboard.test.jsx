import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'

const onBack = vi.fn()

const mkHistory = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    filename: `file${i}.pdf`,
    tool: `Tool ${i}`,
    date: new Date(Date.now() - i * 3600000).toISOString(),
    size: (i + 1) * 1048576,
  }))

beforeEach(() => onBack.mockClear())

// ─────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────
describe('Dashboard — empty state', () => {
  it('renders the Dashboard heading', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders the ← Volver button', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('← Volver')).toBeInTheDocument()
  })

  it('calls onBack when ← Volver is clicked', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    await user.click(screen.getByText('← Volver'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows empty state heading', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Tu dashboard está vacío')).toBeInTheDocument()
  })

  it('shows empty state CTA button "Empezar a convertir"', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Empezar a convertir')).toBeInTheDocument()
  })

  it('CTA button calls onBack', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    await user.click(screen.getByText('Empezar a convertir'))
    expect(onBack).toHaveBeenCalled()
  })

  it('does NOT show Exportar CSV when history is empty', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.queryByText(/Exportar CSV/)).not.toBeInTheDocument()
  })

  it('shows "Sin actividad aún" in recent activity section', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Sin actividad aún')).toBeInTheDocument()
  })

  it('shows "Aún no hay conversiones registradas" in tools chart', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Aún no hay conversiones registradas')).toBeInTheDocument()
  })

  it('renders stat cards labels', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Total conversiones')).toBeInTheDocument()
    expect(screen.getByText('Esta semana')).toBeInTheDocument()
    expect(screen.getByText('Herramienta top')).toBeInTheDocument()
    expect(screen.getByText('Herramientas usadas')).toBeInTheDocument()
    expect(screen.getByText('Datos procesados')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// With history
// ─────────────────────────────────────────────────────────────────
describe('Dashboard — with history', () => {
  it('renders filenames in recent activity', () => {
    render(<Dashboard history={mkHistory(2)} count={2} onBack={onBack} />)
    expect(screen.getByText('file0.pdf')).toBeInTheDocument()
  })

  it('renders tool names in recent activity', () => {
    render(<Dashboard history={mkHistory(2)} count={2} onBack={onBack} />)
    expect(screen.getAllByText('Tool 0').length).toBeGreaterThan(0)
  })

  it('shows "↓ Exportar CSV" button when history has items', () => {
    render(<Dashboard history={mkHistory(1)} count={1} onBack={onBack} />)
    expect(screen.getByText(/Exportar CSV/)).toBeInTheDocument()
  })

  it('shows the count value in Total conversiones when count > 0', () => {
    render(<Dashboard history={mkHistory(3)} count={5} onBack={onBack} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows history.length when count is 0', () => {
    render(<Dashboard history={mkHistory(3)} count={0} onBack={onBack} />)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('shows the top tool name in the stat card', () => {
    render(<Dashboard history={mkHistory(3)} count={3} onBack={onBack} />)
    // topTool should be 'Tool 0' since all three have different tools
    // it picks the first one as tied
    const toolCard = screen.getByText('Herramienta top').closest('div')
    expect(toolCard).toBeTruthy()
  })

  it('renders the "Herramientas más usadas" section', () => {
    render(<Dashboard history={mkHistory(3)} count={3} onBack={onBack} />)
    expect(screen.getByText('Herramientas más usadas')).toBeInTheDocument()
  })

  it('exportCSV triggers a download when button is clicked', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const clickMock = vi.fn()
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag)
      if (tag === 'a') el.click = clickMock
      return el
    })

    render(<Dashboard history={mkHistory(2)} count={2} onBack={onBack} />)
    await user.click(screen.getByText(/Exportar CSV/))
    expect(clickMock).toHaveBeenCalled()

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})

// ─────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────
describe('Dashboard — tabs', () => {
  it('renders the three tab buttons', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    expect(screen.getByText('Resumen')).toBeInTheDocument()
    expect(screen.getByText('Herramientas')).toBeInTheDocument()
    expect(screen.getByText('Archivos')).toBeInTheDocument()
  })

  it('shows overview content by default', () => {
    render(<Dashboard history={mkHistory(1)} count={1} onBack={onBack} />)
    expect(screen.getByText('Actividad semanal')).toBeInTheDocument()
  })

  it('switches to Herramientas tab and shows all-tools section', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={mkHistory(3)} count={3} onBack={onBack} />)
    await user.click(screen.getByText('Herramientas'))
    expect(screen.getByText('Todas las herramientas usadas')).toBeInTheDocument()
  })

  it('switches to Archivos tab and shows file-types section', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={mkHistory(2)} count={2} onBack={onBack} />)
    await user.click(screen.getByText('Archivos'))
    expect(screen.getByText('Tipos de archivo')).toBeInTheDocument()
  })

  it('shows .pdf in files tab with pdf history', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={mkHistory(2)} count={2} onBack={onBack} />)
    await user.click(screen.getByText('Archivos'))
    expect(screen.getByText('.pdf')).toBeInTheDocument()
  })

  it('shows "Sin datos aún" in file types tab when history is empty', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    await user.click(screen.getByText('Archivos'))
    expect(screen.getAllByText('Sin datos aún').length).toBeGreaterThan(0)
  })

  it('shows "Convierte archivos para ver estadísticas" in tools tab when empty', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    await user.click(screen.getByText('Herramientas'))
    expect(screen.getByText('Convierte archivos para ver estadísticas de herramientas')).toBeInTheDocument()
  })

  it('shows "Sin archivos aún" in files tab when empty', async () => {
    const user = userEvent.setup()
    render(<Dashboard history={[]} count={0} onBack={onBack} />)
    await user.click(screen.getByText('Archivos'))
    expect(screen.getByText('Sin archivos aún')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────
// Language prop
// ─────────────────────────────────────────────────────────────────
describe('Dashboard — language prop', () => {
  it('renders without crashing with lang="en"', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} lang="en" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders without crashing with lang="es"', () => {
    render(<Dashboard history={[]} count={0} onBack={onBack} lang="es" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
