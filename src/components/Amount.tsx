import { formatRSD } from '../lib/money'

const sizes = {
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
} as const

type Props = {
  value: number
  size?: keyof typeof sizes
  className?: string
}

export function Amount({ value, size = 'md', className = '' }: Props) {
  return <span className={`amount ${sizes[size]} ${className}`}>{formatRSD(value)}</span>
}
