// Every TanStack Query key in one place so invalidation stays consistent.
export const queryKeys = {
  household: (userId: string) => ['household', userId] as const,
  members: (householdId: string) => ['members', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  /** Prefix of every month's expense list, for invalidating them all at once. */
  allExpenses: (householdId: string) => ['expenses', householdId] as const,
  expenses: (householdId: string, month: string) => ['expenses', householdId, month] as const,
  suggestions: (householdId: string) => ['expense-suggestions', householdId] as const,
}
