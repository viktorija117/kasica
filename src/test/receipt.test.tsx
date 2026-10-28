import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeReceipts, resetBackend, seedExpense, setFiscalSiteAnswer } from './fakeBackend'
import { RECEIPT_URL } from './receiptFixtures'
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 18, 0))
  resetBackend({ signedIn: true, withHousehold: true })
  // Earlier expenses the category suggestions come from.
  seedExpense({ date: '2026-10-20', amount: 120, description: 'Hleb', category_id: 'cat-1' })
  seedExpense({ date: '2026-10-21', amount: 180, description: 'Čokolada', category_id: 'cat-3', necessity: 'unneeded' })
})

afterEach(() => {
  vi.useRealTimers()
})

async function loadReceipt(link = RECEIPT_URL) {
  const user = userEvent.setup()
  renderApp('/racun')
  await user.type(await screen.findByLabelText('Ili nalepi link sa računa'), link)
  await user.click(screen.getByRole('button', { name: 'Učitaj račun' }))
  return user
}

const item = (name: string) => screen.getByRole('group', { name })

describe('Scanning a receipt', () => {
  it('is opened from the new expense sheet', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Dodaj trošak' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Skeniraj račun' }))

    expect(await screen.findByRole('heading', { name: 'Skeniranje računa' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // No camera in the test browser: the link can still be pasted.
    expect(screen.getByText('Kamera nije dostupna. Nalepi link sa računa ispod.')).toBeInTheDocument()
  })

  it('rejects a link that is not a fiscal receipt', async () => {
    await loadReceipt('https://example.com/racun')
    expect(screen.getByRole('alert')).toHaveTextContent('Link nije ispravan')
    expect(fakeReceipts.fetchFiscalReceipt).not.toHaveBeenCalled()
  })

  it('shows the store, date, payer and every item with suggested categories', async () => {
    await loadReceipt()

    expect(await screen.findByLabelText('Prodavnica')).toHaveValue('Maxi 241')
    expect(screen.getByLabelText('Datum')).toHaveValue('2026-10-28')
    expect(screen.getByRole('button', { name: 'Ja' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Stavke (4)' })).toBeInTheDocument()

    expect(within(item('Hleb beli 500g')).getByLabelText('Iznos')).toHaveValue('179,98')
    expect(within(item('Hleb beli 500g')).getByText('2 × 89,99 RSD')).toBeInTheDocument()
    expect(within(item('Banane')).getByText('0,512 × 169,99 RSD')).toBeInTheDocument()
    expect(within(item('Hleb beli 500g')).getByLabelText('Kategorija')).toHaveValue('cat-1')
    // The discount is already taken off the chocolate.
    const chocolate = item('Čokolada Milka mlečna 100g sa lešnicima')
    expect(within(chocolate).getByLabelText('Iznos')).toHaveValue('199,99')
    expect(within(chocolate).getByLabelText('Kategorija')).toHaveValue('cat-3')
    expect(within(chocolate).getByRole('button', { name: 'Bespotrebno' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(item('Banane')).getByLabelText('Kategorija')).toHaveValue('')

    expect(screen.getByText('Zbir se slaže sa računom ✓')).toBeInTheDocument()
  })

  it('edits, removes and merges items, then saves them all with the receipt', async () => {
    const user = await loadReceipt()
    await screen.findByRole('heading', { name: 'Stavke (4)' })

    await user.selectOptions(screen.getByLabelText('Kategorija za ceo račun'), 'cat-1')
    expect(within(item('Banane')).getByLabelText('Kategorija')).toHaveValue('cat-1')

    await user.selectOptions(within(item('Deterdžent za sudove 1l')).getByLabelText('Kategorija'), 'cat-2')
    await user.click(screen.getByRole('button', { name: 'Izbaci: Banane' }))
    expect(screen.getByRole('heading', { name: 'Izbačeno (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Označi za spajanje: Hleb beli 500g' }))
    await user.click(screen.getByRole('checkbox', { name: 'Označi za spajanje: Čokolada Milka mlečna 100g sa lešnicima' }))
    await user.click(screen.getByRole('button', { name: 'Spoji označene (2)' }))

    const merged = item('Hleb beli 500g')
    expect(within(merged).getByLabelText('Iznos')).toHaveValue('379,97')
    expect(within(merged).getByText('spojeno 2 stavke')).toBeInTheDocument()
    expect(screen.getByText(/Razlika: -87,03/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sačuvaj sve (2)' }))

    expect(fakeReceipts.saveReceipt).toHaveBeenCalledWith(
      'hh-1',
      { url: RECEIPT_URL, store: 'Maxi 241', date: '2026-10-28', total: 1716.99 },
      [
        { date: '2026-10-28', category_id: 'cat-1', description: 'Hleb beli 500g', amount: 379.97, necessity: 'needed', paid_by: 'user-me', note: null },
        { date: '2026-10-28', category_id: 'cat-2', description: 'Deterdžent za sudove 1l', amount: 1249.99, necessity: 'needed', paid_by: 'user-me', note: null },
      ],
    )
    expect(await screen.findByText('Sačuvano: 2 troška sa računa')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Troškovi' })).toBeInTheDocument()
    expect(await screen.findByText('Deterdžent za sudove 1l')).toBeInTheDocument()
  })

  it('asks for a category before saving', async () => {
    const user = await loadReceipt()
    await user.click(await screen.findByRole('button', { name: 'Sačuvaj sve (4)' }))

    expect(screen.getByText('Neke stavke nisu potpune, pogledaj crveno označene.')).toBeInTheDocument()
    expect(within(item('Banane')).getByText('Izaberi kategoriju ovde ili za ceo račun gore.')).toBeInTheDocument()
    expect(fakeReceipts.saveReceipt).not.toHaveBeenCalled()
  })

  it('warns when the same receipt is scanned again', async () => {
    const user = await loadReceipt()
    await user.selectOptions(await screen.findByLabelText('Kategorija za ceo račun'), 'cat-1')
    await user.click(screen.getByRole('button', { name: 'Sačuvaj sve (4)' }))
    await screen.findByRole('heading', { name: 'Troškovi' })

    await user.click(screen.getByRole('button', { name: 'Dodaj trošak' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Skeniraj račun' }))
    await user.type(await screen.findByLabelText('Ili nalepi link sa računa'), RECEIPT_URL)
    await user.click(screen.getByRole('button', { name: 'Učitaj račun' }))

    expect(await screen.findByText(/Ovaj račun je već unet \(Maxi 241/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sačuvaj sve (4)' })).toBeDisabled()
  })

  it('explains a failed fetch and still allows entering the expense by hand', async () => {
    setFiscalSiteAnswer(RECEIPT_URL, 'receipt_site_unavailable')
    const user = await loadReceipt()

    expect(await screen.findByText(/Sajt Poreske uprave trenutno ne odgovara/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Račun nema QR kod? Unesi trošak ručno' }))
    expect(await screen.findByRole('dialog', { name: 'Novi trošak' })).toBeInTheDocument()
  })
})
