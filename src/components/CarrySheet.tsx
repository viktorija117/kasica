import { useRef, useState, type FormEvent, type RefObject } from 'react'
import type { MonthSettingInput } from '../data/monthSettings'
import { useSaveMonthSetting } from '../hooks/useMonthSummary'
import { sr } from '../i18n/sr'
import type { MonthBalance } from '../lib/budget'
import { monthLabel, type MonthKey } from '../lib/dates'
import { signedCarryOverride } from '../lib/entryForms'
import { amountToText, formatRSD } from '../lib/money'
import { AmountInput } from './AmountInput'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'

type Props = {
  open: boolean
  month: MonthKey
  balance: MonthBalance
  setting: MonthSettingInput
  onClose: () => void
}

const signOptions: { value: 'plus' | 'minus'; label: string }[] = [
  { value: 'plus', label: sr.carry.plus },
  { value: 'minus', label: sr.carry.minus },
]

/** "Uskladi stanje": the amount actually carried into the month, remembered as carry_override. */
export function CarrySheet({ open, month, balance, setting, onClose }: Props) {
  const amountRef = useRef<HTMLInputElement>(null)
  return (
    <BottomSheet open={open} title={sr.carry.title} onClose={onClose} initialFocusRef={amountRef}>
      {open && (
        <CarryForm month={month} balance={balance} setting={setting} amountRef={amountRef} onDone={onClose} />
      )}
    </BottomSheet>
  )
}

type FormProps = Omit<Props, 'open' | 'onClose'> & {
  amountRef: RefObject<HTMLInputElement>
  onDone: () => void
}

function CarryForm({ month, balance, setting, amountRef, onDone }: FormProps) {
  const [text, setText] = useState(() => (balance.carryOverridden ? amountToText(balance.carryIn) : ''))
  // Starts on the side the month is on now, so a month in the red does not need a tap.
  const [sign, setSign] = useState<'plus' | 'minus'>(() =>
    (balance.carryOverridden ? balance.carryIn : balance.autoCarry) < 0 ? 'minus' : 'plus',
  )
  const [showError, setShowError] = useState(false)
  const save = useSaveMonthSetting()
  const amount = signedCarryOverride(text, sign === 'minus')

  const write = (carryOverride: number | null) => {
    save.mutate({ month, input: { ...setting, carry_override: carryOverride } })
    onDone()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (amount === null) {
      setShowError(true)
      return
    }
    write(amount)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-text-muted">{sr.carry.intro(monthLabel(month))}</p>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">{sr.carry.sign}</span>
        <SegmentedControl value={sign} options={signOptions} onChange={setSign} />
      </div>
      <AmountInput
        inputRef={amountRef}
        label={sr.carry.amount}
        value={text}
        onChange={setText}
        error={showError && amount === null ? sr.carry.errorAmount : undefined}
      />
      <p className="text-sm">{sr.carry.automatic(formatRSD(balance.autoCarry))}</p>
      <div className={`grid gap-2 ${balance.carryOverridden ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {balance.carryOverridden && (
          <Button variant="secondary" className="px-2 text-sm" onClick={() => write(null)}>
            {sr.carry.reset}
          </Button>
        )}
        <Button type="submit">{sr.carry.save}</Button>
      </div>
    </form>
  )
}
