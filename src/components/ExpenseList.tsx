import type { Category } from '../data/categories'
import type { Expense } from '../data/expenses'
import { sr } from '../i18n/sr'
import type { DayGroup } from '../lib/budget'
import { dayLabel } from '../lib/dates'
import { formatRSD } from '../lib/money'

type Props = {
  days: DayGroup<Expense>[]
  categoriesById: ReadonlyMap<string, Category>
  memberNames: ReadonlyMap<string, string>
  onOpen: (expense: Expense) => void
}

/** Expenses grouped by day, newest first, with each day's total. */
export function ExpenseList({ days, categoriesById, memberNames, onOpen }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {days.map((day) => (
        <section key={day.date} aria-label={dayLabel(day.date)}>
          <header className="mb-1.5 flex items-baseline justify-between px-1 text-sm">
            <h2 className="font-semibold">{dayLabel(day.date)}</h2>
            <span className="amount text-sm text-text-muted">{formatRSD(day.total)}</span>
          </header>
          <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
            {day.items.map((expense) => (
              <li key={expense.id}>
                <ExpenseRow
                  expense={expense}
                  category={categoriesById.get(expense.category_id)}
                  paidBy={expense.paid_by ? memberNames.get(expense.paid_by) : undefined}
                  onOpen={onOpen}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

type RowProps = {
  expense: Expense
  category: Category | undefined
  paidBy: string | undefined
  onOpen: (expense: Expense) => void
}

function ExpenseRow({ expense, category, paidBy, onOpen }: RowProps) {
  const details = [category?.name ?? sr.expenses.unknownCategory, paidBy && sr.expenses.paidBy(paidBy)]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={() => onOpen(expense)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-muted active:bg-surface-muted"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: category ? `${category.color}26` : undefined }}
      >
        {category?.emoji ?? '❔'}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {expense.description || (
            <span className="text-text-muted italic">{sr.expenses.noDescription}</span>
          )}
        </span>
        <span className="truncate text-xs text-text-muted">{details}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="amount text-base">{formatRSD(expense.amount)}</span>
        {expense.necessity === 'unneeded' && (
          <span className="rounded-full bg-danger-soft px-1.5 text-[10px] font-medium text-danger">
            {sr.necessity.unneeded}
          </span>
        )}
      </span>
    </button>
  )
}
