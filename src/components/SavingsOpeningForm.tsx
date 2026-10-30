import { useState, type FormEvent } from 'react'
import { useHousehold, useSaveSavingsOpening } from '../hooks/useHousehold'
import { sr } from '../i18n/sr'
import { parseCarryOverride } from '../lib/entryForms'
import { amountToText } from '../lib/money'
import { AmountInput } from './AmountInput'
import { Button } from './Button'

/** Settings → Štednja: what the household had saved before it started using the app. */
export function SavingsOpeningForm() {
  const current = useHousehold().savings_opening ?? 0
  const [text, setText] = useState(() => (current ? amountToText(current) : ''))
  const [showError, setShowError] = useState(false)
  const save = useSaveSavingsOpening()
  // 0 or more; an empty field means 0.
  const amount = text.trim() === '' ? 0 : parseCarryOverride(text)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (amount === null) {
      setShowError(true)
      return
    }
    setShowError(false)
    if (amount !== current) save.mutate(amount)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{sr.savingsOpening.hint}</p>
      <AmountInput
        label={sr.savingsOpening.label}
        value={text}
        onChange={setText}
        error={showError && amount === null ? sr.savingsOpening.errorAmount : undefined}
      />
      <Button type="submit" variant="secondary" disabled={amount === current}>
        {sr.savingsOpening.save}
      </Button>
    </form>
  )
}
