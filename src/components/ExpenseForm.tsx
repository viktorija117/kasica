import { useId, useMemo, useReducer, useState, type FormEvent, type RefObject } from 'react'
import type { Category } from '../data/categories'
import type { ExpenseSuggestion } from '../data/expenses'
import type { HouseholdMember } from '../data/households'
import { useCreateExpense, useDeleteExpense, useUpdateExpense } from '../hooks/useExpenses'
import type { ExpenseSheetRequest } from '../hooks/useExpenseSheet'
import { sr } from '../i18n/sr'
import { todayKey } from '../lib/dates'
import {
  expenseFormReducer,
  expenseToForm,
  newExpenseForm,
  validateExpenseForm,
  type ExpenseFormError,
} from '../lib/expenseForm'
import { formatRSD } from '../lib/money'
import { findExactSuggestion, matchSuggestions } from '../lib/suggestions'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { CategoryPicker } from './CategoryPicker'
import { DescriptionInput } from './DescriptionInput'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  request: ExpenseSheetRequest
  categories: Category[]
  members: HouseholdMember[]
  suggestions: ExpenseSuggestion[]
  currentUserId: string
  amountRef: RefObject<HTMLInputElement>
  onDone: () => void
}

const errorText: Record<ExpenseFormError, string> = {
  amount: sr.expenseForm.errorAmount,
  category: sr.expenseForm.errorCategory,
  date: sr.expenseForm.errorDate,
}

/** Active categories, plus the expense's own category when it has since been archived. */
function pickableCategories(categories: Category[], keepId: string | null): Category[] {
  return categories.filter((category) => !category.archived || category.id === keepId)
}

export function ExpenseForm({
  request,
  categories,
  members,
  suggestions,
  currentUserId,
  amountRef,
  onDone,
}: Props) {
  const editing = request.mode === 'edit' ? request.expense : null
  const [state, dispatch] = useReducer(expenseFormReducer, null, () =>
    editing ? expenseToForm(editing) : newExpenseForm(todayKey(), currentUserId),
  )
  const [showErrors, setShowErrors] = useState(false)
  const [noteOpen, setNoteOpen] = useState(state.note !== '')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const noteId = useId()

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()

  const result = validateExpenseForm(state)
  const errors = new Set(showErrors && !result.ok ? result.errors : [])
  const errorFor = (field: ExpenseFormError) => (errors.has(field) ? errorText[field] : undefined)

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const pickable = useMemo(
    () => pickableCategories(categories, editing?.category_id ?? null),
    [categories, editing],
  )
  const matches = useMemo(
    () => matchSuggestions(suggestions, state.description),
    [suggestions, state.description],
  )
  const memberOptions = members.map((member) => ({
    value: member.user_id,
    label: member.display_name,
  }))
  const necessityOptions = [
    { value: 'needed' as const, label: sr.necessity.needed },
    { value: 'unneeded' as const, label: sr.necessity.unneeded },
  ]

  const onDescription = (value: string) => {
    dispatch({ type: 'description', value })
    // Typing a known description in full picks its category, like choosing the suggestion.
    const exact = state.categoryId ? undefined : findExactSuggestion(suggestions, value)
    if (exact) dispatch({ type: 'suggestion', suggestion: { ...exact, description: value } })
  }

  const save = (addAnother: boolean) => {
    if (!result.ok) {
      setShowErrors(true)
      return
    }
    if (editing) {
      updateExpense.mutate({ id: editing.id, input: result.input })
      onDone()
      return
    }
    createExpense.mutate({ id: crypto.randomUUID(), input: result.input })
    if (!addAnother) {
      onDone()
      return
    }
    const what = result.input.description || categoriesById.get(result.input.category_id)?.name
    setLastSaved(sr.expenseForm.saved(`${what} · ${formatRSD(result.input.amount)}`))
    setShowErrors(false)
    dispatch({ type: 'next' })
    amountRef.current?.focus()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    save(false)
  }

  const onDelete = () => {
    if (!editing) return
    onDone()
    deleteExpense(editing)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {lastSaved && (
        <p role="status" className="rounded-2xl bg-primary-soft px-4 py-2 text-sm font-medium text-primary">
          {lastSaved}
        </p>
      )}

      <AmountInput
        inputRef={amountRef}
        value={state.amountText}
        onChange={(value) => dispatch({ type: 'amount', value })}
        error={errorFor('amount')}
      />

      <CategoryPicker
        categories={pickable}
        value={state.categoryId}
        onChange={(category) => dispatch({ type: 'category', category })}
        error={errorFor('category')}
      />

      <DescriptionInput
        value={state.description}
        onChange={onDescription}
        suggestions={matches}
        categoriesById={categoriesById}
        onPick={(suggestion) => dispatch({ type: 'suggestion', suggestion })}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">{sr.expenseForm.necessity}</span>
        <SegmentedControl
          value={state.necessity}
          options={necessityOptions}
          onChange={(value) => dispatch({ type: 'necessity', value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <TextField
            label={sr.expenseForm.date}
            type="date"
            required
            value={state.date}
            onChange={(event) => dispatch({ type: 'date', value: event.target.value })}
          />
          {errorFor('date') && <p className="text-sm text-danger">{errorFor('date')}</p>}
        </div>

        {memberOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{sr.expenseForm.paidBy}</span>
            <SegmentedControl
              value={state.paidBy ?? ''}
              options={memberOptions}
              onChange={(value) => dispatch({ type: 'paidBy', value })}
            />
          </div>
        )}
      </div>

      {noteOpen ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-medium">
            {sr.expenseForm.note}
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={500}
            value={state.note}
            onChange={(event) => dispatch({ type: 'note', value: event.target.value })}
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="self-start text-sm font-medium text-primary hover:underline"
        >
          + {sr.expenseForm.addNote}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {editing ? (
          <Button variant="secondary" className="text-danger" onClick={onDelete}>
            {sr.expenseForm.delete}
          </Button>
        ) : (
          <Button variant="secondary" className="px-2 text-sm" onClick={() => save(true)}>
            {sr.expenseForm.saveAndAdd}
          </Button>
        )}
        <Button type="submit">{editing ? sr.expenseForm.saveChanges : sr.expenseForm.save}</Button>
      </div>
    </form>
  )
}
