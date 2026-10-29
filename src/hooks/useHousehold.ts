import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCategories } from '../data/categories'
import { fetchMembers, fetchMyHousehold, updateSavingsOpening, type Household } from '../data/households'
import { sr } from '../i18n/sr'
import { queryKeys } from '../lib/queryKeys'
import { useSession } from './useAuth'
import { useToast } from './useToast'

export function useMyHousehold() {
  const userId = useSession().user.id
  return useQuery({
    queryKey: queryKeys.household(userId),
    queryFn: () => fetchMyHousehold(userId),
    staleTime: Infinity,
  })
}

/** The household of the signed-in user. Only valid inside `RequireHousehold`. */
export function useHousehold(): Household {
  const { data } = useMyHousehold()
  if (!data) throw new Error('useHousehold used outside of RequireHousehold')
  return data
}

export function useMembers() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.members(householdId),
    queryFn: () => fetchMembers(householdId),
  })
}

export function useCategories() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.categories(householdId),
    queryFn: () => fetchCategories(householdId),
  })
}

/** Saves "Početno stanje štednje"; Home shows the new total at once, undone if saving fails. */
export function useSaveSavingsOpening() {
  const queryClient = useQueryClient()
  const household = useHousehold()
  const key = queryKeys.household(useSession().user.id)
  const showToast = useToast()

  return useMutation({
    mutationFn: (amount: number) => updateSavingsOpening(household.id, amount),
    onMutate: async (amount) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Household | null>(key)
      queryClient.setQueryData<Household | null>(key, (current) =>
        current ? { ...current, savings_opening: amount } : current,
      )
      return { previous }
    },
    onError: (_error, _amount, context) => {
      queryClient.setQueryData(key, context?.previous)
      showToast({ message: sr.savingsOpening.saveFailed, tone: 'error' })
    },
    onSuccess: () => showToast({ message: sr.savingsOpening.saved }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
