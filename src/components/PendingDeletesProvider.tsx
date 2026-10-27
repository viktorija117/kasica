import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PendingDeletesContext } from '../hooks/usePendingDeletes'

export function PendingDeletesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())

  const hide = useCallback((id: string) => setIds((prev) => new Set(prev).add(id)), [])
  const unhide = useCallback(
    (id: string) =>
      setIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      }),
    [],
  )

  const value = useMemo(() => ({ ids, hide, unhide }), [ids, hide, unhide])
  return <PendingDeletesContext.Provider value={value}>{children}</PendingDeletesContext.Provider>
}
