import { useMemo } from 'react'
import type { Category } from '../data/categories'
import type { RecurringExpense } from '../data/recurring'
import { useExpenses } from '../hooks/useExpenses'
import { useExpenseSheet } from '../hooks/useExpenseSheet'
import { useCategories } from '../hooks/useHousehold'
import { useRecurring } from '../hooks/useRecurring'
import { sr } from '../i18n/sr'
import { dayOfMonth, monthLabel, monthOfDate, todayKey, type MonthKey } from '../lib/dates'
import { formatRSD } from '../lib/money'
import { monthDue, paymentDate, type DueItem } from '../lib/recurring'

type Props = { month: MonthKey }

/** Home → "Za plaćanje ovog meseca": recurring expenses of the month that are not paid yet. */
export function DueThisMonth({ month }: Props) {
  const recurring = useRecurring()
  const { expenses } = useExpenses(month)
  const categories = useCategories()
  const openSheet = useExpenseSheet()
  const today = todayKey()

  const due = useMemo(
    () => (recurring.data && expenses ? monthDue(recurring.data, expenses, month, today) : null),
    [recurring.data, expenses, month, today],
  )
  const categoriesById = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )

  // Nothing to show until loaded, and nothing at all for a month without recurring expenses.
  if (!due || due.pending.length + due.paidCount === 0) return null

  const title = month === monthOfDate(today) ? sr.recurring.dueTitleCurrent : sr.recurring.dueTitle(monthLabel(month))
  const all = due.pending.length + due.paidCount
  const pay = (item: DueItem<RecurringExpense>) =>
    openSheet({ mode: 'pay', recurring: item.recurring, date: paymentDate(item.date, today) })

  return (
    <section aria-label={title} className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-text-muted">{title}</h2>
        <span className="text-xs text-text-muted">{sr.recurring.paidCount(due.paidCount, all)}</span>
      </div>

      {due.pending.length === 0 ? (
        <p className="mt-2 font-medium text-primary">{sr.recurring.allPaid}</p>
      ) : (
        <>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {due.pending.map((item) => (
              <DueRow
                key={item.recurring.id}
                item={item}
                category={categoriesById.get(item.recurring.category_id)}
                onPay={() => pay(item)}
              />
            ))}
          </ul>
          <p className="mt-2 border-t border-border pt-2 text-right text-sm font-semibold">
            {sr.recurring.dueTotal(formatRSD(due.pendingTotal))}
          </p>
        </>
      )}
    </section>
  )
}

type RowProps = {
  item: DueItem<RecurringExpense>
  category: Category | undefined
  onPay: () => void
}

function DueRow({ item, category, onPay }: RowProps) {
  const { recurring, status } = item
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${category?.color ?? '#757575'}26` }}
      >
        {category?.emoji ?? '📦'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{recurring.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="amount">{formatRSD(recurring.amount)}</span>
          <span aria-hidden="true">·</span>
          <span>{sr.recurring.dueDay(dayOfMonth(item.date))}</span>
          {status === 'late' && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger">{sr.recurring.late}</span>
          )}
          {status === 'today' && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{sr.recurring.today}</span>
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={onPay}
        aria-label={sr.recurring.payLabel(recurring.name)}
        className="h-10 shrink-0 rounded-2xl bg-primary-soft px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-on-primary active:scale-[0.98]"
      >
        {sr.recurring.pay}
      </button>
    </li>
  )
}
