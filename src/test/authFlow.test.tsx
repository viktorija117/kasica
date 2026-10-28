import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeAuth, fakeHouseholds, resetBackend, VALID_INVITE_CODE } from './fakeBackend'
import { renderApp } from './renderApp'

vi.mock('../data/auth', async () => (await import('./fakeBackend')).fakeAuth)
vi.mock('../data/households', async () => (await import('./fakeBackend')).fakeHouseholds)
vi.mock('../data/categories', async () => (await import('./fakeBackend')).fakeCategories)
vi.mock('../data/expenses', async () => (await import('./fakeBackend')).fakeExpenses)
vi.mock('../data/incomes', async () => (await import('./fakeBackend')).fakeIncomes)
vi.mock('../data/savings', async () => (await import('./fakeBackend')).fakeSavings)
vi.mock('../data/monthSettings', async () => (await import('./fakeBackend')).fakeMonthSettings)
vi.mock('../data/monthTotals', async () => (await import('./fakeBackend')).fakeMonthTotals)
vi.mock('../data/recurring', async () => (await import('./fakeBackend')).fakeRecurring)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('route guards', () => {
  it('sends a signed-out visitor to the login screen', async () => {
    resetBackend()
    renderApp('/podesavanja')
    expect(await screen.findByRole('button', { name: 'Prijavi se' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('sends a signed-in user without a household to the household screen', async () => {
    resetBackend({ signedIn: true })
    renderApp('/')
    expect(await screen.findByRole('button', { name: 'Napravi domaćinstvo' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('keeps a user with a household out of the login and household screens', async () => {
    resetBackend({ signedIn: true, withHousehold: true })
    renderApp('/prijava')
    expect(await screen.findByRole('navigation')).toBeInTheDocument()
  })

  it('shows an error with retry when the household cannot be loaded', async () => {
    resetBackend({ signedIn: true })
    fakeHouseholds.fetchMyHousehold.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Nema veze sa serverom')
    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }))
    expect(await screen.findByRole('button', { name: 'Napravi domaćinstvo' })).toBeInTheDocument()
  })
})

describe('login', () => {
  beforeEach(() => resetBackend())

  it('shows a Serbian message for wrong credentials', async () => {
    const user = userEvent.setup()
    renderApp('/prijava')

    await user.type(await screen.findByLabelText('Email'), 'ja@example.com')
    await user.type(screen.getByLabelText('Lozinka'), 'pogresno')
    await user.click(screen.getByRole('button', { name: 'Prijavi se' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Pogrešan email ili lozinka.')
  })

  it('signs up, creates a household and lands on Home', async () => {
    const user = userEvent.setup()
    renderApp('/prijava')

    await user.click(await screen.findByRole('button', { name: 'Registracija' }))
    await user.type(screen.getByLabelText('Email'), ' ja@example.com ')
    await user.type(screen.getByLabelText('Lozinka'), 'tajna123')
    await user.click(screen.getByRole('button', { name: 'Napravi nalog' }))
    expect(fakeAuth.signUp).toHaveBeenCalledWith('ja@example.com', 'tajna123')

    await user.type(await screen.findByLabelText('Naziv domaćinstva'), 'Naša kuća')
    await user.type(screen.getByLabelText('Tvoje ime'), 'Viki')
    await user.click(screen.getByRole('button', { name: 'Napravi domaćinstvo' }))

    expect(await screen.findByRole('navigation')).toBeInTheDocument()
    expect(fakeHouseholds.createHousehold).toHaveBeenCalledWith('Naša kuća', 'Viki')
  })
})

describe('joining a household', () => {
  beforeEach(() => resetBackend({ signedIn: true }))

  it('rejects a wrong code and accepts the right one', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Pridruži se kodom' }))
    await user.type(screen.getByLabelText('Kod za poziv'), 'zzzz1111')
    await user.type(screen.getByLabelText('Tvoje ime'), 'Marko')
    await user.click(screen.getByRole('button', { name: 'Pridruži se' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kod nije ispravan.')

    await user.clear(screen.getByLabelText('Kod za poziv'))
    await user.type(screen.getByLabelText('Kod za poziv'), VALID_INVITE_CODE.toLowerCase())
    await user.click(screen.getByRole('button', { name: 'Pridruži se' }))

    expect(await screen.findByRole('navigation')).toBeInTheDocument()
    expect(fakeHouseholds.joinHousehold).toHaveBeenLastCalledWith(VALID_INVITE_CODE, 'Marko')
  })
})

describe('settings', () => {
  beforeEach(() => resetBackend({ signedIn: true, withHousehold: true }))

  it('shows the household, members and categories', async () => {
    renderApp('/podesavanja')

    expect(await screen.findByText('Naša kuća')).toBeInTheDocument()
    expect(await screen.findByText('Partner')).toBeInTheDocument()
    expect(screen.getByText('ti')).toBeInTheDocument()
    expect(await screen.findByText('Hrana')).toBeInTheDocument()
    expect(screen.getByText('Računi')).toBeInTheDocument()
  })

  it('copies the invite code', async () => {
    const user = userEvent.setup()
    renderApp('/podesavanja')

    await user.click(await screen.findByRole('button', { name: 'Kopiraj' }))
    expect(await navigator.clipboard.readText()).toBe(VALID_INVITE_CODE)
    expect(screen.getByRole('button', { name: '✓ Kopirano' })).toBeInTheDocument()
  })

  it('signs out back to the login screen', async () => {
    const user = userEvent.setup()
    renderApp('/podesavanja')

    await user.click(await screen.findByRole('button', { name: 'Odjavi se' }))
    expect(await screen.findByRole('button', { name: 'Prijavi se' })).toBeInTheDocument()
    expect(fakeAuth.signOut).toHaveBeenCalled()
  })
})
