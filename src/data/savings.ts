import { endOfMonthKey, type MonthKey } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

/** A deposit (positive amount) or a withdrawal (negative amount). */
export type Saving = Tables<'savings'>

/** The fields the savings form edits. */
export type SavingInput = Pick<TablesInsert<'savings'>, 'date' | 'amount' | 'note'>

/** Savings of one month, newest first. */
export async function fetchSavings(householdId: string, month: MonthKey): Promise<Saving[]> {
  const { data, error } = await supabase
    .from('savings')
    .select('*')
    .eq('household_id', householdId)
    .gte('date', month)
    .lte('date', endOfMonthKey(month))
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createSaving(householdId: string, input: SavingInput): Promise<Saving> {
  const { data, error } = await supabase
    .from('savings')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSaving(id: string, input: SavingInput): Promise<Saving> {
  const { data, error } = await supabase.from('savings').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSaving(id: string): Promise<void> {
  const { error } = await supabase.from('savings').delete().eq('id', id)
  if (error) throw error
}
