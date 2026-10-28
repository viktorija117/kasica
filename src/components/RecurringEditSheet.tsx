import { useId, useState, type FormEvent } from 'react'
import type { Category } from '../data/categories'
import type { RecurringExpense } from '../data/recurring'
import { useSaveRecurring } from '../hooks/useRecurring'
import { sr } from '../i18n/sr'
import { nextSort } from '../lib/categoryForm'
import type { EntryRequest } from '../lib/entryForms'
import {
  newRecurringForm,
  recurringToForm,
  validateRecurringForm,
  withCategory,
  type RecurringFormError,
  type RecurringFormState,
} from '../lib/recurring'
import { AmountInput } from './AmountInput'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { CategoryPicker } from './CategoryPicker'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  request: EntryRequest<RecurringExpense> | null
  /** All recurring expenses, to put a new one last. */
  recurring: RecurringExpense[]
  /** All categories of the household, archived included. */
  categories: Category[]
  onDelete: (recurring: RecurringExpense) => void
  onClose: () => void
}

export function RecurringEditSheet({ request, recurring, categories, onDelete, onClose }: Props) {
  const title = request?.mode === 'edit' ? sr.recurring.editTitle : sr.recurring.addTitle
  return (
    <BottomSheet open={request !== null} title={title} onClose={onClose}>
      {request && (
        <RecurringForm
          key={request.mode === 'edit' ? request.entry.id : 'add'}
          editing={request.mode === 'edit' ? request.entry : null}
          recurring={recurring}
          categories={categories}
          onDelete={onDelete}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}

const errorText: Record<RecurringFormError, string> = {
  name: sr.recurring.errorName,
  category: sr.recurring.errorCategory,
  amount: sr.recurring.errorAmount,
  day: sr.recurring.errorDay,
}

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

type FormProps = {
  editing: RecurringExpense | null
  recurring: RecurringExpense[]
  categories: Category[]
  onDelete: (recurring: RecurringExpense) => void
  onDone: () => void
}

function RecurringForm({ editing, recurring, categories, onDelete, onDone }: FormProps) {
  const [state, setState] = useState<RecurringFormState>(() =>
    editing ? recurringToForm(editing) : newRecurringForm(),
  )
  const [showErrors, setShowErrors] = useState(false)
  const save = useSaveRecurring()
  const dayId = useId()

  const result = validateRecurringForm(state)
  const errors = new Set(showErrors && !result.ok ? result.errors : [])
  const errorFor = (field: RecurringFormError) => (errors.has(field) ? errorText[field] : undefined)
  const set = (patch: Partial<RecurringFormState>) => setState((prev) => ({ ...prev, ...patch }))
  // Active categories, plus its own one when that has since been archived.
  const pickable = categories.filter((category) => !category.archived || category.id === editing?.category_id)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!result.ok) {
      setShowErrors(true)
      return
    }
    // Optimistic: the list and Home update at once, so the sheet can close right away.
    if (editing) save.mutate({ id: editing.id, input: result.input })
    else save.mutate({ input: result.input, sort: nextSort(recurring) })
    onDone()
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <TextField
        label={sr.recurring.name}
        placeholder={sr.recurring.namePlaceholder}
        maxLength={100}
        value={state.name}
        onChange={(event) => set({ name: event.target.value })}
        error={errorFor('name')}
      />

      <div className="flex flex-col gap-1">
        <AmountInput
          label={sr.recurring.amount}
          value={state.amountText}
          onChange={(amountText) => set({ amountText })}
          error={errorFor('amount')}
        />
        <p className="text-xs text-text-muted">{sr.recurring.amountHint}</p>
      </div>

      <CategoryPicker
        categories={pickable}
        value={state.categoryId}
        onChange={(category) => setState((prev) => withCategory(prev, category))}
        error={errorFor('category')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={dayId} className="text-sm font-medium">
          {sr.recurring.day}
        </label>
        <select
          id={dayId}
          value={state.day}
          onChange={(event) => set({ day: Number(event.target.value) })}
          className="h-12 rounded-2xl border border-border bg-surface px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
        >
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {sr.recurring.dayOption(day)}
            </option>
          ))}
        </select>
        {errors.has('day') && <p className="text-sm text-danger">{errorText.day}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{sr.recurring.necessity}</span>
        <SegmentedControl
          value={state.necessity}
          options={[
            { value: 'needed', label: sr.necessity.needed },
            { value: 'unneeded', label: sr.necessity.unneeded },
          ]}
          onChange={(necessity) => set({ necessity, necessityTouched: true })}
        />
      </div>

      <div className={`grid gap-2 ${editing ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {editing && (
          <Button variant="secondary" className="text-danger" onClick={() => onDelete(editing)}>
            {sr.recurring.delete}
          </Button>
        )}
        <Button type="submit">{editing ? sr.recurring.saveChanges : sr.recurring.save}</Button>
      </div>
    </form>
  )
}
