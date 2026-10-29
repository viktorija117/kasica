import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeCategories, resetBackend, seedExpense, seedIncome } from './fakeBackend'
import { renderApp } from './renderApp'
import { amountText } from './amount'

vi.mock('../data/auth', async () => (await import('./fakeBackend')).fakeAuth)
vi.mock('../data/households', async () => (await import('./fakeBackend')).fakeHouseholds)
vi.mock('../data/categories', async () => (await import('./fakeBackend')).fakeCategories)
vi.mock('../data/expenses', async () => (await import('./fakeBackend')).fakeExpenses)
vi.mock('../data/incomes', async () => (await import('./fakeBackend')).fakeIncomes)
vi.mock('../data/savings', async () => (await import('./fakeBackend')).fakeSavings)
vi.mock('../data/monthSettings', async () => (await import('./fakeBackend')).fakeMonthSettings)
vi.mock('../data/monthTotals', async () => (await import('./fakeBackend')).fakeMonthTotals)
vi.mock('../data/recurring', async () => (await import('./fakeBackend')).fakeRecurring)
vi.mock('../data/receipts', async () => (await import('./fakeBackend')).fakeReceipts)

/** `1.234 RSD`; Testing Library turns the non-breaking space into a plain one. */
const rsd = (amount: string) => `${amount} RSD`

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 10, 0))
  resetBackend({ signedIn: true, withHousehold: true })
  seedIncome({ date: '2026-10-01', amount: 50000 })
  seedExpense({ date: '2026-10-03', amount: 1000.5, category_id: 'cat-1' })
  seedExpense({ date: '2026-10-05', amount: 1200, category_id: 'cat-3', necessity: 'unneeded', paid_by: 'user-partner' })
  seedExpense({ date: '2026-10-20', amount: 800, category_id: 'cat-3', necessity: 'unneeded', paid_by: 'user-partner' })
  seedExpense({ date: '2026-10-21', amount: 500, category_id: 'cat-4', paid_by: null })
})

afterEach(() => {
  vi.useRealTimers()
})

function region(name: string) {
  return screen.getByRole('region', { name })
}

async function openHome(path = '/') {
  renderApp(path)
  return screen.findByRole('region', { name: 'Potrošnja po kategorijama' })
}

