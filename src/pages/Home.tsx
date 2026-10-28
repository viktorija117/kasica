import { lazy, Suspense } from 'react'
import { BalanceCards } from '../components/BalanceCards'
import { MonthStats } from '../components/MonthStats'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { QueryStatus } from '../components/QueryStatus'
import { SpendingByCategory } from '../components/SpendingByCategory'
import { SpendingSplits } from '../components/SpendingSplits'
import { useMonthSummary } from '../hooks/useMonthSummary'
import { useSelectedMonth } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'

// Recharts is big; it loads after the numbers are already on screen.
const DailySpendingChart = lazy(() =>
  import('../components/DailySpendingChart').then((module) => ({ default: module.DailySpendingChart })),
)

export function Home() {
  const [month, setMonth] = useSelectedMonth()
  const { data, error } = useMonthSummary(month)

  return (
    <>
      <h1 className="sr-only">{sr.nav.home}</h1>
      <MonthSwitcher month={month} onChange={setMonth} />

      {data ? (
        <>
          <BalanceCards summary={data.summary} setting={data.setting} />
          <MonthStats summary={data.summary} comparison={data.comparison} />
          <div className="mt-3 flex flex-col gap-3">
            {data.spending.byCategory.length > 0 && (
              <SpendingByCategory
                rows={data.spending.byCategory}
                top={data.spending.top}
                spent={data.summary.spent}
                month={month}
              />
            )}
            {data.summary.spent > 0 ? (
              <>
                <Suspense fallback={<div className="h-[15.5rem] rounded-3xl border border-border bg-surface" />}>
                  <DailySpendingChart days={data.spending.byDay} avgPerDay={data.summary.avgPerDay} />
                </Suspense>
                <SpendingSplits necessity={data.spending.necessity} payers={data.spending.payers} />
              </>
            ) : (
              <p className="rounded-3xl border border-dashed border-border p-4 text-center text-sm text-text-muted">
                {sr.home.noSpending}
              </p>
            )}
          </div>
        </>
      ) : (
        <QueryStatus error={error} />
      )}
    </>
  )
}
