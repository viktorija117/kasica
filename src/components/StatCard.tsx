import type { ReactNode } from 'react'
import { Amount } from './Amount'

type Props = {
  label: string
  value: number
  /** Small line under the amount. */
  detail?: ReactNode
  children?: ReactNode
  className?: string
}

/** A labelled amount; the card is a named region so its numbers are easy to find. */
export function StatCard({ label, value, detail, children, className = '' }: Props) {
  return (
    <section aria-label={label} className={`rounded-3xl border border-border bg-surface p-4 ${className}`}>
      <h2 className="text-sm font-medium text-text-muted">{label}</h2>
      <Amount value={value} size="lg" className="mt-0.5 block" />
      {detail && <p className="mt-1 text-xs text-text-muted">{detail}</p>}
      {children}
    </section>
  )
}
