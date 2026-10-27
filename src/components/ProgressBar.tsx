type Props = {
  /** 0–1; anything above 1 shows as a full bar in the danger colour. Uses the text colour. */
  value: number
  label: string
  className?: string
}

export function ProgressBar({ value, label, className = '' }: Props) {
  const over = value > 1
  const width = `${Math.min(Math.max(value, 0), 1) * 100}%`
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={`h-2.5 overflow-hidden rounded-full bg-current/20 ${className}`}
    >
      <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-current'}`} style={{ width }} />
    </div>
  )
}
