import type { CSSProperties } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'

type Props = {
  categories: Category[]
  value: string | null
  onChange: (category: Category) => void
  error?: string
}

/** Grid of category buttons with emojis; one tap picks a category. */
export function CategoryPicker({ categories, value, onChange, error }: Props) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-text-muted">{sr.expenseForm.category}</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={category.id === value}
            onClick={() => onChange(category)}
            style={{ '--cat': category.color } as CSSProperties}
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-transparent bg-surface-muted px-1 py-1.5 transition active:scale-95 aria-pressed:border-(--cat) aria-pressed:bg-(--cat)/15"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {category.emoji}
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight font-medium">
              {category.name}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  )
}
