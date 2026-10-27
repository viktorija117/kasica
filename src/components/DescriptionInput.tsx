import { useId } from 'react'
import type { Category } from '../data/categories'
import type { ExpenseSuggestion } from '../data/expenses'
import { sr } from '../i18n/sr'

type Props = {
  value: string
  onChange: (value: string) => void
  suggestions: ExpenseSuggestion[]
  categoriesById: ReadonlyMap<string, Category>
  onPick: (suggestion: ExpenseSuggestion) => void
}

/** Description field with matching descriptions from the household's history below it. */
export function DescriptionInput({ value, onChange, suggestions, categoriesById, onPick }: Props) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-muted">
        {sr.expenseForm.description}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="done"
        maxLength={200}
        placeholder={sr.expenseForm.descriptionPlaceholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-border bg-surface px-4 text-base outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
      {suggestions.length > 0 && (
        <ul aria-label={sr.expenseForm.suggestions} className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => {
            const category = categoriesById.get(suggestion.category_id)
            return (
              <li key={suggestion.description}>
                <button
                  type="button"
                  onClick={() => onPick(suggestion)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm transition hover:bg-surface-muted active:scale-95"
                >
                  {category && <span aria-hidden="true">{category.emoji}</span>}
                  {suggestion.description}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
