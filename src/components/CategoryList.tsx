import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'

export function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center gap-3 rounded-2xl px-1 py-1 data-[archived=true]:opacity-60"
          data-archived={category.archived}
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
            style={{ backgroundColor: `${category.color}26` }}
          >
            {category.emoji}
          </span>
          <span className="min-w-0 truncate">{category.name}</span>
          {category.archived && (
            <span className="text-xs text-text-muted">({sr.settings.archived})</span>
          )}
        </li>
      ))}
    </ul>
  )
}
