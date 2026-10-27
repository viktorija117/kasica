import { useId, type Ref } from 'react'
import { sr } from '../i18n/sr'

type Props = {
  value: string
  onChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
  error?: string
  label?: string
}

/** Big amount field that opens the numeric keyboard and accepts both `,` and `.`. */
export function AmountInput({ value, onChange, inputRef, error, label = sr.expenseForm.amount }: Props) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text-muted">
        {label}
      </label>
      <div
        className={`flex items-baseline gap-2 rounded-2xl border bg-surface-muted px-4 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 ${
          error ? 'border-danger' : 'border-transparent'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={sr.expenseForm.amountPlaceholder}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.,\s]/g, ''))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="amount min-w-0 flex-1 bg-transparent text-4xl outline-none placeholder:text-text-muted/50"
        />
        <span className="text-lg font-semibold text-text-muted">{sr.currency}</span>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
