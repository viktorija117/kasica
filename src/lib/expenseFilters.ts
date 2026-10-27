import type { Expense, Necessity } from '../data/expenses'
import { searchKey } from './text'

/** `null` means "any"; `paidBy: 'none'` matches expenses without a payer. */
export type ExpenseFilters = {
  search: string
  categoryId: string | null
  necessity: Necessity | null
  paidBy: string | 'none' | null
}

export const emptyFilters: ExpenseFilters = {
  search: '',
  categoryId: null,
  necessity: null,
  paidBy: null,
}

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.categoryId !== null ||
    filters.necessity !== null ||
    filters.paidBy !== null
  )
}

type Filterable = Pick<Expense, 'description' | 'category_id' | 'necessity' | 'paid_by'>

export function filterExpenses<T extends Filterable>(expenses: readonly T[], filters: ExpenseFilters): T[] {
  const query = searchKey(filters.search)
  return expenses.filter((expense) => {
    if (query && !searchKey(expense.description).includes(query)) return false
    if (filters.categoryId && expense.category_id !== filters.categoryId) return false
    if (filters.necessity && expense.necessity !== filters.necessity) return false
    if (filters.paidBy === 'none') return expense.paid_by === null
    if (filters.paidBy && expense.paid_by !== filters.paidBy) return false
    return true
  })
}
