import { receiptBalance, sumAmounts } from './budget'
import type { ParsedReceipt } from './receipt'
import {
  keptAmounts,
  markedCount,
  newReceiptReview,
  receiptReviewReducer,
  validateReceiptReview,
  type ReceiptReviewAction,
  type ReceiptReviewState,
} from './receiptReview'

const receipt: ParsedReceipt = {
  store: 'Maxi 241',
  date: '2026-10-28',
  total: 1716.99,
  invoiceNumber: 'XEJ2FKZA-XEJ2FKZA-1680',
  items: [
    { name: 'Hleb beli 500g', quantity: 2, unitPrice: 89.99, total: 179.98, taxLabel: 'Е' },
    { name: 'Banane', quantity: 0.512, unitPrice: 169.99, total: 87.03, taxLabel: 'Е' },
    { name: 'Čokolada Milka', quantity: 1, unitPrice: 219.99, total: 199.99, taxLabel: 'Ђ' },
    { name: 'Deterdžent za sudove 1l', quantity: 1, unitPrice: 1249.99, total: 1249.99, taxLabel: 'Ђ' },
  ],
}

const suggestions = [
  { description: 'Hleb', category_id: 'cat-food', necessity: 'needed' as const, uses: 9, last_date: '2026-10-20' },
  { description: 'Čokolada', category_id: 'cat-snacks', necessity: 'unneeded' as const, uses: 3, last_date: '2026-10-10' },
  { description: 'Banane', category_id: 'cat-old', necessity: 'needed' as const, uses: 1, last_date: '2026-01-10' },
]

const food = { id: 'cat-food', default_necessity: 'needed' as const }
const home = { id: 'cat-home', default_necessity: 'needed' as const }
const fun = { id: 'cat-fun', default_necessity: 'unneeded' as const }

function start(): ReceiptReviewState {
  return newReceiptReview(receipt, {
    today: '2026-10-30',
    paidBy: 'user-me',
    suggestions,
    activeCategoryIds: new Set(['cat-food', 'cat-snacks', 'cat-home', 'cat-fun']),
  })
}

const run = (state: ReceiptReviewState, ...actions: ReceiptReviewAction[]) =>
  actions.reduce(receiptReviewReducer, state)

describe('newReceiptReview', () => {
  it('takes the store and date from the receipt and one line per item', () => {
    const state = start()
    expect(state).toMatchObject({ store: 'Maxi 241', date: '2026-10-28', paidBy: 'user-me', categoryId: null })
    expect(state.lines.map((line) => [line.name, line.amountText])).toEqual([
      ['Hleb beli 500g', '179,98'],
      ['Banane', '87,03'],
      ['Čokolada Milka', '199,99'],
      ['Deterdžent za sudove 1l', '1249,99'],
    ])
  })

  it('suggests category and necessity from similar past expenses, skipping archived categories', () => {
    const [bread, bananas, chocolate, soap] = start().lines
    expect(bread).toMatchObject({ categoryId: 'cat-food', categorySource: 'suggested' })
    expect(chocolate).toMatchObject({ categoryId: 'cat-snacks', necessity: 'unneeded' })
    expect(bananas).toMatchObject({ categoryId: null, categorySource: 'receipt' })
    expect(soap.categoryId).toBeNull()
  })

  it('uses today when the receipt has no date', () => {
    const state = newReceiptReview({ ...receipt, date: null }, {
      today: '2026-10-30',
      paidBy: null,
      suggestions: [],
      activeCategoryIds: new Set(),
    })
    expect(state.date).toBe('2026-10-30')
  })
})

