import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  reorderCategories,
  updateCategory,
  type Category,
  type CategoryInput,
  type CategoryPatch,
} from '../data/categories'
import { sr } from '../i18n/sr'
import { applyOrder } from '../lib/categoryForm'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'
import { useToast } from './useToast'

/**
 * A category mutation whose result shows at once everywhere categories are used (picker,
 * lists, Home), and is rolled back with an error toast if saving fails.
 */
function useCategoryMutation<Vars>(
  send: (householdId: string, vars: Vars) => Promise<unknown>,
  apply: (list: Category[], vars: Vars, householdId: string) => Category[],
) {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const showToast = useToast()
  const key = queryKeys.categories(householdId)

  return useMutation({
    mutationFn: (vars: Vars) => send(householdId, vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(key, (list = []) => apply(list, vars, householdId))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      showToast({ message: sr.categories.saveFailed, tone: 'error' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

type SaveVars = { id: string; input: CategoryInput } | { id?: undefined; newId: string; input: CategoryInput; sort: number }

/**
 * Adds a category (no `id`; `newId` is its real id, so it can be used before the server
 * answers; `sort` puts it last) or changes one.
 */
export function useSaveCategory() {
  return useCategoryMutation<SaveVars>(
    (householdId, vars) =>
      vars.id !== undefined ? updateCategory(vars.id, vars.input) : createCategory(householdId, { ...vars.input, id: vars.newId, sort: vars.sort }),
    (list, vars, householdId) =>
      vars.id !== undefined
        ? list.map((category) => (category.id === vars.id ? { ...category, ...vars.input } : category))
        : [
            ...list,
            {
              ...vars.input,
              id: vars.newId,
              household_id: householdId,
              sort: vars.sort,
              monthly_limit: vars.input.monthly_limit ?? null,
              emoji: vars.input.emoji ?? '📦',
              color: vars.input.color ?? '#757575',
              default_necessity: vars.input.default_necessity ?? 'needed',
              archived: false,
              import_batch: null,
              created_at: new Date().toISOString(),
            },
          ],
  )
}

/** Archives or brings back a category. Archived ones stay in history and reports. */
export function useSetCategoryArchived() {
  return useCategoryMutation<{ id: string; archived: boolean }>(
    (_householdId, { id, archived }) => updateCategory(id, { archived } satisfies CategoryPatch),
    (list, { id, archived }) => list.map((category) => (category.id === id ? { ...category, archived } : category)),
  )
}

/** Saves a new order; `ids` are the active categories, first one first. */
export function useReorderCategories() {
  return useCategoryMutation<string[]>(
    (householdId, ids) => reorderCategories(householdId, ids),
    (list, ids) => applyOrder(list, ids),
  )
}
