import { useCallback, useState } from 'react'
import type { MonthSettingInput } from '../data/monthSettings'
import { useSaveMonthSetting } from '../hooks/useMonthSummary'
import { sr } from '../i18n/sr'
import type { MonthSummary, SavingsBalance } from '../lib/budget'
import { formatPercent, formatRSD } from '../lib/money'
import { Amount } from './Amount'
import { CarrySheet } from './CarrySheet'
import { ProgressBar } from './ProgressBar'
import { SavingsCard } from './SavingsCard'
import { StatCard } from './StatCard'
import { Switch } from './Switch'

type Props = {
  summary: MonthSummary
  setting: MonthSettingInput
  savings: SavingsBalance
}

function allowanceText(summary: MonthSummary): string | null {
  if (summary.dailyAllowance === null || summary.daysLeft === null) return null
  if (summary.dailyAllowance <= 0) return sr.home.overspent
  return sr.home.allowance(formatRSD(summary.dailyAllowance), summary.daysLeft)
}

/** Preostalo, Početno stanje (with the carry controls), Potrošeno and Štednja. */
export function BalanceCards({ summary, setting, savings }: Props) {
  const [adjusting, setAdjusting] = useState(false)
  const closeAdjust = useCallback(() => setAdjusting(false), [])
  const saveSetting = useSaveMonthSetting()
  const allowance = allowanceText(summary)
  const used = sr.home.used(formatPercent(summary.usedPct))
  const overspent = summary.remaining < 0

  const toggleCarry = (carryEnabled: boolean) =>
    saveSetting.mutate({ month: summary.month, input: { ...setting, carry_enabled: carryEnabled } })

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label={sr.home.remaining}
        className={`@container rounded-3xl p-6 shadow-sm ${overspent ? 'bg-danger text-on-danger' : 'bg-primary text-on-primary'}`}
      >
        <h2 className="text-sm font-medium opacity-85">{sr.home.remaining}</h2>
        <Amount value={summary.remaining} size="xl" className="mt-1" />
        <ProgressBar value={summary.usedPct} label={used} keepColorWhenOver className="mt-4" />
        <p className="mt-1.5 text-sm opacity-85">{used}</p>
        {allowance && <p className="mt-3 text-sm font-medium">{allowance}</p>}
      </section>

      <StatCard
        label={sr.home.opening}
        value={summary.opening}
        detail={
          <>
            {sr.home.openingSplit(formatRSD(summary.carryIn), formatRSD(summary.income))}
            {summary.carryOverridden && ` · ${sr.carry.adjusted}`}
          </>
        }
      >
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          <Switch label={sr.carry.toggle} checked={summary.carryEnabled} onChange={toggleCarry} />
          <button
            type="button"
            onClick={() => setAdjusting(true)}
            className="self-start text-sm font-medium text-primary hover:underline"
          >
            {sr.carry.adjust}
          </button>
        </div>
      </StatCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={sr.home.spent} value={summary.spent} size="md" />
        <SavingsCard savings={savings} month={summary.month} phase={summary.phase} />
      </div>

      <CarrySheet
        open={adjusting}
        month={summary.month}
        balance={summary}
        setting={setting}
        onClose={closeAdjust}
      />
    </div>
  )
}
