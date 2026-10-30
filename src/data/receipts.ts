import type { ExpenseInput } from './expenses'
import type { DateKey } from '../lib/dates'
import type { RawReceipt } from '../lib/receipt'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type SavedReceipt = Pick<Tables<'receipts'>, 'id' | 'store' | 'date' | 'created_at'>

/** A receipt to save; `url` is the normalized verification link. */
export type ReceiptInput = { url: string; store: string; date: DateKey; total: number | null }

/**
 * Fetches a receipt through the `fiscal-receipt` Edge Function. Errors carry the function's
 * code as their message (`receipt_not_found`, `receipt_site_unavailable`, …).
 */
export async function fetchFiscalReceipt(url: string): Promise<RawReceipt> {
  const { data, error } = await supabase.functions.invoke<RawReceipt>('fiscal-receipt', {
    body: { url },
  })
  if (!error && data) return data
  const response: unknown = (error as { context?: unknown } | null)?.context
  if (response instanceof Response) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null
    if (typeof body?.error === 'string') throw new Error(body.error)
  }
  throw error ?? new Error('receipt_site_unavailable')
}

// A started function stays running for a few minutes; warming it again sooner is wasted.
const WARM_FOR_MS = 3 * 60_000
let warmedAt = -Infinity

/**
 * Starts the `fiscal-receipt` Edge Function while the camera is still aiming, so reading the
 * receipt does not wait for its cold start. Failures do not matter.
 */
export function warmUpFiscalReceipt(): void {
  if (Date.now() - warmedAt < WARM_FOR_MS) return
  warmedAt = Date.now()
  supabase.functions.invoke('fiscal-receipt', { body: { warm: true } }).catch(() => undefined)
}

/** The receipt already saved with this link, if any. */
export async function findReceiptByUrl(householdId: string, url: string): Promise<SavedReceipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('id, store, date, created_at')
    .eq('household_id', householdId)
    .eq('url', url)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Writes the receipt and its expenses in one transaction; returns the receipt id. */
export async function saveReceipt(
  householdId: string,
  receipt: ReceiptInput,
  expenses: ExpenseInput[],
): Promise<string> {
  const { data, error } = await supabase.rpc('save_receipt', {
    p_household_id: householdId,
    p_url: receipt.url,
    p_store: receipt.store,
    p_date: receipt.date,
    p_total: receipt.total,
    p_expenses: expenses,
  })
  if (error) throw error
  return data
}