describe('receiptReviewReducer', () => {
  it('fills lines without a suggestion from the receipt category, and keeps changing them', () => {
    const state = run(start(), { type: 'receiptCategory', category: fun }, { type: 'receiptCategory', category: home })
    expect(state.lines.map((line) => line.categoryId)).toEqual(['cat-food', 'cat-home', 'cat-snacks', 'cat-home'])
    expect(state.lines[1].necessity).toBe('needed')
  })

  it('never overrides a category picked for one line', () => {
    const state = run(
      start(),
      { type: 'lineCategory', key: 'item-1', category: fun },
      { type: 'receiptCategory', category: home },
    )
    expect(state.lines[1]).toMatchObject({ categoryId: 'cat-fun', necessity: 'unneeded' })
  })

  it('keeps a necessity chosen by hand when the category changes', () => {
    const state = run(
      start(),
      { type: 'lineNecessity', key: 'item-3', value: 'unneeded' },
      { type: 'lineCategory', key: 'item-3', category: home },
    )
    expect(state.lines[3].necessity).toBe('unneeded')
  })

  it('leaves removed lines out of the sum and can bring them back', () => {
    const removed = run(start(), { type: 'toggleRemoved', key: 'item-3' })
    expect(sumAmounts(keptAmounts(removed))).toBe(467)
    expect(receiptBalance(keptAmounts(removed), receipt.total).difference).toBe(-1249.99)
    const back = run(removed, { type: 'toggleRemoved', key: 'item-3' })
    expect(sumAmounts(keptAmounts(back))).toBe(1716.99)
  })

  it('merges marked lines into one at the place of the first, with their sum', () => {
    const state = run(
      start(),
      { type: 'toggleMarked', key: 'item-0' },
      { type: 'toggleMarked', key: 'item-2' },
      { type: 'mergeMarked' },
    )
    expect(state.lines.map((line) => [line.name, line.amountText])).toEqual([
      ['Hleb beli 500g', '379,97'],
      ['Banane', '87,03'],
      ['Deterdžent za sudove 1l', '1249,99'],
    ])
    expect(state.lines[0]).toMatchObject({ categoryId: 'cat-food', marked: false })
    expect(markedCount(state)).toBe(0)
    expect(sumAmounts(keptAmounts(state))).toBe(1716.99)
  })

  it('does not merge a single line', () => {
    const state = run(start(), { type: 'toggleMarked', key: 'item-0' }, { type: 'mergeMarked' })
    expect(state.lines).toHaveLength(4)
  })

  it('splits a merged line back into the receipt lines, also after merging twice', () => {
    const merged = run(
      start(),
      { type: 'toggleMarked', key: 'item-0' },
      { type: 'toggleMarked', key: 'item-1' },
      { type: 'mergeMarked' },
    )
    const twice = run(
      merged,
      { type: 'toggleMarked', key: merged.lines[0].key },
      { type: 'toggleMarked', key: 'item-2' },
      { type: 'mergeMarked' },
    )
    expect(twice.lines[0].amountText).toBe('467')
    const split = run(twice, { type: 'split', key: twice.lines[0].key })
    expect(split.lines.map((line) => line.key)).toEqual(['item-0', 'item-1', 'item-2', 'item-3'])
    expect(split.lines.every((line) => !line.marked)).toBe(true)
  })
})

describe('validateReceiptReview', () => {
  it('turns kept lines into expenses of the receipt date and payer', () => {
    const state = run(
      start(),
      { type: 'receiptCategory', category: home },
      { type: 'toggleRemoved', key: 'item-1' },
      { type: 'lineName', key: 'item-0', value: '  Hleb   beli ' },
      { type: 'lineAmount', key: 'item-3', value: '1.200' },
    )
    const result = validateReceiptReview(state)
    expect(result).toEqual({
      ok: true,
      expenses: [
        { date: '2026-10-28', category_id: 'cat-food', description: 'Hleb beli', amount: 179.98, necessity: 'needed', paid_by: 'user-me', note: null },
        { date: '2026-10-28', category_id: 'cat-snacks', description: 'Čokolada Milka', amount: 199.99, necessity: 'unneeded', paid_by: 'user-me', note: null },
        { date: '2026-10-28', category_id: 'cat-home', description: 'Deterdžent za sudove 1l', amount: 1200, necessity: 'needed', paid_by: 'user-me', note: null },
      ],
    })
  })

  it('reports lines without a category or a valid amount', () => {
    const state = run(start(), { type: 'lineAmount', key: 'item-0', value: '0' })
    expect(validateReceiptReview(state)).toEqual({
      ok: false,
      date: false,
      empty: false,
      lines: { 'item-0': ['amount'], 'item-1': ['category'], 'item-3': ['category'] },
    })
  })

  it('needs at least one line and a date', () => {
    let state = run(start(), { type: 'receiptCategory', category: food }, { type: 'date', value: '' })
    for (const line of state.lines) state = run(state, { type: 'toggleRemoved', key: line.key })
    expect(validateReceiptReview(state)).toMatchObject({ ok: false, date: true, empty: true })
  })
})
