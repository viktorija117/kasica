import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './components/AuthProvider'
import { Layout } from './components/Layout'
import { GuestOnly, RequireAuth, RequireHousehold, RequireNoHousehold } from './components/RouteGuards'
import { Expenses } from './pages/Expenses'
import { Home } from './pages/Home'
import { HouseholdSetup } from './pages/HouseholdSetup'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { Year } from './pages/Year'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="prijava" element={<Login />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<RequireNoHousehold />}>
          <Route path="domacinstvo" element={<HouseholdSetup />} />
        </Route>
        <Route element={<RequireHousehold />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="troskovi" element={<Expenses />} />
            <Route path="godina" element={<Year />} />
            <Route path="podesavanja" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
