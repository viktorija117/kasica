import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchSuggestions,
  updateExpense,
  type Expense,
  type ExpenseInput,
} from '../data/expenses'
import { sr } from '../i18n/sr'
import { monthOfDate, type MonthKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useSession } from './useAuth'
import { useHousehold } from './useHousehold'
import { usePendingDeletes } from './usePendingDeletes'
import { useToast } from './useToast'

const EXPENSE_MUTATION = ['expense-write'] as const
// Writes run one after another, so editing a just-added expense never reaches the server
// before the expense itself.
const EXPENSE_SCOPE = { id: 'expense-write' }

/** Expenses of a month, without the ones waiting in the "Poništi" window. */
export function useExpenses(month: MonthKey) {
  const householdId = useHousehold().id
  const { ids: pendingDeletes } = usePendingDeletes()
  const query = useQuery({
    queryKey: queryKeys.expenses(householdId, month),
    queryFn: () => fetchExpenses(householdId, month),
  })
  const expenses = useMemo(
    () => query.data?.filter((expense) => !pendingDeletes.has(expense.id)),
    [query.data, pendingDeletes],
  )
  return { expenses, error: query.error }
}

export function useSuggestions() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.suggestions(householdId),
    queryFn: () => fetchSuggestions(householdId),
    staleTime: 5 * 60_000,
  })
}

// --- optimistic cache helpers ------------------------------------------------------------

type Snapshot = [QueryKey, Expense[] | undefined][]

function newestFirst(a: Expense, b: Expense): number {
  return b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
}

/** Applies `update` to every cached month list and returns what was there before. */
function updateCachedLists(
  queryClient: QueryClient,
  householdId: string,
  update: (list: Expense[], month: MonthKey) => Expense[],
): Snapshot {
  const snapshot = queryClient.getQueriesData<Expense[]>({
    queryKey: queryKeys.allExpenses(householdId),
  })
  for (const [key, list] of snapshot) {
    if (list) queryClient.setQueryData<Expense[]>(key, update(list, key[2] as MonthKey))
  }
  return snapshot
}

function restore(queryClient: QueryClient, snapshot: Snapshot | undefined) {
  snapshot?.forEach(([key, list]) => queryClient.setQueryData(key, list))
}

function findCached(queryClient: QueryClient, householdId: string, id: string): Expense | undefined {
  return queryClient
    .getQueriesData<Expense[]>({ queryKey: queryKeys.allExpenses(householdId) })
    .flatMap(([, list]) => list ?? [])
    .find((expense) => expense.id === id)
}

/** Placing a row: drop it from every month, then add it to the month of its date. */
function placeRow(row: Expense) {
  const target = monthOfDate(row.date)
  return (list: Expense[], month: MonthKey) => {
    const others = list.filter((expense) => expense.id !== row.id)
    return month === target ? [...others, row].sort(newestFirst) : others
  }
}

/**
 * Refetches after writes. While several saves are still in flight ("Sačuvaj i dodaj još"),
 * it waits for the last one so a refetch never hides rows that are not saved yet.
 */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  return useCallback(() => {
    if (queryClient.isMutating({ mutationKey: EXPENSE_MUTATION }) > 1) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.suggestions(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.monthTotals(householdId) })
  }, [queryClient, householdId])
}

// --- mutations ----------------------------------------------------------------------------

export function useCreateExpense() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const userId = useSession().user.id
  const showToast = useToast()
  const refresh = useRefreshAfterWrite()

  return useMutation({
    mutationKey: EXPENSE_MUTATION,
    scope: EXPENSE_SCOPE,
    // The id is made here, so the row shown right away is the same row that gets saved and
    // can be edited before the save finishes.
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      createExpense(householdId, id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.allExpenses(householdId) })
      const now = new Date().toISOString()
      const row: Expense = {
        id,
        household_id: householdId,
        recurring_id: null,
        import_batch: null,
        receipt_id: null,
        created_by: userId,
        created_at: now,
        updated_at: now,
        ...input,
        description: input.description ?? '',
        paid_by: input.paid_by ?? null,
        note: input.note ?? null,
      }
      return { snapshot: updateCachedLists(queryClient, householdId, placeRow(row)) }
    },
    onError: (_error, _vars, context) => {
      restore(queryClient, context?.snapshot)
      showToast({ message: sr.expenseForm.saveFailed, tone: 'error' })
    },
    onSettled: refresh,
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const showToast = useToast()
  const refresh = useRefreshAfterWrite()

  return useMutation({
    mutationKey: EXPENSE_MUTATION,
    scope: EXPENSE_SCOPE,
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) => updateExpense(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.allExpenses(householdId) })
      const old = findCached(queryClient, householdId, id)
      if (!old) return { snapshot: undefined }
      const row: Expense = { ...old, ...input, updated_at: new Date().toISOString() }
      return { snapshot: updateCachedLists(queryClient, householdId, placeRow(row)) }
    },
    onError: (_error, _vars, context) => {
      restore(queryClient, context?.snapshot)
      showToast({ message: sr.expenseForm.saveFailed, tone: 'error' })
    },
    onSettled: refresh,
  })
}

/**
 * Deletes with an undo window: the expense disappears at once, a "Poništi" toast is shown,
 * and the delete is only sent when the toast goes away. Undo therefore never writes anything.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const showToast = useToast()
  const { hide, unhide } = usePendingDeletes()

  return useCallback(
    (expense: Expense) => {
      const commit = async () => {
        try {
          await deleteExpense(expense.id)
          updateCachedLists(queryClient, householdId, (list) =>
            list.filter((row) => row.id !== expense.id),
          )
          void queryClient.invalidateQueries({ queryKey: queryKeys.suggestions(householdId) })
          void queryClient.invalidateQueries({ queryKey: queryKeys.monthTotals(householdId) })
        } catch {
          showToast({ message: sr.toast.deleteFailed, tone: 'error' })
        } finally {
          unhide(expense.id)
        }
      }

      hide(expense.id)
      showToast({
        message: sr.toast.expenseDeleted,
        action: { label: sr.toast.undo, onClick: () => unhide(expense.id) },
        onExpire: () => void commit(),
      })
    },
    [queryClient, householdId, showToast, hide, unhide],
  )
}
