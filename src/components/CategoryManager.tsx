import { useCallback, useState } from 'react'
import type { Category } from '../data/categories'
import { useReorderCategories, useSetCategoryArchived } from '../hooks/useCategoryEditing'
import { useToast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import { moveId } from '../lib/categoryForm'
import type { EntryRequest } from '../lib/entryForms'
import { formatRSD } from '../lib/money'
import { Button } from './Button'
import { CategoryEditSheet } from './CategoryEditSheet'
import { ConfirmSheet } from './ConfirmSheet'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from './icons'

type Props = {
  /** All categories of the household in display order, archived included. */
  categories: Category[]
}

const arrow =
  'grid size-10 place-items-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent'

/** Settings → Kategorije: edit, reorder with arrows, add, archive and bring back. */
export function CategoryManager({ categories }: Props) {
  const [request, setRequest] = useState<EntryRequest<Category> | null>(null)
  const [archiving, setArchiving] = useState<Category | null>(null)
  const closeEdit = useCallback(() => setRequest(null), [])
  const closeArchive = useCallback(() => setArchiving(null), [])
  const reorder = useReorderCategories()
  const setArchived = useSetCategoryArchived()
  const showToast = useToast()

  const active = categories.filter((category) => !category.archived)
  const archived = categories.filter((category) => category.archived)
  const activeIds = active.map((category) => category.id)

  const move = (id: string, direction: -1 | 1) => reorder.mutate(moveId(activeIds, id, direction))

  const restore = (category: Category) => {
    setRequest(null)
    setArchived.mutate({ id: category.id, archived: false })
    showToast({ message: sr.categories.restoredToast(category.name) })
  }

  const confirmArchive = () => {
    if (!archiving) return
    const category = archiving
    setArchiving(null)
    setArchived.mutate({ id: category.id, archived: true })
    showToast({
      message: sr.categories.archivedToast(category.name),
      action: { label: sr.toast.undo, onClick: () => setArchived.mutate({ id: category.id, archived: false }) },
    })
  }

  return (
    <>
      <ul className="flex flex-col">
        {active.map((category, index) => (
          <li key={category.id} className="flex items-center gap-1">
            <CategoryButton category={category} onOpen={() => setRequest({ mode: 'edit', entry: category })} />
            <button
              type="button"
              className={arrow}
              aria-label={sr.categories.moveUp(category.name)}
              disabled={index === 0}
              onClick={() => move(category.id, -1)}
            >
              <ChevronUpIcon />
            </button>
            <button
              type="button"
              className={arrow}
              aria-label={sr.categories.moveDown(category.name)}
              disabled={index === active.length - 1}
              onClick={() => move(category.id, 1)}
            >
              <ChevronDownIcon />
            </button>
          </li>
        ))}
      </ul>

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setRequest({ mode: 'add' })}>
        <PlusIcon className="size-5" />
        {sr.categories.add}
      </Button>

      {archived.length > 0 && (
        <details className="mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer text-sm font-medium text-text-muted">
            {sr.categories.archivedTitle(archived.length)}
          </summary>
          <ul className="mt-2 flex flex-col opacity-70">
            {archived.map((category) => (
              <li key={category.id} className="flex">
                <CategoryButton category={category} onOpen={() => setRequest({ mode: 'edit', entry: category })} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <CategoryEditSheet
        request={request}
        categories={categories}
        onArchive={(category) => {
          setRequest(null)
          setArchiving(category)
        }}
        onRestore={restore}
        onClose={closeEdit}
      />
      <ConfirmSheet
        open={archiving !== null}
        title={sr.categories.archiveTitle}
        text={archiving ? sr.categories.archiveText(archiving.name) : ''}
        confirmLabel={sr.categories.archive}
        cancelLabel={sr.categories.archiveCancel}
        onConfirm={confirmArchive}
        onClose={closeArchive}
      />
    </>
  )
}

function CategoryButton({ category, onOpen }: { category: Category; onOpen: () => void }) {
  const details = [
    category.monthly_limit !== null && sr.categories.limitBadge(formatRSD(category.monthly_limit)),
    category.default_necessity === 'unneeded' && sr.necessity.unneeded.toLowerCase(),
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={sr.categories.edit(category.name)}
      className="-ml-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1.5 text-left transition hover:bg-surface-muted"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${category.color}26` }}
      >
        {category.emoji}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{category.name}</span>
        {details.length > 0 && <span className="block truncate text-xs text-text-muted">{details.join(' · ')}</span>}
      </span>
    </button>
  )
}
