import type { ReactNode } from 'react'
import type { Category } from '../data/categories'
import type { HouseholdMember } from '../data/households'
import { sr } from '../i18n/sr'
import { hasActiveFilters, type ExpenseFilters } from '../lib/expenseFilters'

type Props = {
  filters: ExpenseFilters
  categories: Category[]
  members: HouseholdMember[]
  onChange: (change: Partial<ExpenseFilters>) => void
  onClear: () => void
}

const NONE = 'none'

export function ExpenseFiltersBar({ filters, categories, members, onChange, onClear }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <input
        type="search"
        aria-label={sr.expenses.search}
        placeholder={sr.expenses.searchPlaceholder}
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
        className="h-11 rounded-2xl border border-border bg-surface px-4 text-base outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      <div className="grid grid-cols-3 gap-2">
        <FilterSelect
          label={sr.expenses.filterCategory}
          value={filters.categoryId ?? ''}
          onChange={(value) => onChange({ categoryId: value || null })}
        >
          <option value="">{sr.expenses.allCategories}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji} {category.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label={sr.expenses.filterNecessity}
          value={filters.necessity ?? ''}
          onChange={(value) =>
            onChange({ necessity: value === 'needed' || value === 'unneeded' ? value : null })
          }
        >
          <option value="">{sr.expenses.allNecessity}</option>
          <option value="needed">{sr.necessity.needed}</option>
          <option value="unneeded">{sr.necessity.unneeded}</option>
        </FilterSelect>

        <FilterSelect
          label={sr.expenses.filterPaidBy}
          value={filters.paidBy ?? ''}
          onChange={(value) => onChange({ paidBy: value || null })}
        >
          <option value="">{sr.expenses.allMembers}</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name}
            </option>
          ))}
          <option value={NONE}>{sr.expenses.nobody}</option>
        </FilterSelect>
      </div>
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="self-end text-sm font-medium text-primary hover:underline"
        >
          {sr.expenses.clearFilters}
        </button>
      )}
    </div>
  )
}

type SelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

function FilterSelect({ label, value, onChange, children }: SelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      data-active={value !== ''}
      className="h-11 min-w-0 truncate rounded-2xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25 data-[active=true]:border-primary data-[active=true]:bg-primary-soft data-[active=true]:text-primary"
    >
      {children}
    </select>
  )
}
