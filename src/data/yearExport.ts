import { supabase } from '../lib/supabase'
import type { Expense } from './expenses'
import type { Income } from './incomes'
import type { Saving } from './savings'

export type YearRows = { expenses: Expense[]; incomes: Income[]; savings: Saving[] }

/** Supabase returns at most 1000 rows per request, so a year is read page by page. */
const PAGE = 1000

type Page<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>

async function fetchAll<T>(page: Page<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

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
