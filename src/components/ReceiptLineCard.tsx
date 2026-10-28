import type { Dispatch } from 'react'
import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import { formatQuantity, formatRSD } from '../lib/money'
import type { ReceiptReviewAction, ReviewLine, ReviewLineError } from '../lib/receiptReview'
import { CategorySelect } from './CategorySelect'
import { SegmentedControl } from './SegmentedControl'
import { TextField } from './TextField'

type Props = {
  line: ReviewLine
  categories: Category[]
  errors: ReviewLineError[]
  dispatch: Dispatch<ReceiptReviewAction>
}

const necessityOptions = [
  { value: 'needed' as const, label: sr.necessity.needed },
  { value: 'unneeded' as const, label: sr.necessity.unneeded },
]

/** One receipt item on the review screen: name, amount, category, necessity, merge and remove. */
export function ReceiptLineCard({ line, categories, errors, dispatch }: Props) {
  const { key } = line
  const label = line.name || sr.expenses.noDescription

  return (
    <li
      role="group"
      aria-label={label}
      className={`flex flex-col gap-3 rounded-3xl border bg-surface p-4 ${
        line.marked ? 'border-primary ring-2 ring-primary/25' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={line.marked}
          onChange={() => dispatch({ type: 'toggleMarked', key })}
          aria-label={sr.receipt.mark(label)}
          className="mt-4 size-5 shrink-0 accent-primary"
        />
        <TextField
          label={sr.receipt.itemName}
          value={line.name}
          maxLength={200}
          onChange={(event) => dispatch({ type: 'lineName', key, value: event.target.value })}
          className="min-w-0 flex-1"
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
        {line.printed ? (
          <span>{sr.receipt.quantity(formatQuantity(line.printed.quantity), formatRSD(line.printed.unitPrice))}</span>
        ) : (
          <span className="flex items-center gap-2">
            {sr.receipt.merged(line.parts.length)}
            <button
              type="button"
              onClick={() => dispatch({ type: 'split', key })}
              className="font-medium text-primary hover:underline"
            >
              {sr.receipt.split}
            </button>
          </span>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: 'toggleRemoved', key })}
          aria-label={sr.receipt.removeLabel(label)}
          className="rounded-xl px-2 py-1 font-medium text-danger hover:bg-danger-soft"
        >
          {sr.receipt.remove}
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
        <TextField
          label={sr.receipt.itemAmount}
          inputMode="decimal"
          autoComplete="off"
          value={line.amountText}
          onChange={(event) => dispatch({ type: 'lineAmount', key, value: event.target.value })}
          error={errors.includes('amount') ? sr.receipt.errorAmount : undefined}
        />
        <CategorySelect
          label={sr.receipt.itemCategory}
          categories={categories}
          value={line.categoryId}
          onChange={(category) => dispatch({ type: 'lineCategory', key, category })}
          error={errors.includes('category') ? sr.receipt.errorCategory : undefined}
        />
      </div>

      <SegmentedControl
        value={line.necessity}
        options={necessityOptions}
        onChange={(value) => dispatch({ type: 'lineNecessity', key, value })}
      />
    </li>
  )
}
