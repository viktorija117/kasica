import { useId } from 'react'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** Label only for screen readers, for a switch inside a list row. */
  hideLabel?: boolean
}

/** On/off toggle with its label; the whole row is tappable. */
export function Switch({ label, checked, onChange, hideLabel = false }: Props) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm'}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 shrink-0 rounded-full bg-border transition aria-checked:bg-primary"
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 left-1 size-5 rounded-full bg-surface shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}
