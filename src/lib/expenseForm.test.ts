import type { Expense } from '../data/expenses'
import { expenseFormReducer, expenseToForm, newExpenseForm, validateExpenseForm } from './expenseForm'

const food = { id: 'food', default_necessity: 'needed' } as const
const snacks = { id: 'snacks', default_necessity: 'unneeded' } as const

const start = newExpenseForm('2026-10-27', 'me')

describe('expenseFormReducer', () => {
  it('takes Potrebno/Bespotrebno from the chosen category', () => {
    const state = expenseFormReducer(start, { type: 'category', category: snacks })
    expect(state).toMatchObject({ categoryId: 'snacks', necessity: 'unneeded' })
    expect(expenseFormReducer(state, { type: 'category', category: food }).necessity).toBe('needed')
  })

  it('keeps a manually chosen Potrebno/Bespotrebno when the category changes', () => {
    let state = expenseFormReducer(start, { type: 'necessity', value: 'unneeded' })
    state = expenseFormReducer(state, { type: 'category', category: food })
    expect(state.necessity).toBe('unneeded')
  })

  it('fills the description, category and necessity from a suggestion', () => {
    let state = expenseFormReducer(start, { type: 'category', category: snacks })
    state = expenseFormReducer(state, {
      type: 'suggestion',
      suggestion: { description: 'voda', category_id: 'food', necessity: 'needed' },
    })
    expect(state).toMatchObject({ description: 'voda', categoryId: 'food', necessity: 'needed' })
  })

  it('"next" clears the expense but keeps the date and the payer', () => {
    let state = expenseFormReducer(start, { type: 'date', value: '2026-10-25' })
    state = expenseFormReducer(state, { type: 'paidBy', value: 'partner' })
    state = expenseFormReducer(state, { type: 'amount', value: '120' })
    state = expenseFormReducer(state, { type: 'category', category: snacks })
    state = expenseFormReducer(state, { type: 'description', value: 'čips' })
    state = expenseFormReducer(state, { type: 'note', value: 'Maxi' })

    expect(expenseFormReducer(state, { type: 'next' })).toEqual(newExpenseForm('2026-10-25', 'partner'))
  })
})

describe('validateExpenseForm', () => {
  const filled = { ...start, amountText: '1.234,50', categoryId: 'food', description: '  hleb   i  mleko ' }

  it('builds the row to save', () => {
    expect(validateExpenseForm({ ...filled, note: '  ' })).toEqual({
      ok: true,
      input: {
        amount: 1234.5,
        category_id: 'food',
        description: 'hleb i mleko',
        date: '2026-10-27',
        necessity: 'needed',
        paid_by: 'me',
        note: null,
      },
    })
  })

  it('accepts both decimal separators', () => {
    const amount = (text: string) => {
      const result = validateExpenseForm({ ...filled, amountText: text })
      return result.ok ? result.input.amount : null
    }
    expect(amount('69,99')).toBe(69.99)
    expect(amount('69.99')).toBe(69.99)
  })

  it.each(['', '0', '-5', 'abc', '1,234', '99999999999'])('rejects the amount %j', (amountText) => {
    expect(validateExpenseForm({ ...filled, amountText })).toEqual({ ok: false, errors: ['amount'] })
  })

  it('requires a category and a date', () => {
    expect(validateExpenseForm({ ...start, amountText: '50', date: '' })).toEqual({
      ok: false,
      errors: ['category', 'date'],
    })
  })
})

describe('expenseToForm', () => {
  it('round-trips an existing expense', () => {
    const expense = {
      amount: 69.99,
      category_id: 'snacks',
      description: 'čips',
      date: '2026-10-20',
      necessity: 'unneeded',
      paid_by: null,
      note: 'akcija',
    } as Expense
    const form = expenseToForm(expense)
    expect(form.amountText).toBe('69,99')
    expect(validateExpenseForm(form)).toEqual({
      ok: true,
      input: {
        amount: 69.99,
        category_id: 'snacks',
        description: 'čips',
        date: '2026-10-20',
        necessity: 'unneeded',
        paid_by: null,
        note: 'akcija',
      },
    })
  })
})
