import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Expenses } from './pages/Expenses'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { Year } from './pages/Year'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="troskovi" element={<Expenses />} />
        <Route path="godina" element={<Year />} />
        <Route path="podesavanja" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
