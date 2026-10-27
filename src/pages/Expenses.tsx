import { useMemo, useState } from 'react'
import { ExpenseFiltersBar } from '../components/ExpenseFiltersBar'
import { ExpenseList } from '../components/ExpenseList'
import { MonthMoneySections } from '../components/MonthMoneySections'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { PageTitle } from '../components/PageTitle'
import { QueryStatus } from '../components/QueryStatus'
import { useCategoryFilter } from '../hooks/useCategoryFilter'
import { useExpenses } from '../hooks/useExpenses'
import { useExpenseSheet } from '../hooks/useExpenseSheet'
import { useCategories, useMembers } from '../hooks/useHousehold'
import { useSelectedMonth } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'
import { groupByDay, sumAmounts } from '../lib/budget'
import { emptyFilters, filterExpenses, hasActiveFilters, type ExpenseFilters } from '../lib/expenseFilters'
import { formatRSD } from '../lib/money'

type LocalFilters = Omit<ExpenseFilters, 'categoryId'>

export function Expenses() {
  const [month, setMonth] = useSelectedMonth()
  const [categoryId, setCategoryId] = useCategoryFilter()
  const [local, setLocal] = useState<LocalFilters>(emptyFilters)
  const { expenses, error } = useExpenses(month)
  const categories = useCategories()
  const members = useMembers()
  const openSheet = useExpenseSheet()

  const filters = useMemo(() => ({ ...local, categoryId }), [local, categoryId])
  const visible = useMemo(() => expenses && filterExpenses(expenses, filters), [expenses, filters])
  const days = useMemo(() => visible && groupByDay(visible), [visible])
  const total = useMemo(() => visible && sumAmounts(visible), [visible])

  const categoriesById = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )
  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.user_id, member.display_name])),
    [members.data],
  )

  const changeFilters = ({ categoryId: nextCategory, ...rest }: Partial<ExpenseFilters>) => {
    if (nextCategory !== undefined) setCategoryId(nextCategory)
    setLocal((prev) => ({ ...prev, ...rest }))
  }
  const clearFilters = () => {
    setCategoryId(null)
    setLocal(emptyFilters)
  }

  return (
    <>
      <PageTitle>{sr.expenses.title}</PageTitle>
      <MonthSwitcher month={month} onChange={setMonth} />

      <MonthMoneySections month={month} memberNames={memberNames} />

      <ExpenseFiltersBar
        filters={filters}
        categories={categories.data ?? []}
        members={members.data ?? []}
        onChange={changeFilters}
        onClear={clearFilters}
      />

      {!visible || !days || total === undefined ? (
        <QueryStatus error={error} />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-text-muted">
          {hasActiveFilters(filters) ? sr.expenses.noMatches : sr.expenses.empty}
        </p>
      ) : (
        <>
          <p className="mb-4 flex items-baseline justify-between rounded-2xl bg-surface-muted px-4 py-3">
            <span className="text-sm text-text-muted">
              {sr.expenses.total} · {sr.expenses.count(visible.length)}
            </span>
            <span className="amount text-xl">{formatRSD(total)}</span>
          </p>
          <ExpenseList
            days={days}
            categoriesById={categoriesById}
            memberNames={memberNames}
            onOpen={(expense) => openSheet({ mode: 'edit', expense })}
          />
        </>
      )}
    </>
  )
}
