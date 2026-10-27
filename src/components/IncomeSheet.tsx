import { useRef, useState, type FormEvent, type RefObject } from 'react'
import type { Income } from '../data/incomes'
import type { HouseholdMember } from '../data/households'
import { useSession } from '../hooks/useAuth'
import { useMembers } from '../hooks/useHousehold'
import { useDeleteIncome, useSaveIncome } from '../hooks/useIncomes'
import { sr } from '../i18n/sr'
import { defaultDateFor, type MonthKey } from '../lib/dates'
import {
  incomeToForm,
  newIncomeForm,
  validateIncomeForm,
  type EntryFormError,
  type EntryRequest,
  type IncomeFormState,
} from '../lib/entryForms'
import { AmountInput } from './AmountInput'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  request: EntryRequest<Income> | null
  month: MonthKey
  onClose: () => void
}

export function IncomeSheet({ request, month, onClose }: Props) {
  const members = useMembers()
  const amountRef = useRef<HTMLInputElement>(null)
  const title = request?.mode === 'edit' ? sr.income.editTitle : sr.income.addTitle

  return (
    <BottomSheet
      open={request !== null}
      title={title}
      onClose={onClose}
      initialFocusRef={request?.mode === 'add' ? amountRef : undefined}
    >
      {request && (
        <IncomeForm
          key={request.mode === 'edit' ? request.entry.id : 'add'}
          editing={request.mode === 'edit' ? request.entry : null}
          month={month}
          members={members.data ?? []}
          amountRef={amountRef}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}

const errorText: Record<EntryFormError, string> = {
  amount: sr.entryForm.errorAmount,
  source: sr.income.errorSource,
  date: sr.entryForm.errorDate,
}

type FormProps = {
  editing: Income | null
  month: MonthKey
  members: HouseholdMember[]
  amountRef: RefObject<HTMLInputElement>
  onDone: () => void
}

function IncomeForm({ editing, month, members, amountRef, onDone }: FormProps) {
  const userId = useSession().user.id
  const [state, setState] = useState<IncomeFormState>(() =>
    editing ? incomeToForm(editing) : newIncomeForm(defaultDateFor(month), userId),
  )
  const [showErrors, setShowErrors] = useState(false)
  const save = useSaveIncome()
  const deleteIncome = useDeleteIncome()

  const result = validateIncomeForm(state)
  const errors = new Set(showErrors && !result.ok ? result.errors : [])
  const errorFor = (field: EntryFormError) => (errors.has(field) ? errorText[field] : undefined)
  const set = (patch: Partial<IncomeFormState>) => setState((prev) => ({ ...prev, ...patch }))

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
    deleteIncome(editing)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <AmountInput
        inputRef={amountRef}
        value={state.amountText}
        onChange={(amountText) => set({ amountText })}
        error={errorFor('amount')}
      />

      <div className="flex flex-col gap-2">
        <TextField
          label={sr.income.source}
          placeholder={sr.income.sourcePlaceholder}
          maxLength={100}
          value={state.source}
          onChange={(event) => set({ source: event.target.value })}
          error={errorFor('source')}
        />
        <div className="flex flex-wrap gap-2">
          {sr.income.sourcePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={state.source === preset}
              onClick={() => set({ source: preset })}
              className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:bg-surface-muted aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={sr.entryForm.date}
          type="date"
          required
          value={state.date}
          onChange={(event) => set({ date: event.target.value })}
          error={errorFor('date')}
        />
        {members.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{sr.income.receivedBy}</span>
            <SegmentedControl
              value={state.receivedBy ?? ''}
              options={members.map((member) => ({ value: member.user_id, label: member.display_name }))}
              onChange={(receivedBy) => set({ receivedBy })}
            />
          </div>
        )}
      </div>

      <TextField
        label={sr.entryForm.note}
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