describe('spending on Home', () => {
  it('lists every category, archived included, and the list adds up to "Potrošeno"', async () => {
    const section = await openHome()

    expect(within(region('Potrošeno')).getByText(amountText(rsd('3.500,50')))).toBeInTheDocument()
    const links = within(section).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Brza hrana: prikaži troškove',
      'Hrana: prikaži troškove',
      'Stara kategorija: prikaži troškove',
    ])
    expect(within(links[0]).getByText(rsd('2.000'))).toBeInTheDocument()
    expect(within(links[1]).getByText(rsd('1.000,50'))).toBeInTheDocument()
    expect(within(links[2]).getByText(rsd('500'))).toBeInTheDocument()
    expect(within(links[2]).getByText('(arhivirano)')).toBeInTheDocument()
    // 2.000 + 1.000,50 + 500 = 3.500,50
    expect(within(links[0]).getByText('57%')).toBeInTheDocument()
    expect(within(section).getByText(/Najviše trošite na:/)).toHaveTextContent(
      `Najviše trošite na: 🍟 Brza hrana (${rsd('2.000')})`,
    )
  })

  it('shows spending against the limit, orange from 80% and red above it', async () => {
    await fakeCategories.updateCategory('cat-3', { monthly_limit: 2400 })
    const section = await openHome()

    const fast = within(section).getByRole('link', { name: 'Brza hrana: prikaži troškove' })
    const bar = within(fast).getByRole('progressbar')
    expect(bar).toHaveAttribute('data-tone', 'warning')
    expect(bar).toHaveAttribute('aria-valuenow', '83')
    expect(within(fast).getByText(`${rsd('2.000')} od ${rsd('2.400')} · blizu limita`)).toBeInTheDocument()

    // One more bag of chips goes over the limit.
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    const sheet = await screen.findByRole('dialog', { name: 'Novi trošak' })
    await user.type(within(sheet).getByLabelText('Iznos'), '600')
    await user.click(within(sheet).getByRole('button', { name: 'Brza hrana' }))
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    await waitFor(() => expect(within(fast).getByRole('progressbar')).toHaveAttribute('data-tone', 'danger'))
    expect(within(fast).getByText(`${rsd('2.600')} od ${rsd('2.400')} · ${rsd('200')} preko limita`)).toBeInTheDocument()
  })

  it('a category with a limit and no spending yet still shows its limit', async () => {
    await fakeCategories.updateCategory('cat-2', { monthly_limit: 30000 })
    const section = await openHome()

    const bills = within(section).getByRole('link', { name: 'Računi: prikaži troškove' })
    expect(within(bills).getByText(`${rsd('0')} od ${rsd('30.000')}`)).toBeInTheDocument()
  })

  it('a tap on a category opens Troškovi filtered by it, in the same month', async () => {
    const user = userEvent.setup()
    seedExpense({ date: '2026-09-10', amount: 300, category_id: 'cat-2', description: 'Struja' })
    seedExpense({ date: '2026-09-11', amount: 900, category_id: 'cat-1', description: 'Hleb' })
    const section = await openHome('/?m=2026-09')

    await user.click(within(section).getByRole('link', { name: 'Računi: prikaži troškove' }))

    expect(await screen.findByText('Struja')).toBeInTheDocument()
    expect(screen.getByLabelText('Kategorija')).toHaveValue('cat-2')
    expect(screen.getByRole('heading', { name: 'Četvrtak, 10. septembar' })).toBeInTheDocument()
    expect(screen.queryByText('Hleb')).not.toBeInTheDocument()
  })

  it('shows needed against unneeded and who paid how much', async () => {
    await openHome()

    const necessity = region('Potrebno i bespotrebno')
    expect(within(necessity).getByText('Potrebno').nextSibling).toHaveTextContent(rsd('1.500,50'))
    expect(within(necessity).getByText('Bespotrebno').nextSibling).toHaveTextContent(rsd('2.000'))

    const payers = region('Ko je koliko platio')
    expect(within(payers).getByText('Ja').nextSibling).toHaveTextContent(rsd('1.000,50'))
    expect(within(payers).getByText('Partner').nextSibling).toHaveTextContent(rsd('2.000'))
    expect(within(payers).getByText('Nije upisano').nextSibling).toHaveTextContent(rsd('500'))
  })

  it('shows the spending per day with the daily average', async () => {
    await openHome()
    // 3.500,50 / 27 days
    expect(within(await screen.findByRole('region', { name: 'Potrošnja po danima' })).getByText(`prosečno dnevno ${rsd('129,65')}`)).toBeInTheDocument()
  })

  it('a month without expenses says so instead of showing empty charts', async () => {
    renderApp('/?m=2026-11')
    expect(await screen.findByText('Ovog meseca još nema troškova.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Potrošnja po danima' })).not.toBeInTheDocument()
  })
})

