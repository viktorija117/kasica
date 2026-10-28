import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRecurring,
  deleteRecurring,
  fetchRecurring,
  reorderRecurring,
  updateRecurring,
  type RecurringExpense,
  type RecurringInput,
} from '../data/recurring'
import { sr } from '../i18n/sr'
import { applyOrder } from '../lib/categoryForm'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'
import { useToast } from './useToast'

/** All recurring expenses of the household, inactive included, in display order. */
export function useRecurring() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.recurring(householdId),
    queryFn: () => fetchRecurring(householdId),
  })
}

/**
 * A recurring expense mutation that shows at once in Settings and on Home, and is rolled
 * back with an error toast if saving fails.
 */
function useRecurringMutation<Vars>(
  send: (householdId: string, vars: Vars) => Promise<unknown>,
  apply: (list: RecurringExpense[], vars: Vars, householdId: string) => RecurringExpense[],
) {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const showToast = useToast()
  const key = queryKeys.recurring(householdId)

  return useMutation({
    mutationFn: (vars: Vars) => send(householdId, vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<RecurringExpense[]>(key)
      queryClient.setQueryData<RecurringExpense[]>(key, (list = []) => apply(list, vars, householdId))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      showToast({ message: sr.recurring.saveFailed, tone: 'error' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

type SaveVars = { id: string; input: RecurringInput } | { id?: undefined; input: RecurringInput; sort: number }

/** Adds a recurring expense (no `id`, with the `sort` that puts it last) or changes one. */
export function useSaveRecurring() {
  return useRecurringMutation<SaveVars>(
    (householdId, vars) =>
      vars.id !== undefined
        ? updateRecurring(vars.id, vars.input)
        : createRecurring(householdId, { ...vars.input, sort: vars.sort }),
    (list, vars, householdId) =>
      vars.id !== undefined
        ? list.map((recurring) => (recurring.id === vars.id ? { ...recurring, ...vars.input } : recurring))
        : [
            ...list,
            {
              ...vars.input,
              id: `new-${Date.now()}`,
              household_id: householdId,
              necessity: vars.input.necessity ?? 'needed',
              sort: vars.sort,
              active: true,
              created_at: new Date().toISOString(),
            },
          ],
  )
}

/** Switches a recurring expense on or off; an inactive one is never due. */
export function useSetRecurringActive() {
  return useRecurringMutation<{ id: string; active: boolean }>(
    (_householdId, { id, active }) => updateRecurring(id, { active }),
    (list, { id, active }) => list.map((recurring) => (recurring.id === id ? { ...recurring, active } : recurring)),
  )
}

export function useDeleteRecurring() {
  return useRecurringMutation<string>(
    (_householdId, id) => deleteRecurring(id),
    (list, id) => list.filter((recurring) => recurring.id !== id),
  )
}

/** Saves a new order; `ids` are all recurring expenses, first one first. */
export function useReorderRecurring() {
  return useRecurringMutation<string[]>(
    (householdId, ids) => reorderRecurring(householdId, ids),
    (list, ids) => applyOrder(list, ids),
  )
}
