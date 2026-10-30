import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

export type RecurringExpense = Tables<'recurring_expenses'>

/** The fields the recurring expense editor changes. */
export type RecurringInput = Pick<
  TablesInsert<'recurring_expenses'>,
  'name' | 'category_id' | 'amount' | 'day_of_month' | 'necessity'
>

/** A change to one recurring expense: its editable fields or switching it on and off. */
export type RecurringPatch = Partial<RecurringInput> & { active?: boolean }

/** All recurring expenses of the household, inactive included, in display order. */
export async function fetchRecurring(householdId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', householdId)
    .order('sort')
    .order('created_at')
  if (error) throw error
  return data
}

export async function createRecurring(
  householdId: string,
  input: RecurringInput & { id: string; sort: number },
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurring(id: string, patch: RecurringPatch): Promise<RecurringExpense> {
  const { data, error } = await supabase.from('recurring_expenses').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Expenses already paid for it stay; they just lose the link (`on delete set null`). */
export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
}

/** Saves the order of recurring expenses: the first id comes first. */
export async function reorderRecurring(householdId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_recurring_expenses', { p_household_id: householdId, p_ids: ids })
  if (error) throw error
}
