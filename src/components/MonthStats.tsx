import type { ReactNode } from 'react'
import { sr } from '../i18n/sr'
import type { MonthSummary, SpentComparison } from '../lib/budget'
import { formatPercent, formatRSD } from '../lib/money'

type Props = {
  summary: MonthSummary
  comparison: SpentComparison
}

function comparisonText(comparison: SpentComparison): string {
  if (comparison.previous === 0) return sr.home.comparisonNone
  if (comparison.diff === 0) return sr.home.comparisonSame
  const amount = formatRSD(Math.abs(comparison.diff))
  const pct = comparison.diffPct === null ? '' : ` (${formatPercent(Math.abs(comparison.diffPct))})`
  return (comparison.diff > 0 ? sr.home.comparisonMore(amount) : sr.home.comparisonLess(amount)) + pct
}

function comparisonTone(comparison: SpentComparison): string {
  if (comparison.previous === 0 || comparison.diff === 0) return ''
  return comparison.diff > 0 ? 'text-danger' : 'text-primary'
}

function Row({ label, children, last = false }: { label: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <dt className="text-sm">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  )
}

/** Small numbers of the month: today, daily average, purchases, unneeded share, last month. */
export function MonthStats({ summary, comparison }: Props) {
  const tone = comparisonTone(comparison)

  return (
    <dl className="mt-3 rounded-3xl border border-border bg-surface px-4 py-1">
      {summary.spentToday !== null && (
        <Row label={sr.home.today}>
          <span className="amount whitespace-nowrap">{formatRSD(summary.spentToday)}</span>
        </Row>
      )}
      <Row label={sr.home.avgPerDay}>
        <span className="amount whitespace-nowrap">{formatRSD(summary.avgPerDay)}</span>
      </Row>
      <Row label={sr.home.purchases}>
        <span className="amount">{summary.purchases}</span>
      </Row>
      <Row label={sr.home.unneeded}>
        <span className="amount whitespace-nowrap">{formatRSD(summary.unneeded)}</span>
        <span className="block text-xs text-text-muted">{sr.home.unneededShare(formatPercent(summary.unneededPct))}</span>
      </Row>
      <Row
        last
        label={
          <>
            {sr.home.comparison}
            {comparison.throughDay !== null && (
              <span className="block text-xs text-text-muted">
                {sr.home.comparisonSamePeriod(comparison.throughDay)}
              </span>
            )}
          </>
        }
      >
        <span className={`font-medium ${tone}`}>{comparisonText(comparison)}</span>
      </Row>
    </dl>
  )
}
