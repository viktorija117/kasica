import {
  createIncome,
  deleteIncome,
  fetchIncomes,
  updateIncome,
  type Income,
  type IncomeInput,
} from '../data/incomes'
import { sr } from '../i18n/sr'
import type { MonthKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useDeleteEntry, useEntries, useSaveEntry, type EntryApi } from './useMoneyEntries'

const incomeApi: EntryApi<Income, IncomeInput> = {
  allKey: queryKeys.allIncomes,
  listKey: queryKeys.incomes,
  fetch: fetchIncomes,
  create: createIncome,
  update: updateIncome,
  remove: deleteIncome,
  messages: { saveFailed: sr.income.saveFailed, deleted: sr.toast.incomeDeleted },
}

export function useIncomes(month: MonthKey) {
  const { entries, error } = useEntries(incomeApi, month)
  return { incomes: entries, error }
}

export const useSaveIncome = () => useSaveEntry(incomeApi)
export const useDeleteIncome = () => useDeleteEntry(incomeApi)
