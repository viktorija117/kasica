import { createContext, useContext } from 'react'

export type PendingDeletes = {
  /** Expenses deleted in the UI whose delete has not been sent yet (the "Poništi" window). */
  ids: ReadonlySet<string>
  hide: (id: string) => void
  unhide: (id: string) => void
}

export const PendingDeletesContext = createContext<PendingDeletes>({
  ids: new Set(),
  hide: () => {},
  unhide: () => {},
})

export function usePendingDeletes(): PendingDeletes {
  return useContext(PendingDeletesContext)
}
