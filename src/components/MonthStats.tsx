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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-3 py-2.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="amount mt-0.5 text-base">{value}</dd>
    </div>
  )
}

/** Small numbers of the month: today, daily average, purchases, unneeded share, last month. */
export function MonthStats({ summary, comparison }: Props) {
  const tone = comparisonTone(comparison)

  return (
    <div className="mt-3 flex flex-col gap-3">
      <dl className={`grid gap-2 ${summary.spentToday === null ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {summary.spentToday !== null && <Tile label={sr.home.today} value={formatRSD(summary.spentToday)} />}
        <Tile label={sr.home.avgPerDay} value={formatRSD(summary.avgPerDay)} />
        <Tile label={sr.home.purchases} value={String(summary.purchases)} />
      </dl>

      <dl className="rounded-3xl border border-border bg-surface px-4 py-1">
        <div className="flex items-baseline justify-between gap-3 border-b border-border py-3">
          <dt className="text-sm">{sr.home.unneeded}</dt>
          <dd className="text-right text-sm">
            <span className="amount">{formatRSD(summary.unneeded)}</span>
            <span className="block text-xs text-text-muted">
              {sr.home.unneededShare(formatPercent(summary.unneededPct))}
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-3">
          <dt className="text-sm">
            {sr.home.comparison}
            {comparison.throughDay !== null && (
              <span className="block text-xs text-text-muted">
                {sr.home.comparisonSamePeriod(comparison.throughDay)}
              </span>
            )}
          </dt>
          <dd className={`text-right text-sm font-medium ${tone}`}>{comparisonText(comparison)}</dd>
        </div>
      </dl>
    </div>
  )
}
