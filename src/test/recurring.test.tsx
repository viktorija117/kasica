import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeExpenses, fakeRecurring, resetBackend, seedExpense, seedRecurring } from './fakeBackend'
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
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 10, 0))
  resetBackend({ signedIn: true, withHousehold: true })
})

afterEach(() => {
  vi.useRealTimers()
})

const DUE_TITLE = 'Za plaćanje ovog meseca'

describe('Home → Za plaćanje', () => {
  beforeEach(() => {
    seedRecurring({ id: 'struja', name: 'Struja', amount: 6000, day_of_month: 28 })
    seedRecurring({ id: 'kirija', name: 'Kirija', amount: 40000, day_of_month: 1 })
    seedRecurring({ id: 'netflix', name: 'Netflix', amount: 1499.99, day_of_month: 20 })
    seedRecurring({ id: 'teretana', name: 'Teretana', amount: 4000, day_of_month: 5, active: false })
    // Netflix is already paid this month.
    seedExpense({ date: '2026-10-20', amount: 1499.99, description: 'Netflix', recurring_id: 'netflix' })
  })

  it('lists the unpaid ones by due day and marks the late one', async () => {
    renderApp('/')
    const card = await screen.findByRole('region', { name: DUE_TITLE })
    const rows = within(card).getAllByRole('listitem')

    expect(rows.map((row) => within(row).getByText(/^(Kirija|Struja)$/).textContent)).toEqual(['Kirija', 'Struja'])
    expect(within(rows[0]).getByText('kasni')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('kasni')).not.toBeInTheDocument()
    expect(within(rows[1]).getByText('do 28.')).toBeInTheDocument()
    expect(within(card).getByText('plaćeno 1 od 3')).toBeInTheDocument()
    expect(within(card).getByText('Ukupno 46.000 RSD')).toBeInTheDocument()
    expect(within(card).queryByText('Teretana')).not.toBeInTheDocument()
  })

  it('pays one: the sheet is filled in, the amount can change, and it leaves the list', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const card = await screen.findByRole('region', { name: DUE_TITLE })

    await user.click(within(card).getByRole('button', { name: 'Plaćeno: Struja' }))
    const sheet = await screen.findByRole('dialog', { name: 'Plaćanje' })
    expect(within(sheet).getByText('Ponavljajući trošak: Struja')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Opis')).toHaveValue('Struja')
    expect(within(sheet).getByRole('button', { name: 'Računi' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(sheet).getByLabelText('Datum')).toHaveValue('2026-10-27')
    expect(within(sheet).queryByRole('button', { name: 'Sačuvaj i dodaj još' })).not.toBeInTheDocument()

    const amount = within(sheet).getByLabelText('Iznos')
    expect(amount).toHaveValue('6000')
    await user.clear(amount)
    await user.type(amount, '6.250,50')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(fakeExpenses.createExpense).toHaveBeenCalledWith('hh-1', expect.any(String), {
      amount: 6250.5,
      category_id: 'cat-2',
      description: 'Struja',
      date: '2026-10-27',
      necessity: 'needed',
      paid_by: 'user-me',
      note: null,
      recurring_id: 'struja',
    })
    expect(within(card).queryByText('Struja')).not.toBeInTheDocument()
    expect(within(card).getByText('plaćeno 2 od 3')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Troškovi' }))
    const today = await screen.findByRole('region', { name: 'Danas' })
    expect(within(today).getByText('Struja')).toBeInTheDocument()
  })

  it('says everything is paid once the last one is', async () => {
    seedExpense({ date: '2026-10-01', amount: 40000, recurring_id: 'kirija' })
    seedExpense({ date: '2026-10-02', amount: 5800, recurring_id: 'struja' })
    renderApp('/')
    const card = await screen.findByRole('region', { name: DUE_TITLE })
    expect(within(card).getByText('Sve je plaćeno ✓')).toBeInTheDocument()
    expect(within(card).getByText('plaćeno 3 od 3')).toBeInTheDocument()
  })

  it('pays a past month on its due date', async () => {
    const user = userEvent.setup()
    renderApp('/?m=2026-09')
    const card = await screen.findByRole('region', { name: 'Za plaćanje: Septembar 2026' })

    await user.click(within(card).getByRole('button', { name: 'Plaćeno: Kirija' }))
    const sheet = await screen.findByRole('dialog', { name: 'Plaćanje' })
    expect(within(sheet).getByLabelText('Datum')).toHaveValue('2026-09-01')
  })

  it('shows nothing without recurring expenses', async () => {
    resetBackend({ signedIn: true, withHousehold: true })
    renderApp('/')
    await screen.findByRole('region', { name: 'Početno stanje' })
    expect(screen.queryByRole('region', { name: DUE_TITLE })).not.toBeInTheDocument()
  })
})

describe('Settings → Ponavljajući troškovi', () => {
  async function openSettings() {
    renderApp('/podesavanja')
    return screen.findByRole('button', { name: 'Novi ponavljajući trošak' })
  }

  it('adds one, which is due this month from its day on', async () => {
    const user = userEvent.setup()
    await user.click(await openSettings())
    const sheet = await screen.findByRole('dialog', { name: 'Novi ponavljajući trošak' })

    await user.click(within(sheet).getByRole('button', { name: 'Dodaj' }))
    expect(within(sheet).getByText('Upiši naziv, npr. Kirija.')).toBeInTheDocument()
    expect(fakeRecurring.createRecurring).not.toHaveBeenCalled()

    await user.type(within(sheet).getByLabelText('Naziv'), 'Internet')
    await user.type(within(sheet).getByLabelText('Iznos'), '2.999')
    await user.click(within(sheet).getByRole('button', { name: 'Računi' }))
    await user.selectOptions(within(sheet).getByLabelText('Dan u mesecu'), '31')
    await user.click(within(sheet).getByRole('button', { name: 'Dodaj' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fakeRecurring.createRecurring).toHaveBeenCalledWith('hh-1', {
      name: 'Internet',
      category_id: 'cat-2',
      amount: 2999,
      day_of_month: 31,
      necessity: 'needed',
      sort: 1,
    })
    expect(await screen.findByText('2.999 RSD · svakog 31.')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Početna' }))
    const card = await screen.findByRole('region', { name: DUE_TITLE })
    expect(within(card).getByText('Internet')).toBeInTheDocument()
  })

  it('switches one off, edits it and deletes it after confirming', async () => {
    seedRecurring({ id: 'kirija', name: 'Kirija', amount: 40000, day_of_month: 1 })
    const user = userEvent.setup()
    await openSettings()

    await user.click(screen.getByRole('switch', { name: 'Aktivno: Kirija' }))
    expect(fakeRecurring.updateRecurring).toHaveBeenCalledWith('kirija', { active: false })
    expect(await screen.findByText('40.000 RSD · svakog 1. · neaktivno')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Izmeni: Kirija' }))
    let sheet = await screen.findByRole('dialog', { name: 'Izmena ponavljajućeg troška' })
    const amount = within(sheet).getByLabelText('Iznos')
    await user.clear(amount)
    await user.type(amount, '42000')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj izmene' }))
    expect(await screen.findByText('42.000 RSD · svakog 1. · neaktivno')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Izmeni: Kirija' }))
    sheet = await screen.findByRole('dialog', { name: 'Izmena ponavljajućeg troška' })
    await user.click(within(sheet).getByRole('button', { name: 'Obriši' }))
    const confirm = await screen.findByRole('dialog', { name: 'Obrisati ponavljajući trošak?' })
    expect(fakeRecurring.deleteRecurring).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Obriši' }))

    expect(fakeRecurring.deleteRecurring).toHaveBeenCalledWith('kirija')
    expect(await screen.findByText('Još nema ponavljajućih troškova.')).toBeInTheDocument()
  })
})
