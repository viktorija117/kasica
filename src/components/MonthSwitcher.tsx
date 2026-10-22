import { sr } from '../i18n/sr'
import { currentMonthKey, monthLabel, shiftMonth, type MonthKey } from '../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

type Props = {
  month: MonthKey
  onChange: (month: MonthKey) => void
}

const arrowClass =
  'grid size-11 place-items-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text active:scale-95'

export function MonthSwitcher({ month, onChange }: Props) {
  const thisMonth = currentMonthKey()
  const isCurrent = month === thisMonth

  return (
    <div className="mb-5 flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-1.5">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={sr.month.previous}
        className={arrowClass}
      >
        <ChevronLeftIcon />
      </button>

      <div className="flex min-w-0 flex-col items-center">
        <span aria-live="polite" className="truncate text-base font-semibold">
          {monthLabel(month)}
        </span>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onChange(thisMonth)}
            className="mt-0.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary transition hover:brightness-95"
          >
            {sr.month.current}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label={sr.month.next}
        className={arrowClass}
      >
        <ChevronRightIcon />
      </button>
    </div>
  )
}
