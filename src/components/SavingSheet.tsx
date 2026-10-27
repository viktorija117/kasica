import { useRef, useState, type FormEvent, type RefObject } from 'react'
import type { Saving } from '../data/savings'
import { useDeleteSaving, useSaveSaving } from '../hooks/useSavings'
import { sr } from '../i18n/sr'
import { defaultDateFor, type MonthKey } from '../lib/dates'
import {
  newSavingForm,
  savingToForm,
  validateSavingForm,
  type EntryFormError,
  type EntryRequest,
  type SavingFormState,
  type SavingKind,
} from '../lib/entryForms'
import { AmountInput } from './AmountInput'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  request: EntryRequest<Saving> | null
  month: MonthKey
  onClose: () => void
}

export function SavingSheet({ request, month, onClose }: Props) {
  const amountRef = useRef<HTMLInputElement>(null)
  const title = request?.mode === 'edit' ? sr.saving.editTitle : sr.saving.addTitle

  return (
    <BottomSheet
      open={request !== null}
      title={title}
      onClose={onClose}
      initialFocusRef={request?.mode === 'add' ? amountRef : undefined}
    >
      {request && (
        <SavingForm
          key={request.mode === 'edit' ? request.entry.id : 'add'}
          editing={request.mode === 'edit' ? request.entry : null}
          month={month}
          amountRef={amountRef}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}

const errorText: Partial<Record<EntryFormError, string>> = {
  amount: sr.entryForm.errorAmount,
  date: sr.entryForm.errorDate,
}

const kindOptions: { value: SavingKind; label: string }[] = [
  { value: 'deposit', label: sr.saving.deposit },
  { value: 'withdrawal', label: sr.saving.withdrawal },
]

type FormProps = {
  editing: Saving | null
  month: MonthKey
  amountRef: RefObject<HTMLInputElement>
  onDone: () => void
}

function SavingForm({ editing, month, amountRef, onDone }: FormProps) {
  const [state, setState] = useState<SavingFormState>(() =>
    editing ? savingToForm(editing) : newSavingForm(defaultDateFor(month)),
  )
  const [showErrors, setShowErrors] = useState(false)
  const save = useSaveSaving()
  const deleteSaving = useDeleteSaving()

  const result = validateSavingForm(state)
  const errors = new Set(showErrors && !result.ok ? result.errors : [])
  const errorFor = (field: EntryFormError) => (errors.has(field) ? errorText[field] : undefined)
  const set = (patch: Partial<SavingFormState>) => setState((prev) => ({ ...prev, ...patch }))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!result.ok) {
      setShowErrors(true)
      return
    }
    save.mutate({ id: editing?.id, input: result.input }, { onSuccess: onDone })
  }

  const onDelete = () => {
    if (!editing) return
    onDone()
    deleteSaving(editing)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">{sr.saving.kind}</span>
        <SegmentedControl value={state.kind} options={kindOptions} onChange={(kind) => set({ kind })} />
      </div>

      <AmountInput
        inputRef={amountRef}
        value={state.amountText}
        onChange={(amountText) => set({ amountText })}
        error={errorFor('amount')}
      />

      <TextField
        label={sr.entryForm.date}
        type="date"
        required
        value={state.date}
        onChange={(event) => set({ date: event.target.value })}
        error={errorFor('date')}
      />

      <TextField
        label={sr.entryForm.note}
        placeholder={sr.saving.notePlaceholder}
        maxLength={500}
        value={state.note}
        onChange={(event) => set({ note: event.target.value })}
      />

      <div className={`grid gap-2 ${editing ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {editing && (
          <Button variant="secondary" className="text-danger" onClick={onDelete}>
            {sr.entryForm.delete}
          </Button>
        )}
        <Button type="submit" loading={save.isPending}>
          {editing ? sr.entryForm.saveChanges : sr.entryForm.save}
        </Button>
      </div>
    </form>
  )
}
