import { sr } from '../i18n/sr'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

type Props = {
  year: number
  onChange: (year: number) => void
}

const arrowClass =
  'grid size-11 place-items-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text active:scale-95'

export function YearSwitcher({ year, onChange }: Props) {
  const thisYear = new Date().getFullYear()

  return (
    <div className="mb-5 flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-1.5">
      <button type="button" onClick={() => onChange(year - 1)} aria-label={sr.year.previous} className={arrowClass}>
        <ChevronLeftIcon />
      </button>

      <div className="flex min-w-0 flex-col items-center">
        <span aria-live="polite" className="text-base font-semibold">
          {year}
        </span>
        {year !== thisYear && (
          <button
            type="button"
            onClick={() => onChange(thisYear)}
            className="mt-0.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary transition hover:brightness-95"
          >
            {sr.year.current}
          </button>
        )}
      </div>

      <button type="button" onClick={() => onChange(year + 1)} aria-label={sr.year.next} className={arrowClass}>
        <ChevronRightIcon />
      </button>
    </div>
  )
}
