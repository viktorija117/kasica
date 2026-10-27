import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { onSessionChange } from '../data/auth'
import { AuthContext, type AuthState } from '../hooks/useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(
    () =>
      onSessionChange((session) => {
        // Never let one account's cached data show up for the next one.
        if (!session) queryClient.clear()
        setState({ status: 'ready', session })
      }),
    [queryClient],
  )

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
