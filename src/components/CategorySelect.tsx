import { useId } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'

type Props = {
  label: string
  categories: Category[]
  value: string | null
  onChange: (category: Category) => void
  error?: string
  hint?: string
}

/** Compact category choice for lists where the big CategoryPicker grid would not fit. */
export function CategorySelect({ label, categories, value, onChange, error, hint }: Props) {
  const id = useId()
  const messageId = `${id}-message`
  const byId = new Map(categories.map((category) => [category.id, category]))

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        onChange={(event) => {
          const category = byId.get(event.target.value)
          if (category) onChange(category)
        }}
        className="h-11 rounded-2xl border border-border bg-surface px-3 text-base outline-none transition aria-invalid:border-danger focus:border-primary focus:ring-2 focus:ring-primary/25"
      >
        <option value="" disabled>
          {sr.receipt.chooseCategory}
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.emoji} {category.name}
          </option>
        ))}
      </select>
      {(error || hint) && (
        <p id={messageId} className={`text-xs ${error ? 'text-danger' : 'text-text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
