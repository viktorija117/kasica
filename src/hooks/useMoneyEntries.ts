import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { sr } from '../i18n/sr'
import type { MonthKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'
import { usePendingDeletes } from './usePendingDeletes'
import { useToast } from './useToast'

/** How one kind of month entry (incomes, savings) is read and written. */
export type EntryApi<Row extends { id: string }, Input> = {
  allKey: (householdId: string) => QueryKey
  listKey: (householdId: string, month: MonthKey) => QueryKey
  fetch: (householdId: string, month: MonthKey) => Promise<Row[]>
  create: (householdId: string, input: Input) => Promise<Row>
  update: (id: string, input: Input) => Promise<Row>
  remove: (id: string) => Promise<void>
  messages: { saveFailed: string; deleted: string }
}

/** Entries of a month, without the ones waiting in the "Poništi" window. */
export function useEntries<Row extends { id: string }, Input>(api: EntryApi<Row, Input>, month: MonthKey) {
  const householdId = useHousehold().id
  const { ids: pendingDeletes } = usePendingDeletes()
  const query = useQuery({
    queryKey: api.listKey(householdId, month),
    queryFn: () => api.fetch(householdId, month),
  })
  const entries = useMemo(
    () => query.data?.filter((entry) => !pendingDeletes.has(entry.id)),
    [query.data, pendingDeletes],
  )
  return { entries, error: query.error }
}

/** Refetches the entry lists and the month sums every balance is built from. */
function useRefresh(allKey: QueryKey) {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: allKey }),
      queryClient.invalidateQueries({ queryKey: queryKeys.monthTotals(householdId) }),
    ])
  }, [queryClient, householdId, allKey])
}

/** Adds an entry (no `id`) or changes one. Not optimistic: incomes and savings are rare. */
export function useSaveEntry<Row extends { id: string }, Input>(api: EntryApi<Row, Input>) {
  const householdId = useHousehold().id
  const showToast = useToast()
  const refresh = useRefresh(api.allKey(householdId))

  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Input }) =>
      id ? api.update(id, input) : api.create(householdId, input),
    onSuccess: refresh,
    onError: () => showToast({ message: api.messages.saveFailed, tone: 'error' }),
  })
}

/**
 * Deletes with an undo window, like expenses: the entry disappears at once and the delete
 * is only sent when the "Poništi" toast goes away.
 */
export function useDeleteEntry<Row extends { id: string }, Input>(api: EntryApi<Row, Input>) {
  const householdId = useHousehold().id
  const showToast = useToast()
  const { hide, unhide } = usePendingDeletes()
  const refresh = useRefresh(api.allKey(householdId))

  return useCallback(
    (entry: Row) => {
      const commit = async () => {
        try {
          await api.remove(entry.id)
          await refresh()
        } catch {
          showToast({ message: sr.toast.deleteFailed, tone: 'error' })
        } finally {
          unhide(entry.id)
        }
      }

      hide(entry.id)
      showToast({
        message: api.messages.deleted,
        action: { label: sr.toast.undo, onClick: () => unhide(entry.id) },
        onExpire: () => void commit(),
      })
    },
    [api, refresh, showToast, hide, unhide],
  )
}
