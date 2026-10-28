import { lazy, Suspense } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { CategorySpending } from '../lib/budget'
import type { MonthKey } from '../lib/dates'
import { formatRSD } from '../lib/money'
import { CategorySpendingList } from './CategorySpendingList'

// Recharts is big; it loads after the numbers are already on screen.
const CategoryDonut = lazy(() => import('./CategoryDonut').then((module) => ({ default: module.CategoryDonut })))

type Props = {
  rows: CategorySpending<Category>[]
  top: CategorySpending<Category> | null
  spent: number
  month: MonthKey
}

export function SpendingByCategory({ rows, top, spent, month }: Props) {
  return (
    <section aria-label={sr.home.byCategory} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{sr.home.byCategory}</h2>
      {top && (
        <p className="mt-1">
          {sr.home.topCategory}{' '}
          <strong className="font-semibold">
            {top.category?.emoji} {top.category?.name ?? sr.expenses.unknownCategory} ({formatRSD(top.total)})
          </strong>
        </p>
      )}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        {spent > 0 && (
          <Suspense fallback={<div className="mx-auto size-[168px] shrink-0" />}>
            <CategoryDonut rows={rows} spent={spent} />
          </Suspense>
        )}
        <div className="min-w-0 flex-1">
          <CategorySpendingList rows={rows} month={month} />
        </div>
      </div>
    </section>
  )
}
