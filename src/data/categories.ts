import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type Category = Tables<'categories'>

/** All categories of the household, archived included, in display order. */
export async function fetchCategories(householdId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('sort')
    .order('name')
  if (error) throw error
  return data
}
