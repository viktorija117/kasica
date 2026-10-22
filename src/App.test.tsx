import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from './App'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 22, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('App shell', () => {
  it('navigates between tabs', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'Troškovi' }))
    expect(screen.getByRole('heading', { name: 'Troškovi' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Godina' }))
    expect(screen.getByRole('heading', { name: 'Godina' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Podešavanja' }))
    expect(screen.getByRole('heading', { name: 'Podešavanja' })).toBeInTheDocument()
  })

  it('switches months and returns to the current one', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByText('Oktobar 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ovaj mesec' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sledeći mesec' }))
    await user.click(screen.getByRole('button', { name: 'Sledeći mesec' }))
    expect(screen.getByText('Decembar 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sledeći mesec' }))
    expect(screen.getByText('Januar 2027')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ovaj mesec' }))
    expect(screen.getByText('Oktobar 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Prethodni mesec' }))
    expect(screen.getByText('Septembar 2026')).toBeInTheDocument()
  })

  it('keeps the selected month when moving between Home and Expenses', async () => {
    const user = userEvent.setup()
    renderApp('/?m=2026-08')

    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Troškovi' }))
    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Početna' }))
    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
  })

  it('falls back to the current month for an invalid month in the URL', () => {
    renderApp('/troskovi?m=nesto')
    expect(screen.getByText('Oktobar 2026')).toBeInTheDocument()
  })

  it('opens and closes the add sheet', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    expect(screen.getByRole('dialog', { name: 'Novi trošak' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Zatvori' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
