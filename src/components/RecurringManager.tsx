import { useCallback, useMemo, useState } from 'react'
import type { Category } from '../data/categories'
import type { RecurringExpense } from '../data/recurring'
import {
  useDeleteRecurring,
  useReorderRecurring,
  useSetRecurringActive,
} from '../hooks/useRecurring'
import { useToast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import { moveId } from '../lib/categoryForm'
import type { EntryRequest } from '../lib/entryForms'
import { formatRSD } from '../lib/money'
import { Button } from './Button'
import { ConfirmSheet } from './ConfirmSheet'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from './icons'
import { RecurringEditSheet } from './RecurringEditSheet'
import { Switch } from './Switch'

type Props = {
  /** All recurring expenses in display order, inactive included. */
  recurring: RecurringExpense[]
  /** All categories of the household, archived included. */
  categories: Category[]
}

const arrow =
  'grid size-10 place-items-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent'

/** Settings → Ponavljajući troškovi: add, edit, switch on and off, reorder, delete. */
export function RecurringManager({ recurring, categories }: Props) {
  const [request, setRequest] = useState<EntryRequest<RecurringExpense> | null>(null)
  const [deleting, setDeleting] = useState<RecurringExpense | null>(null)
  const closeEdit = useCallback(() => setRequest(null), [])
  const closeDelete = useCallback(() => setDeleting(null), [])
  const setActive = useSetRecurringActive()
  const reorder = useReorderRecurring()
  const remove = useDeleteRecurring()
  const showToast = useToast()

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const ids = recurring.map((item) => item.id)
  const move = (id: string, direction: -1 | 1) => reorder.mutate(moveId(ids, id, direction))

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id)
    showToast({ message: sr.recurring.deletedToast(deleting.name) })
    setDeleting(null)
  }

  return (
    <>
      <p className="mb-3 text-sm text-text-muted">{sr.recurring.intro}</p>

      {recurring.length === 0 ? (
        <p className="mb-1 text-sm text-text-muted">{sr.recurring.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {recurring.map((item, index) => (
            <li key={item.id} className="flex items-center gap-1">
              <RecurringButton
                recurring={item}
                category={categoriesById.get(item.category_id)}
                onOpen={() => setRequest({ mode: 'edit', entry: item })}
              />
              <Switch
                label={sr.recurring.activeLabel(item.name)}
                hideLabel
                checked={item.active}
                onChange={(active) => setActive.mutate({ id: item.id, active })}
              />
              <button
                type="button"
                className={arrow}
                aria-label={sr.recurring.moveUp(item.name)}
                disabled={index === 0}
                onClick={() => move(item.id, -1)}
              >
                <ChevronUpIcon />
              </button>
              <button
                type="button"
                className={arrow}
                aria-label={sr.recurring.moveDown(item.name)}
                disabled={index === recurring.length - 1}
                onClick={() => move(item.id, 1)}
              >
                <ChevronDownIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setRequest({ mode: 'add' })}>
        <PlusIcon className="size-5" />
        {sr.recurring.add}
      </Button>

      <RecurringEditSheet
        request={request}
        recurring={recurring}
        categories={categories}
        onDelete={(item) => {
          setRequest(null)
          setDeleting(item)
        }}
        onClose={closeEdit}
      />
      <ConfirmSheet
        open={deleting !== null}
        title={sr.recurring.deleteTitle}
        text={deleting ? sr.recurring.deleteText(deleting.name) : ''}
        confirmLabel={sr.recurring.delete}
        cancelLabel={sr.recurring.deleteCancel}
        onConfirm={confirmDelete}
        onClose={closeDelete}
      />
    </>
  )
}

type ButtonProps = {
  recurring: RecurringExpense
  category: Category | undefined
  onOpen: () => void
}

function RecurringButton({ recurring, category, onOpen }: ButtonProps) {
  const details = [
    formatRSD(recurring.amount),
    sr.recurring.everyMonth(recurring.day_of_month),
    !recurring.active && sr.recurring.inactive,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={sr.recurring.edit(recurring.name)}
      className={`-ml-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1.5 text-left transition hover:bg-surface-muted ${
        recurring.active ? '' : 'opacity-60'
      }`}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${category?.color ?? '#757575'}26` }}
      >
        {category?.emoji ?? '📦'}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{recurring.name}</span>
        <span className="block truncate text-xs text-text-muted">{details.join(' · ')}</span>
      </span>
    </button>
  )
}
