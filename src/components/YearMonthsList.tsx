import { Link } from 'react-router'
import type { Category } from '../data/categories'
import { homePath } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'
import type { MonthBalance, YearOverview } from '../lib/budget'
import { Amount } from './Amount'
import { ChevronRightIcon } from './icons'
import { categoryLabel, fullMonth } from './yearTable'

type Props = { overview: YearOverview<Category> }

type Balance = Pick<MonthBalance, 'opening' | 'spent' | 'saved' | 'remaining'>

/** Phone version of the months table: one tappable block per month, and UKUPNO at the end. */
export function YearMonthsList({ overview }: Props) {
  const byId = new Map(overview.categories.map((column) => [column.categoryId, column]))

  return (
    <ul className="mt-2 flex flex-col divide-y divide-border">
      {overview.months.map(({ month, balance, shown, top }) => (
        <li key={month}>
          <Link
            to={homePath(month)}
            aria-label={sr.year.openMonth(fullMonth(month))}
            className={`-mx-2 flex items-center gap-2 rounded-2xl px-2 transition hover:bg-surface-muted ${shown ? 'py-2.5' : 'py-1.5 text-sm'}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`font-medium ${shown ? '' : 'text-text-muted'}`}>{fullMonth(month)}</span>
                <span className="truncate text-xs text-text-muted">
                  {shown ? (top ? categoryLabel(byId.get(top.categoryId)) : '') : sr.year.noValue}
                </span>
              </span>
              {shown && <Numbers balance={balance} />}
            </span>
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
          </Link>
        </li>
      ))}
      <li className="pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{sr.year.total}</span>
          <span className="truncate text-xs text-text-muted">
            {overview.topCategory ? categoryLabel(overview.topCategory) : sr.year.noValue}
          </span>
        </div>
        <Numbers balance={overview.total} />
      </li>
    </ul>
  )
}

function Numbers({ balance }: { balance: Balance }) {
  const values = [
    { label: sr.year.opening, value: balance.opening, tone: '' },
    { label: sr.year.spent, value: balance.spent, tone: '' },
    { label: sr.year.saved, value: balance.saved, tone: '' },
    { label: sr.year.remaining, value: balance.remaining, tone: balance.remaining < 0 ? 'text-danger' : 'text-primary' },
  ]
  return (
    <span className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
      {values.map(({ label, value, tone }) => (
        <span key={label} className="@container flex min-w-0 flex-col">
          <span className="text-[11px] text-text-muted">{label}</span>
          <Amount value={value} size="sm" className={tone} />
        </span>
      ))}
    </span>
  )
}
