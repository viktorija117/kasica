import { useState, type FormEvent } from 'react'
import type { Category } from '../data/categories'
import { useSaveCategory } from '../hooks/useCategoryEditing'
import { sr } from '../i18n/sr'
import {
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  categoryToForm,
  newCategoryForm,
  nextSort,
  validateCategoryForm,
  type CategoryFormError,
  type CategoryFormState,
} from '../lib/categoryForm'
import type { EntryRequest } from '../lib/entryForms'
import { AmountInput } from './AmountInput'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  request: EntryRequest<Category> | null
  /** All categories of the household, archived included. */
  categories: Category[]
  onArchive: (category: Category) => void
  onRestore: (category: Category) => void
  onClose: () => void
}

export function CategoryEditSheet({ request, categories, onArchive, onRestore, onClose }: Props) {
  const title = request?.mode === 'edit' ? sr.categories.editTitle : sr.categories.addTitle
  return (
    <BottomSheet open={request !== null} title={title} onClose={onClose}>
      {request && (
        <CategoryForm
          key={request.mode === 'edit' ? request.entry.id : 'add'}
          editing={request.mode === 'edit' ? request.entry : null}
          categories={categories}
          onArchive={onArchive}
          onRestore={onRestore}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}

const errorText: Record<CategoryFormError, string> = {
  name: sr.categories.errorName,
  duplicate: sr.categories.errorDuplicate,
  emoji: sr.categories.errorEmoji,
  color: sr.categories.errorColor,
  limit: sr.categories.errorLimit,
}

type FormProps = {
  editing: Category | null
  categories: Category[]
  onArchive: (category: Category) => void
  onRestore: (category: Category) => void
  onDone: () => void
}

const chip =
  'grid size-11 place-items-center rounded-xl border border-transparent text-xl transition hover:bg-surface-muted aria-pressed:border-primary aria-pressed:bg-primary-soft'

function CategoryForm({ editing, categories, onArchive, onRestore, onDone }: FormProps) {
  const [state, setState] = useState<CategoryFormState>(() =>
    editing ? categoryToForm(editing) : newCategoryForm(categories),
  )
  const [showErrors, setShowErrors] = useState(false)
  const save = useSaveCategory()

  const otherNames = categories.filter((category) => category.id !== editing?.id).map((category) => category.name)
  const result = validateCategoryForm(state, otherNames)
  const errors = new Set(showErrors && !result.ok ? result.errors : [])
  const errorFor = (...fields: CategoryFormError[]) => {
    const field = fields.find((candidate) => errors.has(candidate))
    return field ? errorText[field] : undefined
  }
  const set = (patch: Partial<CategoryFormState>) => setState((prev) => ({ ...prev, ...patch }))
  const customEmoji = !CATEGORY_EMOJIS.some((emoji) => emoji === state.emoji)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!result.ok) {
      setShowErrors(true)
      return
    }
    // Optimistic: the change shows everywhere at once, so the sheet can close right away.
    if (editing) save.mutate({ id: editing.id, input: result.input })
    else save.mutate({ input: result.input, sort: nextSort(categories) })
    onDone()
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex items-end gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${state.color}26` }}
        >
          {state.emoji || '❔'}
        </span>
        <TextField
          className="min-w-0 flex-1"
          label={sr.categories.name}
          placeholder={sr.categories.namePlaceholder}
          maxLength={60}
          value={state.name}
          onChange={(event) => set({ name: event.target.value })}
          error={errorFor('name', 'duplicate')}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">{sr.categories.emoji}</legend>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
          {CATEGORY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={state.emoji === emoji}
              onClick={() => set({ emoji })}
              className={chip}
            >
              {emoji}
            </button>
          ))}
        </div>
        <TextField
          label={sr.categories.emojiOwn}
          maxLength={16}
          autoComplete="off"
          value={customEmoji ? state.emoji : ''}
          onChange={(event) => set({ emoji: event.target.value.trim() })}
          error={errorFor('emoji')}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{sr.categories.color}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={state.color.toLowerCase() === color}
              onClick={() => set({ color })}
              className="size-9 rounded-full ring-offset-2 ring-offset-surface transition aria-pressed:ring-2 aria-pressed:ring-text"
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="color"
              value={state.color}
              onChange={(event) => set({ color: event.target.value })}
              className="size-9 cursor-pointer rounded-full border border-border bg-transparent"
            />
            {sr.categories.colorOwn}
          </label>
        </div>
        {errors.has('color') && <p className="mt-1 text-sm text-danger">{errorText.color}</p>}
      </fieldset>

      <div className="flex flex-col gap-1">
        <AmountInput
          label={sr.categories.limit}
          value={state.limitText}
          onChange={(limitText) => set({ limitText })}
          error={errorFor('limit')}
        />
        <p className="text-xs text-text-muted">{sr.categories.limitHint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{sr.categories.necessity}</span>
        <SegmentedControl
          value={state.necessity}
          options={[
            { value: 'needed', label: sr.necessity.needed },
            { value: 'unneeded', label: sr.necessity.unneeded },
          ]}
          onChange={(necessity) => set({ necessity })}
        />
      </div>

      <div className={`grid gap-2 ${editing ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {editing &&
          (editing.archived ? (
            <Button variant="secondary" onClick={() => onRestore(editing)}>
              {sr.categories.restore}
            </Button>
          ) : (
            <Button variant="secondary" className="text-danger" onClick={() => onArchive(editing)}>
              {sr.categories.archive}
            </Button>
          ))}
        <Button type="submit">{editing ? sr.categories.saveChanges : sr.categories.save}</Button>
      </div>
    </form>
  )
}
