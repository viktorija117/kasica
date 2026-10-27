import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function TextField({ label, hint, className = '', ...props }: Props) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className="h-12 rounded-2xl border border-border bg-surface px-4 text-base outline-none transition placeholder:text-text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/25"
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
