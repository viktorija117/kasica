// State and validation of the income, savings and "Uskladi stanje" forms.
import type { Income, IncomeInput } from '../data/incomes'
import type { Saving, SavingInput } from '../data/savings'
import type { DateKey } from './dates'
import { amountToText, MAX_AMOUNT, parseAmount } from './money'

/** What an income or savings sheet is open for. */
export type EntryRequest<T> = { mode: 'add' } | { mode: 'edit'; entry: T }

export type EntryFormError = 'amount' | 'source' | 'date'

export type FormResult<T> = { ok: true; input: T } | { ok: false; errors: EntryFormError[] }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function readAmount(text: string, errors: EntryFormError[]): number | null {
  const amount = parseAmount(text)
  if (amount === null || amount <= 0 || amount > MAX_AMOUNT) {
    errors.push('amount')
    return null
  }
  return amount
}

function cleanNote(note: string): string | null {
  const trimmed = note.trim()
  return trimmed === '' ? null : trimmed
}

// --- income ------------------------------------------------------------------------------

export type IncomeFormState = {
  amountText: string
  source: string
  date: DateKey
  receivedBy: string | null
  note: string
}

export function newIncomeForm(date: DateKey, receivedBy: string | null): IncomeFormState {
  return { amountText: '', source: '', date, receivedBy, note: '' }
}

export function incomeToForm(income: Income): IncomeFormState {
  return {
    amountText: amountToText(income.amount),
    source: income.source,
    date: income.date,
    receivedBy: income.received_by,
    note: income.note ?? '',
  }
}

export function validateIncomeForm(state: IncomeFormState): FormResult<IncomeInput> {
  const errors: EntryFormError[] = []
  const amount = readAmount(state.amountText, errors)
  const source = state.source.trim().replace(/\s+/g, ' ')
  if (source === '' || source.length > 100) errors.push('source')
  if (!DATE_PATTERN.test(state.date)) errors.push('date')
  if (errors.length > 0 || amount === null) return { ok: false, errors }
  return {
    ok: true,
    input: { amount, source, date: state.date, received_by: state.receivedBy, note: cleanNote(state.note) },
  }
}

// --- savings -----------------------------------------------------------------------------

export type SavingKind = 'deposit' | 'withdrawal'

export type SavingFormState = {
  kind: SavingKind
  amountText: string
  date: DateKey
  note: string
}

export function newSavingForm(date: DateKey): SavingFormState {
  return { kind: 'deposit', amountText: '', date, note: '' }
}

export function savingToForm(saving: Saving): SavingFormState {
  return {
    kind: saving.amount < 0 ? 'withdrawal' : 'deposit',
    amountText: amountToText(saving.amount),
    date: saving.date,
    note: saving.note ?? '',
  }
}

/** The amount is always typed as positive; a withdrawal is stored as a negative amount. */
export function validateSavingForm(state: SavingFormState): FormResult<SavingInput> {
  const errors: EntryFormError[] = []
  const amount = readAmount(state.amountText, errors)
  if (!DATE_PATTERN.test(state.date)) errors.push('date')
  if (errors.length > 0 || amount === null) return { ok: false, errors }
  return {
    ok: true,
    input: {
      amount: state.kind === 'withdrawal' ? -amount : amount,
      date: state.date,
      note: cleanNote(state.note),
    },
  }
}

// --- carry override ----------------------------------------------------------------------

/** Reads an amount of 0 or more (the carried-in amount, the savings opening balance). */
export function parseCarryOverride(text: string): number | null {
  const amount = parseAmount(text)
  return amount === null || amount < 0 || amount > MAX_AMOUNT ? null : amount
}

/**
 * The amount for "Uskladi stanje": typed without a sign (phone keyboards often have no minus
 * key), with `negative` set when the previous month ended in the red.
 */
export function signedCarryOverride(text: string, negative: boolean): number | null {
  const amount = parseCarryOverride(text)
  return amount !== null && negative && amount !== 0 ? -amount : amount
}
