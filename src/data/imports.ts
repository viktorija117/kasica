import type { ImportPlan } from '../lib/excelImport'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ImportBatch = Pick<Tables<'import_batches'>, 'id' | 'file_name' | 'created_at'>

/** Earlier imports of the household, newest first. */
export async function fetchImportBatches(householdId: string): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('id, file_name, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Writes the whole plan in one transaction; returns the new batch id. */
export async function importWorkbook(
  householdId: string,
  fileName: string,
  plan: ImportPlan,
): Promise<string> {
  const { data, error } = await supabase.rpc('import_workbook', {
    p_household_id: householdId,
    p_file_name: fileName,
    p_categories: plan.categories,
    p_expenses: plan.expenses,
    p_incomes: plan.incomes,
    p_savings: plan.savings,
    p_carry: plan.carry,
  })
  if (error) throw error
  return data
}

/** Deletes everything the import wrote and restores the month settings it changed. */
export async function undoImport(batchId: string): Promise<void> {
  const { error } = await supabase.rpc('undo_import', { p_batch_id: batchId })
  if (error) throw error
}
