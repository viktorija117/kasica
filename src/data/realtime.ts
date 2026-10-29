import { supabase } from '../lib/supabase'

export type LiveTable = 'expenses' | 'incomes' | 'savings'

const LIVE_TABLES: readonly LiveTable[] = ['expenses', 'incomes', 'savings']

/**
 * Calls `onChange` whenever a row of `expenses`, `incomes` or `savings` of the household is
 * added, changed or deleted, by anyone. Returns the unsubscribe function.
 *
 * Inserts and updates are filtered by household (and by RLS). Deletes cannot be filtered:
 * Realtime only sends the deleted row's id, so every delete is reported.
 */
export function subscribeToHousehold(householdId: string, onChange: (table: LiveTable) => void): () => void {
  let channel = supabase.channel(`household:${householdId}`)
  for (const table of LIVE_TABLES) {
    const filter = `household_id=eq.${householdId}`
    channel = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, () => onChange(table))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, () => onChange(table))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () => onChange(table))
  }
  channel.subscribe()
  return () => void supabase.removeChannel(channel)
}
