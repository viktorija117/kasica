import { lazy, Suspense } from 'react'
import { PageTitle } from '../components/PageTitle'
import { QueryStatus } from '../components/QueryStatus'
import { YearExport } from '../components/YearExport'
import { YearCategoryHeatmap } from '../components/YearCategoryHeatmap'
import { YearMonthsTable } from '../components/YearMonthsTable'
import { YearStats } from '../components/YearStats'
import { YearSwitcher } from '../components/YearSwitcher'
import { useSelectedYear } from '../hooks/useSelectedYear'
import { useYearOverview } from '../hooks/useYearOverview'
import { sr } from '../i18n/sr'

// Recharts is big; it loads after the numbers are already on screen.
const YearChart = lazy(() => import('../components/YearChart').then((module) => ({ default: module.YearChart })))

export function Year() {
  const [year, setYear] = useSelectedYear()
  const { data, error } = useYearOverview(year)

  return (
    <>
      <PageTitle>{sr.year.title}</PageTitle>
      <YearSwitcher year={year} onChange={setYear} />

      {!data ? (
        <QueryStatus error={error} />
      ) : data.overview.hasData ? (
        <div className="flex flex-col gap-3">
          <YearMonthsTable overview={data.overview} />
          {data.overview.categories.length > 0 && <YearCategoryHeatmap overview={data.overview} />}
          <YearStats overview={data.overview} />
          <Suspense fallback={<div className="h-[17rem] rounded-3xl border border-border bg-surface" />}>
            <YearChart points={data.chart} />
          </Suspense>
          <YearExport year={year} overview={data.overview} />
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-border p-4 text-center text-sm text-text-muted">
          {sr.year.empty}
        </p>
      )}
    </>
  )
}
