import { useMemo, useReducer, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Category } from '../data/categories'
import type { ExpenseSuggestion } from '../data/expenses'
import type { HouseholdMember } from '../data/households'
import type { SavedReceipt } from '../data/receipts'
import { useSaveReceipt } from '../hooks/useReceipts'
import { MONTH_PARAM } from '../hooks/useSelectedMonth'
import { useToast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import { receiptBalance } from '../lib/budget'
import { dayLabel, monthKeyToParam, monthOfDate, todayKey } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { ParsedReceipt } from '../lib/receipt'
import {
  keptAmounts,
  markedCount,
  newReceiptReview,
  receiptReviewReducer,
  validateReceiptReview,
} from '../lib/receiptReview'
import { Button } from './Button'
import { CategorySelect } from './CategorySelect'
import { FormMessage } from './FormMessage'
import { ReceiptLineCard } from './ReceiptLineCard'
import { ReceiptTotals } from './ReceiptTotals'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  url: string
  receipt: ParsedReceipt
  saved: SavedReceipt | null
  categories: Category[]
  members: HouseholdMember[]
  suggestions: ExpenseSuggestion[]
  currentUserId: string
  onScanAgain: () => void
}

/** Store, date and payer of a scanned receipt, then every item to edit, merge or leave out. */
export function ReceiptReviewForm({
  url,
  receipt,
  saved,
  categories,
  members,
  suggestions,
  currentUserId,
  onScanAgain,
}: Props) {
  const active = useMemo(() => categories.filter((category) => !category.archived), [categories])
  const [state, dispatch] = useReducer(receiptReviewReducer, null, () =>
    newReceiptReview(receipt, {
      today: todayKey(),
      paidBy: currentUserId,
      suggestions,
      activeCategoryIds: new Set(active.map((category) => category.id)),
    }),
  )
  const [showErrors, setShowErrors] = useState(false)
  const saveReceipt = useSaveReceipt()
  const showToast = useToast()
  const navigate = useNavigate()

  const result = validateReceiptReview(state)
  const failed = showErrors && !result.ok ? result : null
  const balance = receiptBalance(keptAmounts(state), receipt.total)
  const kept = state.lines.filter((line) => !line.removed)
  const removed = state.lines.filter((line) => line.removed)
  const marked = markedCount(state)
  const memberOptions = members.map((member) => ({ value: member.user_id, label: member.display_name }))

  const onSave = () => {
    if (!result.ok) {
      setShowErrors(true)
      return
    }
    const { expenses } = result
    saveReceipt.mutate(
      { receipt: { url, store: state.store.trim(), date: state.date, total: receipt.total }, expenses },
      {
        onSuccess: () => {
          showToast({ message: sr.receipt.saved(expenses.length) })
          navigate(`/troskovi?${MONTH_PARAM}=${monthKeyToParam(monthOfDate(state.date))}`)
        },
        onError: (error) => {
          const message = errorMessage(error)
          showToast({ message: message === sr.errors.generic ? sr.receipt.saveFailed : message, tone: 'error' })
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {saved && (
        <FormMessage tone="error">
          {sr.receipt.alreadySaved(saved.store ?? receipt.store, saved.date ? dayLabel(saved.date) : '')}
        </FormMessage>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4">
        <TextField
          label={sr.receipt.store}
          value={state.store}
          maxLength={200}
          onChange={(event) => dispatch({ type: 'store', value: event.target.value })}
        />
        <TextField
          label={sr.receipt.date}
          type="date"
          required
          value={state.date}
          onChange={(event) => dispatch({ type: 'date', value: event.target.value })}
          error={failed?.date ? sr.receipt.errorDate : undefined}
        />
        {memberOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{sr.receipt.paidBy}</span>
            <SegmentedControl
              value={state.paidBy ?? ''}
              options={memberOptions}
              onChange={(value) => dispatch({ type: 'paidBy', value })}
            />
          </div>
        )}
        <CategorySelect
          label={sr.receipt.receiptCategory}
          hint={sr.receipt.receiptCategoryHint}
          categories={active}
          value={state.categoryId}
          onChange={(category) => dispatch({ type: 'receiptCategory', category })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
          {sr.receipt.itemsTitle(kept.length)}
        </h2>
        {state.lines.length === 0 && <p className="text-sm text-text-muted">{sr.receipt.noItems}</p>}
        <ul className="flex flex-col gap-3">
          {kept.map((line) => (
            <ReceiptLineCard
              key={line.key}
              line={line}
              categories={categories.filter((category) => !category.archived || category.id === line.categoryId)}
              errors={failed?.lines[line.key] ?? []}
              dispatch={dispatch}
            />
          ))}
        </ul>
        {marked >= 2 && (
          <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10">
            <Button className="w-full shadow-lg" onClick={() => dispatch({ type: 'mergeMarked' })}>
              {sr.receipt.merge(marked)}
            </Button>
          </div>
        )}
      </section>

      {removed.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
            {sr.receipt.removedTitle(removed.length)}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-3xl border border-border bg-surface">
            {removed.map((line) => (
              <li key={line.key} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="min-w-0 truncate text-text-muted line-through">{line.name}</span>
                <button
                  type="button"
                  aria-label={sr.receipt.restoreLabel(line.name)}
                  onClick={() => dispatch({ type: 'toggleRemoved', key: line.key })}
                  className="shrink-0 rounded-xl px-2 py-1 font-medium text-primary hover:bg-primary-soft"
                >
                  {sr.receipt.restore}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReceiptTotals balance={balance} receiptTotal={receipt.total} />

      {failed && (
        <FormMessage tone="error">{failed.empty ? sr.receipt.errorEmpty : sr.receipt.errorLines}</FormMessage>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={onSave} loading={saveReceipt.isPending} disabled={saved !== null || kept.length === 0}>
          {sr.receipt.saveAll(kept.length)}
        </Button>
        <Button variant="secondary" onClick={onScanAgain} disabled={saveReceipt.isPending}>
          {sr.receipt.scanAgain}
        </Button>
      </div>
    </div>
  )
}
