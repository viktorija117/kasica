type Props = {
  /** 0–1; anything above 1 shows as a full bar in the danger colour. */
  value: number
  label: string
  /** Colour of the bar (the track is a faint version of it). The text colour by default. */
  color?: string
  /** `warning` and `danger` override `color`. */
  tone?: 'normal' | 'warning' | 'danger'
  className?: string
}

const tones = { normal: '', warning: 'text-warning', danger: 'text-danger' }

export function ProgressBar({ value, label, color, tone = 'normal', className = '' }: Props) {
  const over = value > 1
  const width = `${Math.min(Math.max(value, 0), 1) * 100}%`
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      data-tone={tone}
      style={tone === 'normal' && color ? { color } : undefined}
      className={`h-2.5 overflow-hidden rounded-full bg-current/20 ${tones[tone]} ${className}`}
    >
      <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-current'}`} style={{ width }} />
    </div>
  )
}
