import type { MonthKey } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Views } from '../types/database'

export type MonthCategoryTotalsRow = Views<'month_category_totals'>

/** Spending per month and category for the 12 months of `year`. */
export async function fetchMonthCategoryTotals(
  householdId: string,
  year: number,
): Promise<MonthCategoryTotalsRow[]> {
  const first: MonthKey = `${year}-01-01`
  const last: MonthKey = `${year}-12-01`
  const { data, error } = await supabase
    .from('month_category_totals')
    .select('*')
    .eq('household_id', householdId)
    .gte('month', first)
    .lte('month', last)
    .order('month')
  if (error) throw error
  return data
}
