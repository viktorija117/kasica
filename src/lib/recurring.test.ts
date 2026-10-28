import type { RecurringExpense } from '../data/recurring'
import {
  dueDate,
  monthDue,
  newRecurringForm,
  paymentDate,
  recurringToForm,
  validateRecurringForm,
  withCategory,
  type RecurringFormState,
} from './recurring'

function recurring(patch: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: 'rec-1',
    household_id: 'hh-1',
    name: 'Kirija',
    category_id: 'cat-1',
    amount: 40000,
    day_of_month: 1,
    necessity: 'needed',
    active: true,
    sort: 1,
    // Long before the months in these tests.
    created_at: '2026-01-01T09:00:00',
    ...patch,
  }
}

const paid = (recurringId: string) => ({ recurring_id: recurringId })

describe('dueDate', () => {
  it('is the given day of the month', () => {
    expect(dueDate('2026-10-01', 1)).toBe('2026-10-01')
    expect(dueDate('2026-10-01', 15)).toBe('2026-10-15')
    expect(dueDate('2026-10-01', 31)).toBe('2026-10-31')
  })

  it('uses the last day when the month is shorter', () => {
    expect(dueDate('2026-11-01', 31)).toBe('2026-11-30')
    expect(dueDate('2026-02-01', 31)).toBe('2026-02-28')
    expect(dueDate('2026-02-01', 29)).toBe('2026-02-28')
    expect(dueDate('2028-02-01', 31)).toBe('2028-02-29')
    expect(dueDate('2028-02-01', 29)).toBe('2028-02-29')
  })
})

