import {
  createSaving,
  deleteSaving,
  fetchSavings,
  updateSaving,
  type Saving,
  type SavingInput,
} from '../data/savings'
import { sr } from '../i18n/sr'
import type { MonthKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useDeleteEntry, useEntries, useSaveEntry, type EntryApi } from './useMoneyEntries'

const savingApi: EntryApi<Saving, SavingInput> = {
  allKey: queryKeys.allSavings,
  listKey: queryKeys.savings,
  fetch: fetchSavings,
  create: createSaving,
  update: updateSaving,
  remove: deleteSaving,
  messages: { saveFailed: sr.saving.saveFailed, deleted: sr.toast.savingDeleted },
}

export function useSavings(month: MonthKey) {
  const { entries, error } = useEntries(savingApi, month)
  return { savings: entries, error }
}

export const useSaveSaving = () => useSaveEntry(savingApi)
export const useDeleteSaving = () => useDeleteEntry(savingApi)
