import { createContext, useContext } from 'react'
import type { Expense } from '../data/expenses'
import type { RecurringExpense } from '../data/recurring'
import type { DateKey } from '../lib/dates'

export type ExpenseSheetRequest =
  | { mode: 'add' }
  | { mode: 'edit'; expense: Expense }
  /** Paying a recurring expense; the saved expense gets its `recurring_id`. */
  | { mode: 'pay'; recurring: RecurringExpense; date: DateKey }

export type OpenExpenseSheet = (request: ExpenseSheetRequest) => void

export const ExpenseSheetContext = createContext<OpenExpenseSheet>(() => {
  throw new Error('useExpenseSheet used outside of Layout')
})

/** Opens the add/edit expense sheet from any screen. */
export function useExpenseSheet(): OpenExpenseSheet {
  return useContext(ExpenseSheetContext)
}
