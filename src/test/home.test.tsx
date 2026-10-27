import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  fakeIncomes,
  fakeMonthSettings,
  fakeSavings,
  resetBackend,
  seedExpense,
  seedIncome,
  seedSaving,
} from './fakeBackend'
import { renderApp } from './renderApp'

vi.mock('../data/auth', async () => (await import('./fakeBackend')).fakeAuth)
vi.mock('../data/households', async () => (await import('./fakeBackend')).fakeHouseholds)
vi.mock('../data/categories', async () => (await import('./fakeBackend')).fakeCategories)
vi.mock('../data/expenses', async () => (await import('./fakeBackend')).fakeExpenses)
vi.mock('../data/incomes', async () => (await import('./fakeBackend')).fakeIncomes)
vi.mock('../data/savings', async () => (await import('./fakeBackend')).fakeSavings)
vi.mock('../data/monthSettings', async () => (await import('./fakeBackend')).fakeMonthSettings)
vi.mock('../data/monthTotals', async () => (await import('./fakeBackend')).fakeMonthTotals)

/** `1.234 RSD`; Testing Library turns the non-breaking space into a plain one. */
const rsd = (amount: string) => `${amount} RSD`

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 10, 0))
  resetBackend({ signedIn: true, withHousehold: true })
})

afterEach(() => {
  vi.useRealTimers()
})

function card(name: string) {
  return screen.getByRole('region', { name })
}

async function openHome(path = '/') {
  renderApp(path)
  await screen.findByRole('region', { name: 'Početno stanje' })
}

describe('Home', () => {
  beforeEach(() => {
    // September: 100.000 in, 60.000 spent, 10.000 saved → 30.000 carried into October.
    seedIncome({ date: '2026-09-01', amount: 100000 })
    seedExpense({ date: '2026-09-15', amount: 60000 })
    seedSaving({ date: '2026-09-20', amount: 10000, note: null })
    // October so far.
    seedIncome({ date: '2026-10-01', amount: 70000 })
    seedExpense({ date: '2026-10-05', amount: 20000 })
    seedExpense({ date: '2026-10-27', amount: 1500, necessity: 'unneeded', description: 'Čips' })
    seedSaving({ date: '2026-10-10', amount: -5000, note: 'podizanje' })
  })

  it('carries what was left in September into October automatically', async () => {
    await openHome()

    const opening = card('Početno stanje')
    expect(within(opening).getByText(rsd('100.000'))).toBeInTheDocument()
    expect(within(opening).getByText(`preneto ${rsd('30.000')} + prihodi ${rsd('70.000')}`)).toBeInTheDocument()
    expect(within(card('Potrošeno')).getByText(rsd('21.500'))).toBeInTheDocument()
    expect(within(card('Ušteđeno')).getByText(rsd('-5.000'))).toBeInTheDocument()
    // 100.000 − 21.500 − (−5.000)
    expect(within(card('Preostalo')).getByText(rsd('83.500'))).toBeInTheDocument()
    expect(within(card('Preostalo')).getByText('Iskorišćeno 22%')).toBeInTheDocument()
  })

  it('shows the current month numbers: today, average, allowance, unneeded, last month', async () => {
    await openHome()

    expect(screen.getByText('Danas').nextSibling).toHaveTextContent(rsd('1.500'))
    // 21.500 / 27 days
    expect(screen.getByText('Prosečno dnevno').nextSibling).toHaveTextContent(rsd('796,30'))
    expect(screen.getByText('Broj kupovina').nextSibling).toHaveTextContent('2')
    // 83.500 / 5 days (27–31 Oct)
    expect(
      screen.getByText(`Možeš da trošiš još ${rsd('16.700')} dnevno do kraja meseca (5 dana).`),
    ).toBeInTheDocument()
    expect(screen.getByText('7% potrošnje')).toBeInTheDocument()
    // 21.500 against 60.000 spent on 1–27 Sep
    expect(screen.getByText('isti period, 1–27.')).toBeInTheDocument()
    expect(screen.getByText(`${rsd('38.500')} manje (64%)`)).toBeInTheDocument()
  })

  it('shows a past month without today and the allowance', async () => {
    await openHome('/?m=2026-09')

    expect(within(card('Početno stanje')).getByText(`preneto ${rsd('0')} + prihodi ${rsd('100.000')}`)).toBeInTheDocument()
    expect(within(card('Preostalo')).getByText(rsd('30.000'))).toBeInTheDocument()
    expect(screen.queryByText('Danas')).not.toBeInTheDocument()
    expect(screen.queryByText(/Možeš da trošiš/)).not.toBeInTheDocument()
    // 60.000 / 30 days
    expect(screen.getByText('Prosečno dnevno').nextSibling).toHaveTextContent(rsd('2.000'))
  })

  it('"Uskladi stanje" replaces the carry and it stays remembered', async () => {
    const user = userEvent.setup()
    await openHome()

    await user.click(screen.getByRole('button', { name: 'Uskladi stanje' }))
    const sheet = await screen.findByRole('dialog', { name: 'Uskladi stanje' })
    expect(within(sheet).getByText(`Izračunato automatski: ${rsd('30.000')}`)).toBeInTheDocument()
    const amount = within(sheet).getByLabelText('Preneto')
    expect(amount).toHaveFocus()
    await user.type(amount, '10.396')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(fakeMonthSettings.saveMonthSetting).toHaveBeenCalledWith('hh-1', '2026-10-01', {
      carry_enabled: true,
      carry_override: 10396,
    })
    const opening = card('Početno stanje')
    expect(within(opening).getByText(rsd('80.396'))).toBeInTheDocument()
    expect(within(opening).getByText(/preneto 10\.396.*usklađeno ručno/)).toBeInTheDocument()

    // A fresh start (like reopening the app) reads the remembered value.
    cleanup()
    await openHome()
    expect(within(card('Početno stanje')).getByText(rsd('80.396'))).toBeInTheDocument()

    // And it can go back to the automatic carry.
    await user.click(screen.getByRole('button', { name: 'Uskladi stanje' }))
    const again = await screen.findByRole('dialog', { name: 'Uskladi stanje' })
    expect(within(again).getByLabelText('Preneto')).toHaveValue('10396')
    await user.click(within(again).getByRole('button', { name: 'Vrati na automatski' }))
    expect(within(card('Početno stanje')).getByText(rsd('100.000'))).toBeInTheDocument()
    expect(fakeMonthSettings.saveMonthSetting).toHaveBeenLastCalledWith('hh-1', '2026-10-01', {
      carry_enabled: true,
      carry_override: null,
    })
  })

  it('the switch turns the carry from last month off and on', async () => {
    const user = userEvent.setup()
    await openHome()

    const toggle = screen.getByRole('switch', { name: 'Prenesi ostatak iz prošlog meseca' })
    expect(toggle).toBeChecked()
    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(within(card('Početno stanje')).getByText(rsd('70.000'))).toBeInTheDocument()
    expect(fakeMonthSettings.saveMonthSetting).toHaveBeenCalledWith('hh-1', '2026-10-01', {
      carry_enabled: false,
      carry_override: null,
    })
  })

  it('an expense added from Home updates the numbers at once', async () => {
    const user = userEvent.setup()
    await openHome()

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    const sheet = await screen.findByRole('dialog', { name: 'Novi trošak' })
    await user.type(within(sheet).getByLabelText('Iznos'), '500')
    await user.click(within(sheet).getByRole('button', { name: 'Hrana' }))
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    expect(within(card('Potrošeno')).getByText(rsd('22.000'))).toBeInTheDocument()
    expect(within(card('Preostalo')).getByText(rsd('83.000'))).toBeInTheDocument()
  })
})

