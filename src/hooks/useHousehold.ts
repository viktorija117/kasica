import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../data/categories'
import { fetchMembers, fetchMyHousehold, type Household } from '../data/households'
import { queryKeys } from '../lib/queryKeys'
import { useSession } from './useAuth'

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
