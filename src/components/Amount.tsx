import { useFitText } from '../hooks/useFitText'
import { sr } from '../i18n/sr'
import { formatAmount } from '../lib/money'

/**
 * Largest font size of each size in rem, and the size of the currency next to the number as a
 * fraction of it (small amounts keep a bigger currency so it stays readable).
 */
const sizes = {
  sm: { rem: 1, currency: 0.7 },
  md: { rem: 1.25, currency: 0.6 },
  lg: { rem: 1.875, currency: 0.55 },
  xl: { rem: 3, currency: 0.55 },
} as const

/**
 * Rough width of an amount in em: digits and the minus sign are tabular, separators narrow,
 * the currency small. Slightly generous so the text always fits.
 */
function widthInEm(number: string, currencyScale: number): number {
  const wide = number.replace(/[.,]/g, '').length
  const separators = number.length - wide
  return wide * 0.66 + separators * 0.37 + (sr.currency.length * 0.8 + 0.3) * currencyScale
}

type Props = {
  value: number
  size?: keyof typeof sizes
  className?: string
}

/**
 * A money value on its own line that shrinks to fit the width of the nearest `@container`
 * (a card or tile), so long amounts never spill out of it on a narrow phone.
 */
export function Amount({ value, size = 'md', className = '' }: Props) {
  const number = formatAmount(value)
  const { rem, currency } = sizes[size]
  // The estimate sizes it before paint; the measurement then fixes what the estimate missed.
  const fontSize = `min(${rem}rem, calc(100cqi / ${widthInEm(number, currency).toFixed(2)}))`
  const ref = useFitText<HTMLSpanElement>(fontSize)

  return (
    <span ref={ref} className={`amount block whitespace-nowrap ${className}`} style={{ fontSize }}>
      {number}
      {/* Same text as `formatRSD`, so the amount reads and copies as "1.234 RSD". */}
      <span className="font-semibold opacity-70" style={{ fontSize: `${currency}em` }}>
        {`\u00a0${sr.currency}`}
      </span>
    </span>
  )
}
