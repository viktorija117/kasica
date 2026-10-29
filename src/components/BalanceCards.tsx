import { useCallback, useState } from 'react'
import type { MonthSettingInput } from '../data/monthSettings'
import { useSaveMonthSetting } from '../hooks/useMonthSummary'
import { sr } from '../i18n/sr'
import type { MonthSummary } from '../lib/budget'
import { formatPercent, formatRSD } from '../lib/money'
import { Amount } from './Amount'
import { CarrySheet } from './CarrySheet'
import { ProgressBar } from './ProgressBar'
import { StatCard } from './StatCard'
import { Switch } from './Switch'

type Props = {
  summary: MonthSummary
  setting: MonthSettingInput
}

function allowanceText(summary: MonthSummary): string | null {
  if (summary.dailyAllowance === null || summary.daysLeft === null) return null
  if (summary.dailyAllowance <= 0) return sr.home.overspent
  return sr.home.allowance(formatRSD(summary.dailyAllowance), summary.daysLeft)
}

/** Preostalo, Početno stanje (with the carry controls), Potrošeno and Ušteđeno. */
export function BalanceCards({ summary, setting }: Props) {
  const [adjusting, setAdjusting] = useState(false)
  const closeAdjust = useCallback(() => setAdjusting(false), [])
  const saveSetting = useSaveMonthSetting()
  const allowance = allowanceText(summary)
  const used = sr.home.used(formatPercent(summary.usedPct))

  const toggleCarry = (carryEnabled: boolean) =>
    saveSetting.mutate({ month: summary.month, input: { ...setting, carry_enabled: carryEnabled } })

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={sr.home.remaining} className="@container rounded-3xl bg-primary p-6 text-on-primary shadow-sm">
        <h2 className="text-sm font-medium opacity-85">{sr.home.remaining}</h2>
        <Amount value={summary.remaining} size="xl" className="mt-1" />
        <ProgressBar value={summary.usedPct} label={used} className="mt-4" />
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
        <StatCard label={sr.home.spent} value={summary.spent} />
        <StatCard label={sr.home.saved} value={summary.saved} />
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
