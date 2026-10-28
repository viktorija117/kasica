// Recurring expenses: when each one is due, what is still unpaid in a month, and the editor.
import type { Category } from '../data/categories'
import type { Expense, Necessity } from '../data/expenses'
import type { RecurringExpense, RecurringInput } from '../data/recurring'
import { sumAmounts } from './budget'
import { daysInMonth, monthOfDate, toDateKey, type DateKey, type MonthKey } from './dates'
import { amountToText, MAX_AMOUNT, parseAmount } from './money'

/** Day `dayOfMonth` of the month; a day the month does not have becomes its last day. */
export function dueDate(month: MonthKey, dayOfMonth: number): DateKey {
  const day = Math.min(dayOfMonth, daysInMonth(month))
  return `${month.slice(0, 8)}${String(day).padStart(2, '0')}`
}

export type DueStatus = 'late' | 'today' | 'upcoming'

export type DueItem<R> = { recurring: R; date: DateKey; status: DueStatus }

export type MonthDue<R> = {
  /** Not paid yet, earliest due date first. */
  pending: DueItem<R>[]
  /** Sum of the pending amounts. */
  pendingTotal: number
  /** How many of the month's recurring expenses are already paid. */
  paidCount: number
}

type DueRecurring = Pick<RecurringExpense, 'id' | 'amount' | 'day_of_month' | 'active' | 'sort' | 'created_at'>

/**
 * What is due in `month`. A recurring expense belongs to a month once it exists: its first
 * due date is the first one on or after the day it was added, so adding "Kirija, 1." on the
 * 28th does not flag this month's rent (paid before the app knew about it) as late.
 * It counts as paid when the month has an expense with its `recurring_id`.
 */
export function monthDue<R extends DueRecurring>(
  recurring: readonly R[],
  expenses: readonly Pick<Expense, 'recurring_id'>[],
  month: MonthKey,
  today: DateKey,
): MonthDue<R> {
  const paidIds = new Set(expenses.map((expense) => expense.recurring_id).filter((id) => id !== null))
  const pending: DueItem<R>[] = []
  let paidCount = 0

  for (const item of recurring) {
    if (!item.active) continue
    const date = dueDate(month, item.day_of_month)
    if (date < toDateKey(new Date(item.created_at))) continue
    if (paidIds.has(item.id)) {
      paidCount += 1
      continue
    }
    const status: DueStatus = date < today ? 'late' : date === today ? 'today' : 'upcoming'
    pending.push({ recurring: item, date, status })
  }

  pending.sort((a, b) => a.date.localeCompare(b.date) || a.recurring.sort - b.recurring.sort)
  return {
    pending,
    pendingTotal: sumAmounts(pending.map((item) => item.recurring)),
    paidCount,
  }
}

/** Date a payment is entered with: today in the current month, else the due date. */
export function paymentDate(due: DateKey, today: DateKey): DateKey {
  return monthOfDate(due) === monthOfDate(today) ? today : due
}

// --- editor --------------------------------------------------------------------------------

export type RecurringFormState = {
  name: string
  categoryId: string | null
  amountText: string
  day: number
  necessity: Necessity
  /** Once the user flips Potrebno/Bespotrebno themselves, a category change no longer does. */
  necessityTouched: boolean
}

export type RecurringFormError = 'name' | 'category' | 'amount' | 'day'

export type RecurringFormResult =
  | { ok: true; input: RecurringInput }
  | { ok: false; errors: RecurringFormError[] }

export function newRecurringForm(): RecurringFormState {
  return { name: '', categoryId: null, amountText: '', day: 1, necessity: 'needed', necessityTouched: false }
}

export function recurringToForm(recurring: RecurringExpense): RecurringFormState {
  return {
    name: recurring.name,
    categoryId: recurring.category_id,
    amountText: amountToText(recurring.amount),
    day: recurring.day_of_month,
    necessity: recurring.necessity,
    necessityTouched: true,
  }
}

/** Picking a category also picks its default necessity, unless the user already chose one. */
export function withCategory(
  state: RecurringFormState,
  category: Pick<Category, 'id' | 'default_necessity'>,
): RecurringFormState {
  return {
    ...state,
    categoryId: category.id,
    necessity: state.necessityTouched ? state.necessity : category.default_necessity,
  }
}

export function validateRecurringForm(state: RecurringFormState): RecurringFormResult {
  const errors: RecurringFormError[] = []
  const name = state.name.trim().replace(/\s+/g, ' ')
  if (name === '' || name.length > 100) errors.push('name')
  if (!state.categoryId) errors.push('category')
  const amount = parseAmount(state.amountText)
  if (amount === null || amount <= 0 || amount > MAX_AMOUNT) errors.push('amount')
  if (!Number.isInteger(state.day) || state.day < 1 || state.day > 31) errors.push('day')
  if (errors.length > 0 || amount === null || !state.categoryId) return { ok: false, errors }

  return {
    ok: true,
    input: {
      name,
      category_id: state.categoryId,
      amount,
      day_of_month: state.day,
      necessity: state.necessity,
    },
  }
}
