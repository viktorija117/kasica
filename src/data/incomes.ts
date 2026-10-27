import { endOfMonthKey, type MonthKey } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

export type Income = Tables<'incomes'>

/** The fields the income form edits. */
export type IncomeInput = Pick<
  TablesInsert<'incomes'>,
  'date' | 'source' | 'amount' | 'received_by' | 'note'
>

/** Incomes of one month, newest first. */
export async function fetchIncomes(householdId: string, month: MonthKey): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('household_id', householdId)
    .gte('date', month)
    .lte('date', endOfMonthKey(month))
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createIncome(householdId: string, input: IncomeInput): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIncome(id: string, input: IncomeInput): Promise<Income> {
  const { data, error } = await supabase.from('incomes').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id)
  if (error) throw error
}
