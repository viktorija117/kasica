import { sr } from '../i18n/sr'
import type { ReceiptBalance } from '../lib/budget'
import { formatRSD } from '../lib/money'

type Props = {
  balance: ReceiptBalance
  receiptTotal: number | null
}

/** The sum of the items that will be saved next to the receipt's own total. */
export function ReceiptTotals({ balance, receiptTotal }: Props) {
  const { selected, difference } = balance
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-surface-muted p-4 text-sm">
      <dl className="flex flex-col gap-1">
        <div className="flex justify-between gap-2">
          <dt>{sr.receipt.selectedTotal}</dt>
          <dd className="font-semibold tabular-nums">{formatRSD(selected)}</dd>
        </div>
        {receiptTotal !== null && (
          <div className="flex justify-between gap-2 text-text-muted">
            <dt>{sr.receipt.receiptTotal}</dt>
            <dd className="tabular-nums">{formatRSD(receiptTotal)}</dd>
          </div>
        )}
      </dl>
      {difference !== null && (
        <p className={`mt-1 font-medium ${difference === 0 ? 'text-primary' : 'text-warning'}`}>
          {difference === 0 ? sr.receipt.matches : sr.receipt.difference(formatRSD(difference))}
        </p>
      )}
    </div>
  )
}
