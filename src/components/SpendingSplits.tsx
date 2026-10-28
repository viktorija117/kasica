import type { HouseholdMember } from '../data/households'
import { useMembers } from '../hooks/useHousehold'
import { sr } from '../i18n/sr'
import type { NecessitySplit, PayerTotal } from '../lib/budget'
import { SplitCard, type SplitPart } from './SplitCard'

type Props = {
  necessity: NecessitySplit
  payers: PayerTotal[]
}

/** Colours of payers in order; expenses without a payer are always grey. */
const PAYER_COLORS = ['var(--primary)', 'var(--accent)', 'var(--warning)']
const NO_PAYER_COLOR = 'var(--text-muted)'

function payerParts(payers: PayerTotal[], members: HouseholdMember[]): SplitPart[] {
  const names = new Map(members.map((member) => [member.user_id, member.display_name]))
  return payers.map((payer, index) => ({
    key: payer.payerId ?? 'none',
    label:
      payer.payerId === null ? sr.expenses.nobody : (names.get(payer.payerId) ?? sr.home.formerMember),
    amount: payer.total,
    share: payer.share,
    color: payer.payerId === null ? NO_PAYER_COLOR : PAYER_COLORS[index % PAYER_COLORS.length],
  }))
}

/** "Potrebno i bespotrebno" and "Ko je koliko platio". */
export function SpendingSplits({ necessity, payers }: Props) {
  const members = useMembers().data ?? []
  const necessityParts: SplitPart[] = [
    { key: 'needed', label: sr.necessity.needed, amount: necessity.needed, share: necessity.neededShare, color: 'var(--primary)' },
    {
      key: 'unneeded',
      label: sr.necessity.unneeded,
      amount: necessity.unneeded,
      share: necessity.unneededShare,
      color: 'var(--warning)',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SplitCard title={sr.home.necessityTitle} parts={necessityParts} />
      <SplitCard title={sr.home.payersTitle} parts={payerParts(payers, members)} />
    </div>
  )
}
