import { createContext, useContext } from 'react'
import type { Session } from '../data/auth'

export type AuthState = { status: 'loading' } | { status: 'ready'; session: Session | null }

export const AuthContext = createContext<AuthState>({ status: 'loading' })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

/** The signed-in session. Only valid inside screens guarded by `RequireAuth`. */
export function useSession(): Session {
  const auth = useAuth()
  if (auth.status !== 'ready' || !auth.session) {
    throw new Error('useSession used outside of RequireAuth')
  }
  return auth.session
}
