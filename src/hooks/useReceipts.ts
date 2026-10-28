import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExpenseInput } from '../data/expenses'
import { fetchFiscalReceipt, findReceiptByUrl, saveReceipt, type ReceiptInput } from '../data/receipts'
import { queryKeys } from '../lib/queryKeys'
import { readReceipt } from '../lib/receipt'
import { useHousehold } from './useHousehold'

/** A receipt read from suf.purs.gov.rs. A receipt never changes, so it is fetched once. */
export function useFiscalReceipt(url: string) {
  return useQuery({
    queryKey: queryKeys.fiscalReceipt(url),
    queryFn: async () => readReceipt(await fetchFiscalReceipt(url)),
    staleTime: Infinity,
    retry: false,
  })
}

/** The receipt already saved with this link, so a second scan can warn about it. */
export function useSavedReceipt(url: string) {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.savedReceipt(householdId, url),
    queryFn: () => findReceiptByUrl(householdId, url),
  })
}

export function useSaveReceipt() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  return useMutation({
    mutationFn: ({ receipt, expenses }: { receipt: ReceiptInput; expenses: ExpenseInput[] }) =>
      saveReceipt(householdId, receipt, expenses),
    onSettled: (_id, _error, { receipt }) => {
      const keys = [
        queryKeys.allExpenses(householdId),
        queryKeys.suggestions(householdId),
        queryKeys.monthTotals(householdId),
        queryKeys.savedReceipt(householdId, receipt.url),
      ]
      return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}
