import type { Category } from '../data/categories'
import type { Expense, ExpenseInput, ExpenseSuggestion, Necessity } from '../data/expenses'
import type { DateKey } from './dates'
import { parseAmount } from './money'

// numeric(12, 2) in the database.
const MAX_AMOUNT = 9_999_999_999.99

export type ExpenseFormState = {
  amountText: string
  categoryId: string | null
  description: string
  date: DateKey
  necessity: Necessity
  /** Once the user flips Potrebno/Bespotrebno themselves, a category change no longer does. */
  necessityTouched: boolean
  paidBy: string | null
  note: string
}

export type ExpenseFormAction =
  | { type: 'amount'; value: string }
  | { type: 'category'; category: Pick<Category, 'id' | 'default_necessity'> }
  | { type: 'description'; value: string }
  | { type: 'suggestion'; suggestion: Pick<ExpenseSuggestion, 'description' | 'category_id' | 'necessity'> }
  | { type: 'date'; value: DateKey }
  | { type: 'necessity'; value: Necessity }
  | { type: 'paidBy'; value: string | null }
  | { type: 'note'; value: string }
  /** "Sačuvaj i dodaj još": start a new expense but keep the date and the payer. */
  | { type: 'next' }

export function newExpenseForm(date: DateKey, paidBy: string | null): ExpenseFormState {
  return {
    amountText: '',
    categoryId: null,
    description: '',
    date,
    necessity: 'needed',
    necessityTouched: false,
    paidBy,
    note: '',
  }
}

export function expenseToForm(expense: Expense): ExpenseFormState {
  return {
    amountText: String(expense.amount).replace('.', ','),
    categoryId: expense.category_id,
    description: expense.description,
    date: expense.date,
    necessity: expense.necessity,
    necessityTouched: true,
    paidBy: expense.paid_by,
    note: expense.note ?? '',
  }
}

export function expenseFormReducer(
  state: ExpenseFormState,
  action: ExpenseFormAction,
): ExpenseFormState {
  switch (action.type) {
    case 'amount':
      return { ...state, amountText: action.value }
    case 'category':
      return {
        ...state,
        categoryId: action.category.id,
        necessity: state.necessityTouched ? state.necessity : action.category.default_necessity,
      }
    case 'description':
      return { ...state, description: action.value }
    case 'suggestion':
      return {
        ...state,
        description: action.suggestion.description,
        categoryId: action.suggestion.category_id,
        necessity: action.suggestion.necessity,
      }
    case 'date':
      return { ...state, date: action.value }
    case 'necessity':
      return { ...state, necessity: action.value, necessityTouched: true }
    case 'paidBy':
      return { ...state, paidBy: action.value }
    case 'note':
      return { ...state, note: action.value }
    case 'next':
      return newExpenseForm(state.date, state.paidBy)
  }
}

export type ExpenseFormError = 'amount' | 'category' | 'date'

export type ExpenseFormResult =
  | { ok: true; input: ExpenseInput }
  | { ok: false; errors: ExpenseFormError[] }

/** Checks the form and turns it into the row to save. */
export function validateExpenseForm(state: ExpenseFormState): ExpenseFormResult {
  const amount = parseAmount(state.amountText)
  const errors: ExpenseFormError[] = []
  if (amount === null || amount <= 0 || amount > MAX_AMOUNT) errors.push('amount')
  if (!state.categoryId) errors.push('category')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date)) errors.push('date')
  if (errors.length > 0 || amount === null || !state.categoryId) return { ok: false, errors }

  const note = state.note.trim()
  return {
    ok: true,
    input: {
      amount,
      category_id: state.categoryId,
      description: state.description.trim().replace(/\s+/g, ' '),
      date: state.date,
      necessity: state.necessity,
      paid_by: state.paidBy,
      note: note === '' ? null : note,
    },
  }
}
