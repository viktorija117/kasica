import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { CategoryChoice, CategoryMapping, ExcelCategory } from '../lib/excelImport'

type Props = {
  excelCategories: ExcelCategory[]
  categories: Category[]
  mapping: CategoryMapping
  onChange: (name: string, choice: CategoryChoice) => void
}

const NEW = 'new'

/** For every category name in the workbook: an existing category, or a new one. */
export function ImportCategoryMapping({ excelCategories, categories, mapping, onChange }: Props) {
  return (
    <ul className="flex flex-col gap-4">
      {excelCategories.map(({ name, count }) => {
        const choice = mapping[name]
        const value = choice?.kind === 'existing' ? choice.categoryId : NEW
        return (
          <li key={name} className="flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 font-medium break-words">{name}</span>
              <span className="shrink-0 text-xs text-text-muted">{sr.import.expenseCount(count)}</span>
            </p>
            <select
              aria-label={sr.import.categoryFor(name)}
              value={value}
              onChange={(event) =>
                onChange(
                  name,
                  event.target.value === NEW
                    ? { kind: 'new' }
                    : { kind: 'existing', categoryId: event.target.value },
                )
              }
              className="h-11 w-full min-w-0 rounded-2xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value={NEW}>{sr.import.createNew}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {`${category.emoji} ${category.name}${category.archived ? ` (${sr.settings.archived})` : ''}`}
                </option>
              ))}
            </select>
          </li>
        )
      })}
    </ul>
  )
}
