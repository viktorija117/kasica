import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeExpenses, resetBackend, seedExpense } from './fakeBackend'
import { renderApp } from './renderApp'

vi.mock('../data/auth', async () => (await import('./fakeBackend')).fakeAuth)
vi.mock('../data/households', async () => (await import('./fakeBackend')).fakeHouseholds)
vi.mock('../data/categories', async () => (await import('./fakeBackend')).fakeCategories)
vi.mock('../data/expenses', async () => (await import('./fakeBackend')).fakeExpenses)
vi.mock('../data/incomes', async () => (await import('./fakeBackend')).fakeIncomes)
vi.mock('../data/savings', async () => (await import('./fakeBackend')).fakeSavings)
vi.mock('../data/monthSettings', async () => (await import('./fakeBackend')).fakeMonthSettings)
vi.mock('../data/monthTotals', async () => (await import('./fakeBackend')).fakeMonthTotals)

beforeEach(() => {
  vi.clearAllMocks()
  // Only the clock is faked, so "today" is 27 Oct 2026 while timers still run normally.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 10, 0))
  resetBackend({ signedIn: true, withHousehold: true })
})

afterEach(() => {
  vi.useRealTimers()
})

async function openAddSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Dodaj trošak' }))
  return screen.findByRole('dialog', { name: 'Novi trošak' })
}

function dayCard(label: string) {
  return screen.getByRole('region', { name: label })
}

