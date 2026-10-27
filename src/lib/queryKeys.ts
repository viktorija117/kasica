// Every TanStack Query key in one place so invalidation stays consistent.
export const queryKeys = {
  household: (userId: string) => ['household', userId] as const,
  members: (householdId: string) => ['members', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
}
