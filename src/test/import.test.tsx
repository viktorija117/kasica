import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { utils, write } from 'xlsx'
import {
  fakeExpenses,
  fakeImports,
  fakeIncomes,
  fakeMonthSettings,
  fakeSavings,
  resetBackend,
  saveMonthSettingForTest,
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
vi.mock('../data/recurring', async () => (await import('./fakeBackend')).fakeRecurring)
vi.mock('../data/receipts', async () => (await import('./fakeBackend')).fakeReceipts)
vi.mock('../data/imports', async () => (await import('./fakeBackend')).fakeImports)

const rsd = (amount: string) => `${amount} RSD`

// Excel day numbers: 46236 = 2026-08-02, 46265 = 2026-08-31, 46270 = 2026-09-05.
function budgetFile(): File {
  const expenses = utils.aoa_to_sheet([
    ['TROŠKOVI'],
    [],
    ['Datum', 'Kategorija', 'Opis', 'Iznos (RSD)', 'Napomena'],
    [46236, 'Hrana', 'Hleb', 1000, 'Potrebno'],
    [46236, 'Brza hrana, grickalice', 'Čips', 200, 'Bespotrebno'],
    [46240, 'Ostalo', 'Sredstvo za otpušavanje', null, 'Potrebno'],
    [46265, 'Prebacivanje u sledeći mesec', 'Prebacivanje', 500, 'Potrebno'],
    [46270, 'Auto', 'Gorivo', 3000, 'Potrebno'],
  ])
  const year = utils.aoa_to_sheet([
    ['GODIŠNJI PREGLED'],
    ['Godina:', 2026],
    [],
    ['Mesec', 'Početno stanje', 'Potrošeno', 'Štednja'],
    ...Array.from({ length: 12 }, (_, index) => [`Mesec ${index + 1}`]),
  ])
  year.B12 = { t: 'n', v: 7000, f: 'SUM(5000, 2000)' }
  year.D12 = { t: 'n', v: 1000 }
  year.B13 = { t: 'n', v: 4500, f: 'SUM(500, 4000)' }
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, year, 'Godišnji pregled')
  utils.book_append_sheet(workbook, expenses, 'Troškovi')
  const bytes = write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([bytes], 'Budzet_kucni.xlsx')
}

beforeEach(() => {
  vi.clearAllMocks()
  resetBackend({ signedIn: true, withHousehold: true })
})

afterEach(cleanup)

async function pickFile() {
  const user = userEvent.setup()
  renderApp('/podesavanja/uvoz')
  await user.upload(await screen.findByLabelText('Izaberi .xlsx fajl'), budgetFile())
  await screen.findByRole('region', { name: 'Avgust 2026' })
  return user
}

describe('Excel import', () => {
  it('is reachable from the settings', async () => {
    const user = userEvent.setup()
    renderApp('/podesavanja')
    await user.click(await screen.findByRole('link', { name: 'Otvori uvoz' }))
    expect(await screen.findByRole('heading', { name: 'Uvoz iz Excela' })).toBeInTheDocument()
  })

  it('previews the workbook month by month before writing anything', async () => {
    await pickFile()

    expect(screen.getByLabelText('Kategorija u aplikaciji za „Brza hrana, grickalice“')).toHaveValue('cat-3')
    expect(screen.getByLabelText('Kategorija u aplikaciji za „Auto“')).toHaveValue('new')

    const august = within(screen.getByRole('region', { name: 'Avgust 2026' }))
    expect(august.getByText(`${rsd('7.000')} · 2 prihoda`)).toBeInTheDocument()
    expect(august.getByText(`${rsd('1.200')} · 2 troška`)).toBeInTheDocument()
    expect(august.getByText(rsd('1.000'))).toBeInTheDocument()

    const september = within(screen.getByRole('region', { name: 'Septembar 2026' }))
    expect(september.getByText(rsd('500'))).toBeInTheDocument()
    expect(september.getByText(`${rsd('4.000')} · 1 prihod`)).toBeInTheDocument()

    expect(screen.getByText(/nema iznosa, nije uvezeno/)).toBeInTheDocument()
    expect(fakeImports.importWorkbook).not.toHaveBeenCalled()
  })

  it('imports everything in one go and can undo it', async () => {
    saveMonthSettingForTest('2026-09-01', { carry_enabled: true, carry_override: 123 })
    const user = await pickFile()

    await user.selectOptions(screen.getByLabelText('Kategorija u aplikaciji za „Auto“'), 'cat-2')
    await user.click(screen.getByRole('button', { name: 'Uvezi' }))

    expect(await screen.findByText('Uvezeno: 3 troška')).toBeInTheDocument()
    expect(fakeImports.importWorkbook).toHaveBeenCalledWith('hh-1', 'Budzet_kucni.xlsx', expect.anything())
    expect(await fakeExpenses.fetchExpenses('hh-1', '2026-08-01')).toHaveLength(2)
    expect(await fakeIncomes.fetchIncomes('hh-1', '2026-09-01')).toHaveLength(1)
    expect(await fakeSavings.fetchSavings('hh-1', '2026-08-01')).toHaveLength(1)
    expect(await fakeMonthSettings.fetchMonthSettings()).toContainEqual(
      expect.objectContaining({ month: '2026-09-01', carry_override: 500 }),
    )

    await user.click(await screen.findByRole('button', { name: 'Poništi uvoz' }))
    const dialog = await screen.findByRole('dialog', { name: 'Poništi uvoz?' })
    await user.click(within(dialog).getByRole('button', { name: 'Poništi uvoz' }))

    expect(await screen.findByText('Uvoz je poništen.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Još nema uvoza.')).toBeInTheDocument())
    expect(await fakeExpenses.fetchExpenses('hh-1', '2026-08-01')).toEqual([])
    expect(await fakeIncomes.fetchIncomes('hh-1', '2026-09-01')).toEqual([])
    expect(await fakeMonthSettings.fetchMonthSettings()).toContainEqual(
      expect.objectContaining({ month: '2026-09-01', carry_override: 123 }),
    )
  })

  it('warns when the same file was imported before', async () => {
    const user = await pickFile()
    await user.click(screen.getByRole('button', { name: 'Uvezi' }))
    await screen.findByText('Budzet_kucni.xlsx')

    await user.upload(screen.getByLabelText('Izaberi .xlsx fajl'), budgetFile())
    expect(await screen.findByText(/je već uvezen/)).toBeInTheDocument()
  })

  it('explains a file that is not the budget workbook', async () => {
    const user = userEvent.setup()
    renderApp('/podesavanja/uvoz')
    await user.upload(
      await screen.findByLabelText('Izaberi .xlsx fajl'),
      new File(['nije excel'], 'beleske.xlsx'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/ne može da se pročita|nema lista/)
  })
})
