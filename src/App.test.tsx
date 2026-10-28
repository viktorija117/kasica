import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetBackend } from './test/fakeBackend'
import { renderApp as renderAt } from './test/renderApp'

vi.mock('./data/auth', async () => (await import('./test/fakeBackend')).fakeAuth)
vi.mock('./data/households', async () => (await import('./test/fakeBackend')).fakeHouseholds)
vi.mock('./data/categories', async () => (await import('./test/fakeBackend')).fakeCategories)
vi.mock('./data/expenses', async () => (await import('./test/fakeBackend')).fakeExpenses)
vi.mock('./data/incomes', async () => (await import('./test/fakeBackend')).fakeIncomes)
vi.mock('./data/savings', async () => (await import('./test/fakeBackend')).fakeSavings)
vi.mock('./data/monthSettings', async () => (await import('./test/fakeBackend')).fakeMonthSettings)
vi.mock('./data/monthTotals', async () => (await import('./test/fakeBackend')).fakeMonthTotals)
vi.mock('./data/recurring', async () => (await import('./test/fakeBackend')).fakeRecurring)
vi.mock('./data/receipts', async () => (await import('./test/fakeBackend')).fakeReceipts)

// The shell is only reachable once signed in with a household; wait for the guards.
async function renderApp(path = '/') {
  const result = renderAt(path)
  await screen.findByRole('navigation')
  return result
}

beforeEach(() => {
  resetBackend({ signedIn: true, withHousehold: true })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 22, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('App shell', () => {
  it('navigates between tabs', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('link', { name: 'Troškovi' }))
    expect(screen.getByRole('heading', { name: 'Troškovi' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Godina' }))
    expect(screen.getByRole('heading', { name: 'Godina' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Podešavanja' }))
    expect(screen.getByRole('heading', { name: 'Podešavanja' })).toBeInTheDocument()
  })

  it('switches months and returns to the current one', async () => {
    const user = userEvent.setup()
    await renderApp()

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
    await renderApp('/?m=2026-08')

    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Troškovi' }))
    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Početna' }))
    expect(screen.getByText('Avgust 2026')).toBeInTheDocument()
  })

  it('falls back to the current month for an invalid month in the URL', async () => {
    await renderApp('/troskovi?m=nesto')
    expect(screen.getByText('Oktobar 2026')).toBeInTheDocument()
  })

  it('opens and closes the add sheet', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    expect(screen.getByRole('dialog', { name: 'Novi trošak' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Zatvori' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
