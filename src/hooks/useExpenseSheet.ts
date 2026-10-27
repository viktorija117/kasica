import { createContext, useContext } from 'react'
import type { Expense } from '../data/expenses'

export type ExpenseSheetRequest = { mode: 'add' } | { mode: 'edit'; expense: Expense }

export type OpenExpenseSheet = (request: ExpenseSheetRequest) => void

export const ExpenseSheetContext = createContext<OpenExpenseSheet>(() => {
  throw new Error('useExpenseSheet used outside of Layout')
})

/** Opens the add/edit expense sheet from any screen. */
export function useExpenseSheet(): OpenExpenseSheet {
  return useContext(ExpenseSheetContext)
}
