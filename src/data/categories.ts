import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

export type Category = Tables<'categories'>

/** The fields the category editor changes. */
export type CategoryInput = Pick<
  TablesInsert<'categories'>,
  'name' | 'emoji' | 'color' | 'monthly_limit' | 'default_necessity'
>

/** A change to one category: its editable fields or archiving. */
export type CategoryPatch = Partial<CategoryInput> & { archived?: boolean }

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

export async function createCategory(
  householdId: string,
  input: CategoryInput & { id: string; sort: number },
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, patch: CategoryPatch): Promise<Category> {
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Saves the order of categories: the first id comes first. */
export async function reorderCategories(householdId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_categories', { p_household_id: householdId, p_ids: ids })
  if (error) throw error
}
