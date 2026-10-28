import { Link } from 'react-router'
import type { Category } from '../data/categories'
import { expensesPath } from '../hooks/useCategoryFilter'
import { sr } from '../i18n/sr'
import type { CategorySpending, LimitStatus } from '../lib/budget'
import type { MonthKey } from '../lib/dates'
import { formatPercent, formatRSD } from '../lib/money'
import { ProgressBar } from './ProgressBar'

type Props = {
  rows: CategorySpending<Category>[]
  month: MonthKey
}

const barTone = { none: 'normal', ok: 'normal', warning: 'warning', over: 'danger' } as const

function limitText(row: CategorySpending<Category>): string | null {
  if (row.limit === null) return null
  const of = sr.home.limitOf(formatRSD(row.total), formatRSD(row.limit))
  if (row.status === 'over') return `${of} · ${sr.home.limitOver(formatRSD(row.total - row.limit))}`
  if (row.status === 'warning') return `${of} · ${sr.home.limitWarning}`
  return of
}

const limitTextTone: Record<LimitStatus, string> = {
  none: 'text-text-muted',
  ok: 'text-text-muted',
  warning: 'text-warning font-medium',
  over: 'text-danger font-medium',
}

/** One row per category; a tap opens the Expenses screen filtered by it. */
export function CategorySpendingList({ rows, month }: Props) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => {
        const name = row.category?.name ?? sr.expenses.unknownCategory
        const color = row.category?.color ?? 'var(--text-muted)'
        const limit = limitText(row)
        return (
          <li key={row.categoryId}>
            <Link
              to={expensesPath(month, row.categoryId)}
              aria-label={sr.home.openCategory(name)}
              className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-surface-muted"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
                style={{ backgroundColor: `${row.category?.color ?? '#757575'}26` }}
              >
                {row.category?.emoji ?? '❔'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {name}
                    {row.category?.archived && (
                      <span className="ml-1 text-xs font-normal text-text-muted">({sr.settings.archived})</span>
                    )}
                  </span>
                  <span className="amount shrink-0 text-sm">{formatRSD(row.total)}</span>
                </span>
                <ProgressBar
                  value={row.limitUsed ?? row.share}
                  label={limit ?? sr.home.categoryShare(formatPercent(row.share))}
                  color={color}
                  tone={barTone[row.status]}
                  className="mt-1.5 h-2"
                />
                <span className="mt-1 flex justify-between gap-2 text-xs">
                  <span className={limitTextTone[row.status]}>{limit}</span>
                  <span className="shrink-0 text-text-muted">{formatPercent(row.share)}</span>
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
