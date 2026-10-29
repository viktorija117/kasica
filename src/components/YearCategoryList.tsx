import { useId, useState } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { YearCategory, YearMonth } from '../lib/budget'
import { formatAmount, formatPercent, formatRSD } from '../lib/money'
import { ChevronDownIcon } from './icons'
import { categoryLabel, categoryColor, cellBackground, fullMonth, shortMonth } from './yearTable'

type Props = {
  categories: YearCategory<Category>[]
  months: YearMonth[]
}

/** Phone version of the category heatmap: one row per category with a strip of its 12 months. */
export function YearCategoryList({ categories, months }: Props) {
  return (
    <ul className="mt-2 flex flex-col divide-y divide-border">
      {categories.map((column, index) => (
        <CategoryRow key={column.categoryId} column={column} index={index} months={months} />
      ))}
    </ul>
  )
}

type RowProps = {
  column: YearCategory<Category>
  /** Position of the category in every month's `cells`. */
  index: number
  months: YearMonth[]
}

function CategoryRow({ column, index, months }: RowProps) {
  const [open, setOpen] = useState(false)
  const monthsId = useId()
  const label = categoryLabel(column)
  const color = categoryColor(column)

  return (
    <li className="py-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={monthsId}
        aria-label={sr.year.categoryMonths(label)}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 rounded-2xl px-2 py-1 text-left transition hover:bg-surface-muted"
      >
        <span className="flex w-full items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {label}
            {column.category?.archived && (
              <span className="ml-1 text-xs font-normal text-text-muted">({sr.year.archived})</span>
            )}
          </span>
          <span className="amount shrink-0 text-sm whitespace-nowrap">{formatRSD(column.total)}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className={`size-4 shrink-0 self-center text-text-muted transition ${open ? 'rotate-180' : ''}`}
          />
        </span>

        <span aria-hidden="true" className="flex w-full items-center gap-2">
          <span className="grid flex-1 grid-cols-12 gap-0.5">
            {months.map(({ month, cells }) => (
              <span key={month} className="flex flex-col items-center gap-0.5">
                <span
                  className="h-3 w-full rounded-[3px] bg-surface-muted"
                  style={{ backgroundColor: cellBackground(color, cells[index].intensity) }}
                />
                <span className="text-[9px] leading-none text-text-muted">{shortMonth(month).charAt(0)}</span>
              </span>
            ))}
          </span>
          <span className="w-9 shrink-0 text-right text-xs text-text-muted">{formatPercent(column.share)}</span>
        </span>
      </button>

      {open && (
        <dl id={monthsId} className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
          {months.map(({ month, cells }) => (
            <div key={month} className="flex min-w-0 justify-between gap-1 rounded-lg bg-surface-muted px-2 py-1.5">
              <dt className="text-text-muted">
                <abbr title={fullMonth(month)} className="no-underline">
                  {shortMonth(month)}
                </abbr>
              </dt>
              <dd className="amount truncate">{cells[index].total !== 0 ? formatAmount(cells[index].total) : sr.year.noValue}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}
