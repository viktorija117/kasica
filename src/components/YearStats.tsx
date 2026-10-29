import type { ReactNode } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { YearOverview } from '../lib/budget'
import { formatPercent, formatRSD } from '../lib/money'
import { Amount } from './Amount'
import { categoryLabel, fullMonth } from './yearTable'

type Props = { overview: YearOverview<Category> }

function Tile({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="@container min-w-0 rounded-2xl bg-surface-muted px-3 py-2.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">
        {typeof value === 'string' ? <span className="amount block text-base">{value}</span> : value}
        {detail && <span className="block text-xs text-text-muted">{detail}</span>}
      </dd>
    </div>
  )
}

/** The year in a few numbers. */
export function YearStats({ overview }: Props) {
  const { topMonth, topCategory, monthsWithSpending } = overview

  return (
    <section aria-label={sr.year.statsTitle}>
      <h2 className="sr-only">{sr.year.statsTitle}</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label={sr.year.totalSpent} value={<Amount value={overview.total.spent} size="sm" className="block" />} />
        <Tile label={sr.year.totalSaved} value={<Amount value={overview.total.saved} size="sm" className="block" />} />
        <Tile
          label={sr.year.avgMonthly}
          value={
            overview.avgMonthlySpent === null ? (
              sr.year.noValue
            ) : (
              <Amount value={overview.avgMonthlySpent} size="sm" className="block" />
            )
          }
          detail={monthsWithSpending > 0 ? sr.year.avgMonthlyDetail(monthsWithSpending) : undefined}
        />
        <Tile
          label={sr.year.topMonth}
          value={topMonth ? fullMonth(topMonth.month) : sr.year.noValue}
          detail={topMonth ? formatRSD(topMonth.spent) : undefined}
        />
        <Tile
          label={sr.year.topYearCategory}
          value={topCategory ? categoryLabel(topCategory) : sr.year.noValue}
          detail={topCategory ? `${formatRSD(topCategory.total)} · ${formatPercent(topCategory.share)}` : undefined}
        />
        <Tile
          label={sr.year.unneededShare}
          value={formatPercent(overview.unneededPct)}
          detail={formatRSD(overview.unneeded)}
        />
      </dl>
    </section>
  )
}
