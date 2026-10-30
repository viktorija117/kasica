import { supabase } from '../lib/supabase'
import type { Expense } from './expenses'
import { fetchAll, type Page } from './fetchAll'
import type { Income } from './incomes'
import type { Saving } from './savings'

export type YearRows = { expenses: Expense[]; incomes: Income[]; savings: Saving[] }

/** Rows of `table` in `year`, oldest first; the order is stable so pages never overlap. */
function yearPage(table: 'expenses' | 'incomes' | 'savings', householdId: string, year: number) {
  return (from: number, to: number) =>
    supabase
      .from(table)
      .select('*')
      .eq('household_id', householdId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date')
      .order('created_at')
      .order('id')
      .range(from, to)
}

/** Every expense, income and saving of `year`, oldest first. */
export async function fetchYearRows(householdId: string, year: number): Promise<YearRows> {
  const [expenses, incomes, savings] = await Promise.all([
    fetchAll(yearPage('expenses', householdId, year) as Page<Expense>),
    fetchAll(yearPage('incomes', householdId, year) as Page<Income>),
    fetchAll(yearPage('savings', householdId, year) as Page<Saving>),
  ])
  return { expenses, incomes, savings }
}