describe('incomes and savings on Troškovi', () => {
  async function openSection(user: ReturnType<typeof userEvent.setup>, name: string) {
    const section = await screen.findByRole('region', { name })
    await user.click(within(section).getByRole('button', { name: new RegExp(name) }))
    return section
  }

  it('adds, edits and deletes an income with "Poništi"', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi')

    await user.click(await screen.findByRole('button', { name: 'Dodaj prihod' }))
    const sheet = await screen.findByRole('dialog', { name: 'Novi prihod' })
    expect(within(sheet).getByLabelText('Iznos')).toHaveFocus()
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))
    expect(within(sheet).getByText('Upiši izvor prihoda, npr. Plata.')).toBeInTheDocument()

    await user.type(within(sheet).getByLabelText('Iznos'), '70.000')
    await user.click(within(sheet).getByRole('button', { name: 'Plata' }))
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fakeIncomes.createIncome).toHaveBeenCalledWith('hh-1', {
      amount: 70000,
      source: 'Plata',
      date: '2026-10-27',
      received_by: 'user-me',
      note: null,
    })

    const section = await openSection(user, 'Prihodi')
    expect(await within(section).findAllByText(rsd('70.000'))).not.toHaveLength(0)

    await user.click(within(section).getByRole('button', { name: /Plata/ }))
    const edit = await screen.findByRole('dialog', { name: 'Izmena prihoda' })
    const amount = within(edit).getByLabelText('Iznos')
    await user.clear(amount)
    await user.type(amount, '72000')
    await user.click(within(edit).getByRole('button', { name: 'Sačuvaj izmene' }))
    expect(await within(section).findAllByText(rsd('72.000'))).not.toHaveLength(0)

    await user.click(within(section).getByRole('button', { name: /Plata/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Obriši' }))
    expect(within(section).queryByRole('button', { name: /Plata/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Poništi' }))
    expect(within(section).getByRole('button', { name: /Plata/ })).toBeInTheDocument()
    expect(fakeIncomes.deleteIncome).not.toHaveBeenCalled()

    await user.click(within(section).getByRole('button', { name: /Plata/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Obriši' }))
    await user.click(screen.getByRole('button', { name: 'Zatvori poruku' }))
    await waitFor(() => expect(fakeIncomes.deleteIncome).toHaveBeenCalledWith('inc-1'))
  })

  it('saves a withdrawal as a negative amount', async () => {
    const user = userEvent.setup()
    renderApp('/troskovi?m=2026-09')

    await user.click(await screen.findByRole('button', { name: 'Dodaj štednju' }))
    const sheet = await screen.findByRole('dialog', { name: 'Štednja' })
    // Another month is shown, so the new entry lands in it.
    expect(within(sheet).getByLabelText('Datum')).toHaveValue('2026-09-01')
    await user.click(within(sheet).getByRole('button', { name: 'Podizanje' }))
    await user.type(within(sheet).getByLabelText('Iznos'), '2500')
    await user.click(within(sheet).getByRole('button', { name: 'Sačuvaj' }))

    await waitFor(() =>
      expect(fakeSavings.createSaving).toHaveBeenCalledWith('hh-1', {
        amount: -2500,
        date: '2026-09-01',
        note: null,
      }),
    )
    const section = await openSection(user, 'Štednja')
    expect(await within(section).findAllByText(rsd('-2.500'))).not.toHaveLength(0)
    expect(within(section).getByText('Podizanje')).toBeInTheDocument()
  })
})
