import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { fetchImportBatches, importWorkbook, undoImport } from '../data/imports'
import type { ImportPlan } from '../lib/excelImport'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'

export function useImportBatches() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.importBatches(householdId),
    queryFn: () => fetchImportBatches(householdId),
  })
}

/** An import touches almost every table, so every list of the household is refetched. */
function useRefreshAfterImport() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  return useCallback(async () => {
    const keys = [
      queryKeys.importBatches(householdId),
      queryKeys.categories(householdId),
      queryKeys.allExpenses(householdId),
      queryKeys.suggestions(householdId),
      queryKeys.allIncomes(householdId),
      queryKeys.allSavings(householdId),
      queryKeys.monthTotals(householdId),
      queryKeys.monthSettings(householdId),
    ]
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  }, [queryClient, householdId])
}

export function useRunImport() {
  const householdId = useHousehold().id
  const refresh = useRefreshAfterImport()
  return useMutation({
    mutationFn: ({ fileName, plan }: { fileName: string; plan: ImportPlan }) =>
      importWorkbook(householdId, fileName, plan),
    onSuccess: refresh,
  })
}

export function useUndoImport() {
  const refresh = useRefreshAfterImport()
  return useMutation({
    mutationFn: undoImport,
    onSuccess: refresh,
  })
}
