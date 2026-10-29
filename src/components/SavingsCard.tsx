import { Link } from 'react-router'
import { expensesMonthPath } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'
import type { MonthPhase, SavingsBalance } from '../lib/budget'
import type { MonthKey } from '../lib/dates'
import { formatRSD } from '../lib/money'
import { Amount } from './Amount'

type Props = {
  savings: SavingsBalance
  month: MonthKey
  phase: MonthPhase
}

function monthText(saved: number, current: boolean): string {
  if (saved > 0) return sr.home.savingsDeposit(formatRSD(saved), current)
  if (saved < 0) return sr.home.savingsWithdrawal(formatRSD(-saved), current)
  return sr.home.savingsNone(current)
}

/** How much is in savings now, and what the month added; a tap opens the month's savings. */
export function SavingsCard({ savings, month, phase }: Props) {
  const tone = savings.month > 0 ? 'text-primary font-medium' : 'text-text-muted'
  return (
    <section aria-label={sr.home.savings} className="min-w-0">
      <Link
        to={expensesMonthPath(month)}
        aria-label={sr.home.savingsOpen}
        className="@container block h-full rounded-3xl border border-border bg-surface p-4 transition hover:bg-surface-muted"
      >
        <h2 className="text-sm font-medium text-text-muted">{sr.home.savings}</h2>
        <Amount value={savings.total} size="md" className="mt-0.5" />
        <p className={`mt-1 text-xs ${tone}`}>{monthText(savings.month, phase === 'current')}</p>
      </Link>
    </section>
  )
}
