import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import { subscribeToHousehold, type LiveTable } from '../data/realtime'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'

/** Changes are gathered for a moment so an import or a receipt refetches once. */
const DEBOUNCE_MS = 400

/**
 * Keeps the screen in sync with what the other member enters: every change to expenses,
 * incomes or savings refetches the lists and month sums it affects.
 */
export function useRealtimeSync() {
  const householdId = useHousehold().id
  const queryClient = useQueryClient()

  useEffect(() => {
    const changed = new Set<LiveTable>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      // A write of our own is in flight: its optimistic rows must not be overwritten by a
      // refetch, and it invalidates these queries itself when it settles. Try again later.
      if (queryClient.isMutating() > 0) {
        timer = setTimeout(flush, DEBOUNCE_MS)
        return
      }
      const keys: QueryKey[] = [queryKeys.monthTotals(householdId)]
      if (changed.has('expenses')) keys.push(queryKeys.allExpenses(householdId), queryKeys.suggestions(householdId))
      if (changed.has('incomes')) keys.push(queryKeys.allIncomes(householdId))
      if (changed.has('savings')) keys.push(queryKeys.allSavings(householdId))
      changed.clear()
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey })
    }

    const unsubscribe = subscribeToHousehold(householdId, (table) => {
      changed.add(table)
      clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [householdId, queryClient])
}
