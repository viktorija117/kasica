import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { useMyHousehold } from '../hooks/useHousehold'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'

/** Signed-out visitors go to the login screen. */
export function RequireAuth() {
  const auth = useAuth()
  if (auth.status === 'loading') return <LoadingScreen />
  if (!auth.session) return <Navigate to="/prijava" replace />
  return <Outlet />
}

/** The login screen is only for signed-out visitors. */
export function GuestOnly() {
  const auth = useAuth()
  if (auth.status === 'loading') return <LoadingScreen />
  if (auth.session) return <Navigate to="/" replace />
  return <Outlet />
}

/** The app itself needs a household; without one the user picks create or join. */
export function RequireHousehold() {
  const { data, isPending, error, refetch } = useMyHousehold()
  if (isPending) return <LoadingScreen />
  // A failed background refetch (offline) keeps the household it already has.
  if (data) return <Outlet />
  if (error) return <ErrorScreen error={error} onRetry={() => void refetch()} />
  return <Navigate to="/domacinstvo" replace />
}

/** The household setup screen is only for users who have none yet. */
export function RequireNoHousehold() {
  const { data, isPending, error, refetch } = useMyHousehold()
  if (isPending) return <LoadingScreen />
  if (error) return <ErrorScreen error={error} onRetry={() => void refetch()} />
  if (data) return <Navigate to="/" replace />
  return <Outlet />
}
