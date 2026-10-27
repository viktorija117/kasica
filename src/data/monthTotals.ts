import { supabase } from '../lib/supabase'
import type { Views } from '../types/database'

export type MonthTotalsRow = Views<'month_totals'>

/** Sums of incomes, expenses and savings for every month of the household that has any. */
export async function fetchMonthTotals(householdId: string): Promise<MonthTotalsRow[]> {
  const { data, error } = await supabase
    .from('month_totals')
    .select('*')
    .eq('household_id', householdId)
    .order('month')
  if (error) throw error
  return data
}
