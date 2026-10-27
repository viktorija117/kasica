type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-surface-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="h-10 rounded-xl px-3 text-sm font-medium text-text-muted transition aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
