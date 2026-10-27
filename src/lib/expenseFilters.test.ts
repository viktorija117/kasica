import { emptyFilters, filterExpenses, hasActiveFilters } from './expenseFilters'

const expenses = [
  { id: '1', description: 'Hleb', category_id: 'food', necessity: 'needed', paid_by: 'me' },
  { id: '2', description: 'Čips i sok', category_id: 'snacks', necessity: 'unneeded', paid_by: 'partner' },
  { id: '3', description: 'Struja', category_id: 'bills', necessity: 'needed', paid_by: null },
  { id: '4', description: 'Ćevapi', category_id: 'snacks', necessity: 'unneeded', paid_by: 'me' },
] as const

const ids = (filters: Partial<typeof emptyFilters>) =>
  filterExpenses(expenses, { ...emptyFilters, ...filters }).map((e) => e.id)

describe('filterExpenses', () => {
  it('returns everything without filters', () => {
    expect(ids({})).toEqual(['1', '2', '3', '4'])
  })

  it('searches descriptions ignoring case and diacritics', () => {
    expect(ids({ search: 'cips' })).toEqual(['2'])
    expect(ids({ search: '  SOK ' })).toEqual(['2'])
    expect(ids({ search: 'ćev' })).toEqual(['4'])
    expect(ids({ search: 'xyz' })).toEqual([])
  })

  it('filters by category, necessity and payer', () => {
    expect(ids({ categoryId: 'snacks' })).toEqual(['2', '4'])
    expect(ids({ necessity: 'needed' })).toEqual(['1', '3'])
    expect(ids({ paidBy: 'me' })).toEqual(['1', '4'])
    expect(ids({ paidBy: 'none' })).toEqual(['3'])
  })

  it('combines all filters', () => {
    expect(ids({ categoryId: 'snacks', paidBy: 'me', search: 'c' })).toEqual(['4'])
  })
})

describe('hasActiveFilters', () => {
  it('is false only when nothing is set', () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false)
    expect(hasActiveFilters({ ...emptyFilters, search: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...emptyFilters, search: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...emptyFilters, paidBy: 'none' })).toBe(true)
  })
})