describe('Settings → Kategorije', () => {
  async function openSettings() {
    renderApp('/podesavanja')
    return screen.findByRole('button', { name: 'Izmeni: Hrana' })
  }

  async function openPicker(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    return screen.findByRole('dialog', { name: 'Novi trošak' })
  }

  it('renames a category, sets a limit, and the new name shows everywhere at once', async () => {
    const user = userEvent.setup()
    await user.click(await openSettings())

    const sheet = await screen.findByRole('dialog', { name: 'Izmena kategorije' })
    const name = within(sheet).getByLabelText('Naziv')
    expect(name).toHaveValue('Hrana')
    await user.clear(name)
    await user.type(name, 'Namirnice')
    await user.click(within(sheet).getByRole('button', { name: '☕' }))
    await user.type(within(sheet).getByLabelText('Mesečni limit'), '40.000')
    await user.click(within(sheet).getByRole('button', { name: 'Bespotrebno' }))
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj izmene' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Izmeni: Namirnice' })).toHaveTextContent(
      `limit ${rsd('40.000')} · bespotrebno`,
    )
    expect(fakeCategories.updateCategory).toHaveBeenCalledWith('cat-1', {
      name: 'Namirnice',
      emoji: '☕',
      color: '#43a047',
      monthly_limit: 40000,
      default_necessity: 'unneeded',
    })

    const picker = await openPicker(user)
    expect(within(picker).getByRole('button', { name: 'Namirnice' })).toBeInTheDocument()
  })

  it('does not allow two categories with the same name', async () => {
    const user = userEvent.setup()
    await user.click(await openSettings())

    const sheet = await screen.findByRole('dialog', { name: 'Izmena kategorije' })
    await user.clear(within(sheet).getByLabelText('Naziv'))
    await user.type(within(sheet).getByLabelText('Naziv'), 'računi')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj izmene' }))

    expect(within(sheet).getByText('Već postoji kategorija sa tim nazivom.')).toBeInTheDocument()
    expect(fakeCategories.updateCategory).not.toHaveBeenCalled()
  })

  it('moves a category with the arrows', async () => {
    const user = userEvent.setup()
    await openSettings()

    expect(screen.getByRole('button', { name: 'Pomeri gore: Hrana' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pomeri dole: Brza hrana' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Pomeri dole: Hrana' }))

    expect(fakeCategories.reorderCategories).toHaveBeenCalledWith('hh-1', ['cat-2', 'cat-1', 'cat-3'])
    const names = screen.getAllByRole('button', { name: /^Izmeni:/ }).map((button) => button.getAttribute('aria-label'))
    expect(names).toEqual(['Izmeni: Računi', 'Izmeni: Hrana', 'Izmeni: Brza hrana', 'Izmeni: Stara kategorija'])

    const picker = await openPicker(user)
    const categoryButtons = within(picker)
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((text) => text === '🧾Računi' || text === '🛒Hrana' || text === '🍟Brza hrana')
    expect(categoryButtons).toEqual(['🧾Računi', '🛒Hrana', '🍟Brza hrana'])
  })

  it('archives after confirming, keeps the history, and can bring it back', async () => {
    const user = userEvent.setup()
    await openSettings()

    await user.click(screen.getByRole('button', { name: 'Izmeni: Brza hrana' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arhiviraj' }))
    const confirm = await screen.findByRole('dialog', { name: 'Arhivirati kategoriju?' })
    await user.click(within(confirm).getByRole('button', { name: 'Arhiviraj' }))

    expect(fakeCategories.updateCategory).toHaveBeenCalledWith('cat-3', { archived: true })
    expect(await screen.findByText('Kategorija „Brza hrana“ je arhivirana')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pomeri gore: Brza hrana' })).not.toBeInTheDocument()
    expect(screen.getByText('Arhivirane (2)')).toBeInTheDocument()

    const picker = await openPicker(user)
    expect(within(picker).queryByRole('button', { name: 'Brza hrana' })).not.toBeInTheDocument()
    await user.click(within(picker).getByRole('button', { name: 'Zatvori' }))

    // History and reports still show it.
    await user.click(screen.getByRole('link', { name: 'Početna' }))
    const spending = await screen.findByRole('region', { name: 'Potrošnja po kategorijama' })
    expect(within(spending).getByRole('link', { name: 'Brza hrana: prikaži troškove' })).toHaveTextContent('(arhivirano)')

    // And back from the archive.
    await user.click(screen.getByRole('link', { name: 'Podešavanja' }))
    await user.click(await screen.findByRole('button', { name: 'Izmeni: Brza hrana' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Vrati iz arhive' }))
    expect(fakeCategories.updateCategory).toHaveBeenLastCalledWith('cat-3', { archived: false })
    expect(await screen.findByRole('button', { name: 'Pomeri gore: Brza hrana' })).toBeInTheDocument()
  })

  it('adds a new category at the end that can be picked right away', async () => {
    const user = userEvent.setup()
    await openSettings()

    await user.click(screen.getByRole('button', { name: 'Nova kategorija' }))
    const sheet = await screen.findByRole('dialog', { name: 'Nova kategorija' })
    await user.type(within(sheet).getByLabelText('Naziv'), 'Kućni ljubimci')
    await user.click(within(sheet).getByRole('button', { name: '🐶' }))
    await user.click(within(sheet).getByRole('button', { name: 'Dodaj kategoriju' }))

    expect(fakeCategories.createCategory).toHaveBeenCalledWith('hh-1', {
      name: 'Kućni ljubimci',
      emoji: '🐶',
      color: '#fb8c00',
      monthly_limit: null,
      default_necessity: 'needed',
      sort: 5,
    })
    const picker = await openPicker(user)
    expect(within(picker).getByRole('button', { name: 'Kućni ljubimci' })).toBeInTheDocument()
  })
})