describe('monthDue', () => {
  const items = [
    recurring({ id: 'netflix', name: 'Netflix', amount: 1499.99, day_of_month: 20, sort: 3 }),
    recurring({ id: 'kirija', name: 'Kirija', amount: 40000, day_of_month: 1, sort: 1 }),
    recurring({ id: 'struja', name: 'Struja', amount: 6000, day_of_month: 28, sort: 2 }),
  ]

  it('lists the unpaid ones by due day, with late / today / upcoming in the current month', () => {
    const due = monthDue(items, [], '2026-10-01', '2026-10-20')
    expect(due.pending.map((item) => [item.recurring.id, item.date, item.status])).toEqual([
      ['kirija', '2026-10-01', 'late'],
      ['netflix', '2026-10-20', 'today'],
      ['struja', '2026-10-28', 'upcoming'],
    ])
    expect(due.pendingTotal).toBe(47499.99)
    expect(due.paidCount).toBe(0)
  })

  it('leaves out the ones paid this month', () => {
    const due = monthDue(items, [paid('kirija'), { recurring_id: null }], '2026-10-01', '2026-10-20')
    expect(due.pending.map((item) => item.recurring.id)).toEqual(['netflix', 'struja'])
    expect(due.pendingTotal).toBe(7499.99)
    expect(due.paidCount).toBe(1)
  })

  it('only looks at the expenses it is given (one month), so paying in another month does not count', () => {
    // The caller passes November's expenses; October's payment of the rent is not among them.
    const due = monthDue(items, [], '2026-11-01', '2026-10-20')
    expect(due.pending).toHaveLength(3)
  })

  it('marks everything unpaid as late in a past month and nothing in a future one', () => {
    expect(monthDue(items, [], '2026-09-01', '2026-10-20').pending.every((item) => item.status === 'late')).toBe(true)
    expect(monthDue(items, [], '2026-11-01', '2026-10-20').pending.every((item) => item.status === 'upcoming')).toBe(
      true,
    )
  })

  it('skips inactive ones', () => {
    const due = monthDue([...items, recurring({ id: 'teretana', active: false })], [], '2026-10-01', '2026-10-20')
    expect(due.pending.map((item) => item.recurring.id)).not.toContain('teretana')
  })

  it('moves day 31 to the last day of a short month', () => {
    const due = monthDue([recurring({ id: 'kredit', day_of_month: 31 })], [], '2026-02-01', '2026-02-27')
    expect(due.pending[0]).toMatchObject({ date: '2026-02-28', status: 'upcoming' })
  })

  it('starts with the first due date on or after the day it was added', () => {
    const addedOn28th = [
      recurring({ id: 'kirija', day_of_month: 1, created_at: '2026-10-28T20:00:00' }),
      recurring({ id: 'netflix', day_of_month: 30, created_at: '2026-10-28T20:00:00' }),
      recurring({ id: 'struja', day_of_month: 28, created_at: '2026-10-28T20:00:00' }),
    ]
    expect(monthDue(addedOn28th, [], '2026-10-01', '2026-10-28').pending.map((item) => item.recurring.id)).toEqual([
      'struja',
      'netflix',
    ])
    expect(monthDue(addedOn28th, [], '2026-09-01', '2026-10-28').pending).toEqual([])
    expect(monthDue(addedOn28th, [], '2026-11-01', '2026-10-28').pending).toHaveLength(3)
  })

  it('keeps the order of the list for the same due day', () => {
    const sameDay = [recurring({ id: 'b', sort: 2 }), recurring({ id: 'a', sort: 1 })]
    expect(monthDue(sameDay, [], '2026-10-01', '2026-10-01').pending.map((item) => item.recurring.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('is empty without recurring expenses', () => {
    expect(monthDue([], [], '2026-10-01', '2026-10-20')).toEqual({ pending: [], pendingTotal: 0, paidCount: 0 })
  })
})

describe('paymentDate', () => {
  it('is today in the current month and the due date in other months', () => {
    expect(paymentDate('2026-10-01', '2026-10-20')).toBe('2026-10-20')
    expect(paymentDate('2026-10-28', '2026-10-20')).toBe('2026-10-20')
    expect(paymentDate('2026-09-01', '2026-10-20')).toBe('2026-09-01')
    expect(paymentDate('2026-11-05', '2026-10-20')).toBe('2026-11-05')
  })
})

describe('recurring form', () => {
  const form = (patch: Partial<RecurringFormState>): RecurringFormState => ({
    ...newRecurringForm(),
    name: '  Struja   EPS ',
    categoryId: 'cat-2',
    amountText: '6.250,50',
    day: 31,
    ...patch,
  })

  it('turns a filled form into the row to save', () => {
    expect(validateRecurringForm(form({}))).toEqual({
      ok: true,
      input: { name: 'Struja EPS', category_id: 'cat-2', amount: 6250.5, day_of_month: 31, necessity: 'needed' },
    })
  })

  it('reports every missing or wrong field', () => {
    expect(validateRecurringForm(form({ name: ' ', categoryId: null, amountText: '0', day: 32 }))).toEqual({
      ok: false,
      errors: ['name', 'category', 'amount', 'day'],
    })
    expect(validateRecurringForm(form({ amountText: '' }))).toEqual({ ok: false, errors: ['amount'] })
  })

  it('takes the necessity from the category until the user picks one', () => {
    const picked = withCategory(form({}), { id: 'cat-3', default_necessity: 'unneeded' })
    expect(picked).toMatchObject({ categoryId: 'cat-3', necessity: 'unneeded' })
    const touched = withCategory(form({ necessity: 'needed', necessityTouched: true }), {
      id: 'cat-3',
      default_necessity: 'unneeded',
    })
    expect(touched.necessity).toBe('needed')
  })

  it('round-trips a saved recurring expense', () => {
    const saved = recurring({ name: 'Netflix', amount: 1499.99, day_of_month: 20, necessity: 'unneeded' })
    const result = validateRecurringForm(recurringToForm(saved))
    expect(result).toEqual({
      ok: true,
      input: { name: 'Netflix', category_id: 'cat-1', amount: 1499.99, day_of_month: 20, necessity: 'unneeded' },
    })
  })
})
