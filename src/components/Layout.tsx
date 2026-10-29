import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'
import { ExpenseSheetContext, type ExpenseSheetRequest } from '../hooks/useExpenseSheet'
import { useRealtimeSync } from '../hooks/useRealtimeSync'
import { BottomNav } from './BottomNav'
import { ExpenseSheet } from './ExpenseSheet'
import { Header } from './Header'
import { PendingDeletesProvider } from './PendingDeletesProvider'
import { ToastProvider } from './ToastProvider'

export function Layout() {
  const [sheet, setSheet] = useState<ExpenseSheetRequest | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])
  useRealtimeSync()

  return (
    <PendingDeletesProvider>
      <ToastProvider>
        <ExpenseSheetContext.Provider value={setSheet}>
          <div className="min-h-dvh">
            <Header />
            <main className="mx-auto max-w-lg px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
              <Outlet />
            </main>
            <BottomNav onAdd={() => setSheet({ mode: 'add' })} />
            <ExpenseSheet request={sheet} onClose={closeSheet} />
          </div>
        </ExpenseSheetContext.Provider>
      </ToastProvider>
    </PendingDeletesProvider>
  )
}