describe('adding an expense', () => {
  it('opens with the amount focused and saves with today, me as payer and the category default', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')
    const sheet = await openAddSheet(user)

    const amount = within(sheet).getByLabelText('Iznos')
    expect(amount).toHaveFocus()
    expect(amount).toHaveAttribute('inputmode', 'decimal')
    expect(within(sheet).getByLabelText('Datum')).toHaveValue('2026-10-27')
    expect(within(sheet).getByRole('button', { name: 'Ja' })).toHaveAttribute('aria-pressed', 'true')
    // Archived categories cannot be picked for new expenses.
    expect(within(sheet).queryByRole('button', { name: 'Stara kategorija' })).not.toBeInTheDocument()

    await user.type(amount, '69,99')
    await user.click(within(sheet).getByRole('button', { name: 'Brza hrana' }))
    expect(within(sheet).getByRole('button', { name: 'Bespotrebno' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(within(sheet).getByLabelText('Opis'), 'Čips')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fakeExpenses.createExpense).toHaveBeenCalledWith('hh-1', expect.any(String), {
      amount: 69.99,
      category_id: 'cat-3',
      description: 'Čips',
      date: '2026-10-27',
      necessity: 'unneeded',
      paid_by: 'user-me',
      note: null,
    })
    expect(await within(dayCard('Danas')).findByText('Čips')).toBeInTheDocument()
    expect(within(dayCard('Danas')).getAllByText('69,99 RSD')).not.toHaveLength(0)
  })

  it('shows what is missing instead of saving', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const sheet = await openAddSheet(user)

    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(within(sheet).getByText(/Upiši iznos veći od nule/)).toBeInTheDocument()
    expect(within(sheet).getByText('Izaberi kategoriju.')).toBeInTheDocument()
    expect(fakeExpenses.createExpense).not.toHaveBeenCalled()
  })

  it('"Sačuvaj i dodaj još" keeps the date and the payer for the next item of the receipt', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')
    const sheet = await openAddSheet(user)

    await user.clear(within(sheet).getByLabelText('Datum'))
    await user.type(within(sheet).getByLabelText('Datum'), '2026-10-25')
    await user.click(within(sheet).getByRole('button', { name: 'Partner' }))

    for (const [amount, description] of [
      ['120', 'Hleb'],
      ['85,50', 'Mleko'],
    ]) {
      await user.type(within(sheet).getByLabelText('Iznos'), amount)
      await user.click(within(sheet).getByRole('button', { name: 'Hrana' }))
      await user.type(within(sheet).getByLabelText('Opis'), description)
      await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj i dodaj još' }))
    }

    expect(within(sheet).getByRole('status')).toHaveTextContent('Mleko · 85,50 RSD')
    expect(within(sheet).getByLabelText('Iznos')).toHaveValue('')
    expect(within(sheet).getByLabelText('Iznos')).toHaveFocus()
    expect(within(sheet).getByLabelText('Datum')).toHaveValue('2026-10-25')
    expect(within(sheet).getByRole('button', { name: 'Partner' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(sheet).getByRole('button', { name: 'Zatvori' }))
    const day = await screen.findByRole('region', { name: 'Nedelja, 25. oktobar' })
    expect(within(day).getByText('Hleb')).toBeInTheDocument()
    expect(within(day).getByText('Mleko')).toBeInTheDocument()
    expect(within(day).getByText('205,50 RSD')).toBeInTheDocument()
    expect(fakeExpenses.createExpense).toHaveBeenCalledTimes(2)
    expect(fakeExpenses.createExpense).toHaveBeenLastCalledWith(
      'hh-1',
      expect.any(String),
      expect.objectContaining({ date: '2026-10-25', paid_by: 'user-partner' }),
    )
  })

  it('suggests "voda" for "vo" and picking it fills the category and necessity', async () => {
    seedExpense({ date: '2026-10-20', amount: 60, description: 'voda', category_id: 'cat-1' })
    seedExpense({ date: '2026-10-21', amount: 900, description: 'Votka', category_id: 'cat-3', necessity: 'unneeded' })
    const user = userEvent.setup()
    renderApp('/')
    const sheet = await openAddSheet(user)

    await user.click(within(sheet).getByRole('button', { name: 'Brza hrana' }))
    await user.type(within(sheet).getByLabelText('Opis'), 'vo')
    const suggestions = await within(sheet).findByRole('list', { name: 'Predlozi' })
    await user.click(within(suggestions).getByRole('button', { name: 'voda' }))

    expect(within(sheet).getByLabelText('Opis')).toHaveValue('voda')
    expect(within(sheet).getByRole('button', { name: 'Hrana' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(sheet).getByRole('button', { name: 'Potrebno' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(sheet).queryByRole('list', { name: 'Predlozi' })).not.toBeInTheDocument()
  })

  it('typing a known description in full picks its category', async () => {
    seedExpense({ date: '2026-10-20', amount: 60, description: 'voda', category_id: 'cat-1' })
    const user = userEvent.setup()
    renderApp('/')
    const sheet = await openAddSheet(user)

    await waitFor(() => expect(fakeExpenses.fetchSuggestions).toHaveBeenCalled())
    await user.type(within(sheet).getByLabelText('Opis'), 'Voda')

    expect(within(sheet).getByRole('button', { name: 'Hrana' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('expense list', () => {
  beforeEach(() => {
    seedExpense({ date: '2026-10-27', amount: 120, description: 'Hleb' })
    seedExpense({ date: '2026-10-27', amount: 69.99, description: 'Čips', category_id: 'cat-3', necessity: 'unneeded', paid_by: 'user-partner' })
    seedExpense({ date: '2026-10-20', amount: 4500, description: 'Struja', category_id: 'cat-2' })
    seedExpense({ date: '2026-10-03', amount: 300, description: 'Fascikle', category_id: 'cat-4' })
    seedExpense({ date: '2026-09-30', amount: 999, description: 'Septembarski trošak' })
  })

  it('groups the month by day with day totals and a month total', async () => {
    renderApp('/troskovi')

    const today = await screen.findByRole('region', { name: 'Danas' })
    expect(within(today).getByText('189,99 RSD')).toBeInTheDocument()
    expect(within(today).getByText('platio/la Partner', { exact: false })).toBeInTheDocument()
    expect(dayCard('Utorak, 20. oktobar')).toHaveTextContent('Struja')
    // Archived categories still show in history.
    expect(dayCard('Subota, 3. oktobar')).toHaveTextContent('Stara kategorija')
    expect(screen.getByText('Ukupno · 4 troška')).toBeInTheDocument()
    expect(screen.getByText('4.989,99 RSD')).toBeInTheDocument()
    expect(screen.queryByText('Septembarski trošak')).not.toBeInTheDocument()
  })

  it('shows the selected month from the URL', async () => {
    renderApp('/troskovi?m=2026-09')
    expect(await screen.findByText('Septembarski trošak')).toBeInTheDocument()
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()
  })

  it('searches and filters', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')
    await screen.findByText('Hleb')

    await user.type(screen.getByLabelText('Pretraga po opisu'), 'cips')
    expect(screen.getByText('Čips')).toBeInTheDocument()
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Poništi filtere' }))
    await user.selectOptions(screen.getByLabelText('Kategorija'), 'cat-2')
    expect(screen.getByText('Struja')).toBeInTheDocument()
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Kategorija'), '')
    await user.selectOptions(screen.getByLabelText('Potrebno ili bespotrebno'), 'unneeded')
    expect(screen.getByText('Ukupno · 1 trošak')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Potrebno ili bespotrebno'), '')
    await user.selectOptions(screen.getByLabelText('Ko je platio'), 'user-me')
    expect(screen.getByText('Ukupno · 3 troška')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Pretraga po opisu'), 'nema toga')
    expect(screen.getByText('Nijedan trošak ne odgovara pretrazi i filterima.')).toBeInTheDocument()
  })

  it('reads the category filter from the URL', async () => {
    renderApp('/troskovi?k=cat-2')
    expect(await screen.findByText('Struja')).toBeInTheDocument()
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Kategorija')).toHaveValue('cat-2')
  })
})

describe('editing and deleting', () => {
  beforeEach(() => {
    seedExpense({ date: '2026-10-27', amount: 120, description: 'Hleb' })
    seedExpense({ date: '2026-10-26', amount: 300, description: 'Fascikle', category_id: 'cat-4' })
  })

  it('opens an expense, changes it and moves it to the new day', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')

    await user.click(await screen.findByRole('button', { name: /Hleb/ }))
    const sheet = screen.getByRole('dialog', { name: 'Izmena troška' })
    expect(within(sheet).getByLabelText('Iznos')).toHaveValue('120')

    await user.clear(within(sheet).getByLabelText('Iznos'))
    await user.type(within(sheet).getByLabelText('Iznos'), '135,5')
    await user.clear(within(sheet).getByLabelText('Datum'))
    await user.type(within(sheet).getByLabelText('Datum'), '2026-10-26')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj izmene' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const yesterday = await screen.findByRole('region', { name: 'Juče' })
    expect(within(yesterday).getByText('Hleb')).toBeInTheDocument()
    expect(within(yesterday).getByText('135,50 RSD')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Danas' })).not.toBeInTheDocument()
    expect(fakeExpenses.updateExpense).toHaveBeenCalledWith(
      'exp-1',
      expect.objectContaining({ amount: 135.5, date: '2026-10-26' }),
    )
  })

  it('keeps an archived category selectable when editing an old expense', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')

    await user.click(await screen.findByRole('button', { name: /Fascikle/ }))
    const sheet = screen.getByRole('dialog', { name: 'Izmena troška' })
    expect(within(sheet).getByRole('button', { name: 'Stara kategorija' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('deletes with "Poništi", and only sends the delete when the message goes away', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')

    await user.click(await screen.findByRole('button', { name: /Hleb/ }))
    await user.click(screen.getByRole('button', { name: 'Obriši' }))

    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Trošak je obrisan')
    await user.click(screen.getByRole('button', { name: 'Poništi' }))
    expect(screen.getByText('Hleb')).toBeInTheDocument()
    expect(fakeExpenses.deleteExpense).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Hleb/ }))
    await user.click(screen.getByRole('button', { name: 'Obriši' }))
    await user.click(screen.getByRole('button', { name: 'Zatvori poruku' }))

    await waitFor(() => expect(fakeExpenses.deleteExpense).toHaveBeenCalledWith('exp-1'))
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()
  })

  it('brings the expense back when the delete fails', async () => {
    fakeExpenses.deleteExpense.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderApp('/troskovi')

    await user.click(await screen.findByRole('button', { name: /Hleb/ }))
    await user.click(screen.getByRole('button', { name: 'Obriši' }))
    await user.click(screen.getByRole('button', { name: 'Zatvori poruku' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Brisanje nije uspelo')
    expect(screen.getByText('Hleb')).toBeInTheDocument()
  })
})

describe('optimistic saving', () => {
  it('shows the new expense before the server answers and rolls back on failure', async () => {
    let fail: (error: Error) => void = () => {}
    fakeExpenses.createExpense.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (fail = reject)),
    )
    const user = userEvent.setup()
    renderApp('/troskovi')
    await screen.findByText('Još nema troškova za ovaj mesec.')
    const sheet = await openAddSheet(user)

    await user.type(within(sheet).getByLabelText('Iznos'), '500')
    await user.click(within(sheet).getByRole('button', { name: 'Hrana' }))
    await user.type(within(sheet).getByLabelText('Opis'), 'Pijaca')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(await screen.findByText('Pijaca')).toBeInTheDocument()

    fail(new TypeError('Failed to fetch'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Trošak nije sačuvan')
    await waitFor(() => expect(screen.queryByText('Pijaca')).not.toBeInTheDocument())
  })
})
