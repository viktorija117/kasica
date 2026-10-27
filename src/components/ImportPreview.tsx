import { sr } from '../i18n/sr'
import { monthLabel } from '../lib/dates'
import type { ImportPlan, MonthPreview } from '../lib/excelImport'
import { formatRSD } from '../lib/money'

type Props = {
  plan: ImportPlan
  transferCount: number
}

/** What the import will write, month by month, before anything is saved. */
export function ImportPreview({ plan, transferCount }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {plan.months.map((month) => (
        <section
          key={month.month}
          aria-label={monthLabel(month.month)}
          className="rounded-2xl bg-surface-muted p-3"
        >
          <h3 className="mb-1.5 font-semibold">{monthLabel(month.month)}</h3>
          <PreviewRows row={month} />
        </section>
      ))}
      <section aria-label={sr.import.total} className="rounded-2xl border border-border p-3">
        <h3 className="mb-1.5 font-semibold">{sr.import.total}</h3>
        <PreviewRows row={{ ...plan.total, carryIn: null }} />
      </section>
      {transferCount > 0 && <p className="text-xs text-text-muted">{sr.import.transfers(transferCount)}</p>}
    </div>
  )
}

function PreviewRows({ row }: { row: Omit<MonthPreview, 'month'> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {row.carryIn !== null && (
        <PreviewRow label={sr.import.carried} value={formatRSD(row.carryIn)} />
      )}
      <PreviewRow
        label={sr.import.incomes}
        value={`${formatRSD(row.income)} · ${sr.import.incomeCount(row.incomeCount)}`}
      />
      <PreviewRow
        label={sr.import.expenses}
        value={`${formatRSD(row.spent)} · ${sr.import.expenseCount(row.expenseCount)}`}
      />
      <PreviewRow label={sr.import.savings} value={formatRSD(row.saved)} />
    </dl>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="amount text-right">{value}</dd>
    </>
  )
}
