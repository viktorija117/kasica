import { formatPercent, formatRSD } from '../lib/money'

export type SplitPart = {
  key: string
  label: string
  amount: number
  /** 0–1 */
  share: number
  color: string
}

type Props = {
  title: string
  parts: SplitPart[]
}

/** A whole divided into parts: one stacked bar and a row per part. */
export function SplitCard({ title, parts }: Props) {
  const visible = parts.filter((part) => part.share > 0)
  return (
    <section aria-label={title} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{title}</h2>
      <div aria-hidden="true" className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-muted">
        {visible.map((part) => (
          <div key={part.key} className="h-full" style={{ width: `${part.share * 100}%`, backgroundColor: part.color }} />
        ))}
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {parts.map((part) => (
          <div key={part.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: part.color }} />
            <dt className="min-w-0 flex-1 truncate">{part.label}</dt>
            <dd className="text-right">
              <span className="amount">{formatRSD(part.amount)}</span>
              <span className="ml-2 inline-block w-10 text-xs text-text-muted">{formatPercent(part.share)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
