import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'
import { sr } from '../i18n/sr'
import { BottomNav } from './BottomNav'
import { BottomSheet } from './BottomSheet'
import { Header } from './Header'

export function Layout() {
  const [addOpen, setAddOpen] = useState(false)
  const closeAdd = useCallback(() => setAddOpen(false), [])

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-lg px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav onAdd={() => setAddOpen(true)} />
      <BottomSheet open={addOpen} title={sr.sheet.addExpenseTitle} onClose={closeAdd}>
        <p className="py-6 text-center text-text-muted">{sr.sheet.addExpenseComingSoon}</p>
      </BottomSheet>
    </div>
  )
}
