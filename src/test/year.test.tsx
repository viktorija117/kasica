import { screen, waitFor, within } from '@testing-library/react'
import type { WorkBook } from 'xlsx'
import { writeFile } from 'xlsx'
import userEvent from '@testing-library/user-event'
import { resetBackend, seedExpense, seedIncome, seedSaving } from './fakeBackend'
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
vi.mock('../data/monthCategoryTotals', async () => (await import('./fakeBackend')).fakeMonthCategoryTotals)
vi.mock('../data/yearExport', async () => (await import('./fakeBackend')).fakeYearExport)
vi.mock('xlsx', async (importOriginal) => ({ ...(await importOriginal<typeof import('xlsx')>()), writeFile: vi.fn() }))

/** `1.234 RSD`; Testing Library turns the non-breaking space into a plain one. */
const rsd = (amount: string) => `${amount} RSD`

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 10, 0))
  resetBackend({ signedIn: true, withHousehold: true })
  // September: 100.000 in, 62.000 spent, 10.000 saved → 28.000 carried into October.
  seedIncome({ date: '2026-09-01', amount: 100000 })
  seedExpense({ date: '2026-09-10', amount: 60000, category_id: 'cat-1' })
  seedExpense({ date: '2026-09-12', amount: 2000, category_id: 'cat-3', necessity: 'unneeded' })
  seedSaving({ date: '2026-09-20', amount: 10000, note: null })
  // October: the archived category still has spending.
  seedIncome({ date: '2026-10-01', amount: 70000 })
  seedExpense({ date: '2026-10-05', amount: 1500, category_id: 'cat-4' })
  seedExpense({ date: '2026-10-06', amount: 500, category_id: 'cat-3', necessity: 'unneeded' })
})

afterEach(() => {
  vi.useRealTimers()
})

async function openYear(path = '/godina') {
  renderApp(path)
  return screen.findByRole('region', { name: 'Po mesecima' })
}

function cellsOf(table: HTMLElement, rowName: RegExp) {
  return within(within(table).getByRole('row', { name: rowName })).getAllByRole('cell').map((cell) => cell.textContent?.replace(/\u00a0/g, ' '))
}

describe('Year', () => {
  it('shows every month with the same numbers as Home, and a UKUPNO row', async () => {
    const months = await openYear()

    expect(cellsOf(months, /Septembar/)).toEqual([
      rsd('100.000'),
      rsd('62.000'),
      rsd('10.000'),
      rsd('28.000'),
      '🛒 Hrana',
    ])
    expect(cellsOf(months, /Oktobar/)).toEqual([rsd('98.000'), rsd('2.000'), rsd('0'), rsd('96.000'), '🗃️ Stara kategorija'])
    expect(cellsOf(months, /Novembar/)).toEqual(['—', '—', '—', '—', '—'])
    expect(cellsOf(months, /UKUPNO/)).toEqual([rsd('170.000'), rsd('64.000'), rsd('10.000'), rsd('96.000'), '🛒 Hrana'])
  })

  it('has a column for every category with spending, archived ones included', async () => {
    await openYear()
    const heatmap = screen.getByRole('region', { name: 'Potrošnja po kategorijama' })

    const headers = within(heatmap).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Mesec', '🛒 Hrana', '🍟 Brza hrana', '🗃️ Stara kategorijaarhivirana'])
    expect(cellsOf(heatmap, /Sep/)).toEqual(['60.000', '2.000', ''])
    expect(cellsOf(heatmap, /Okt/)).toEqual(['', '500', '1.500'])
    expect(cellsOf(heatmap, /UKUPNO/)).toEqual(['60.000', '2.500', '1.500'])
  })

  it('sums up the year', async () => {
    await openYear()
    const stats = screen.getByRole('region', { name: 'Godina u brojevima' })
    const value = (label: string) => within(stats).getByText(label).nextSibling

    expect(value('Ukupno potrošeno')).toHaveTextContent(rsd('64.000'))
    expect(value('Ukupno ušteđeno')).toHaveTextContent(rsd('10.000'))
    // Only September and October have expenses.
    expect(value('Prosečna mesečna potrošnja')).toHaveTextContent(`${rsd('32.000')}2 meseca sa troškovima`)
    expect(value('Najskuplji mesec')).toHaveTextContent(`Septembar${rsd('62.000')}`)
    expect(value('Najveća kategorija u godini')).toHaveTextContent('🛒 Hrana')
    // 2.500 / 64.000
    expect(value('Udeo bespotrebnog')).toHaveTextContent(`4%${rsd('2.500')}`)
  })

  it('a tap on a month opens Home for that month', async () => {
    const user = userEvent.setup()
    await openYear()

    await user.click(screen.getByRole('link', { name: 'Septembar: otvori Početnu' }))

    const opening = await screen.findByRole('region', { name: 'Početno stanje' })
    expect(screen.getByText('Septembar 2026')).toBeInTheDocument()
    expect(within(opening).getByText(rsd('100.000'))).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Preostalo' })).getByText(rsd('28.000'))).toBeInTheDocument()
  })

  it('switches years and shows an empty year', async () => {
    const user = userEvent.setup()
    await openYear()

    await user.click(screen.getByRole('button', { name: 'Prethodna godina' }))
    expect(await screen.findByText('Za ovu godinu još nema podataka.')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ova godina' }))
    expect(await screen.findByRole('region', { name: 'Po mesecima' })).toBeInTheDocument()
  })

  it('exports the year to Excel with the same numbers', async () => {
    const user = userEvent.setup()
    await openYear()

    await user.click(await screen.findByRole('button', { name: 'Izvezi u Excel' }))

    await waitFor(() => expect(writeFile).toHaveBeenCalledOnce())
    const [workbook, fileName] = vi.mocked(writeFile).mock.calls[0] as [WorkBook, string]
    expect(fileName).toBe('Kasica 2026.xlsx')
    expect(workbook.SheetNames).toEqual(['Troškovi', 'Prihodi', 'Štednja', 'Pregled po mesecima'])

    const expenses = workbook.Sheets['Troškovi']
    expect(expenses['!ref']).toBe('A1:H5')
    expect(expenses.B4.v).toBe('Stara kategorija')
    expect(expenses.F2.v).toBe('Ja')

    const months = workbook.Sheets['Pregled po mesecima']
    expect([months.A2.v, months.G2.v]).toEqual(['Septembar 2026', 28000])
    expect([months.A3.v, months.B3.v, months.D3.v, months.G3.v]).toEqual(['Oktobar 2026', 28000, 98000, 96000])
    expect([months.A4.v, months.E4.v]).toEqual(['UKUPNO', 64000])
  })
})
