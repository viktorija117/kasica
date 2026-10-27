import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-muted',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
