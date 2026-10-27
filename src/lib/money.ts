import { sr } from '../i18n/sr'

/** Largest amount a `numeric(12, 2)` column holds. */
export const MAX_AMOUNT = 9_999_999_999.99

const wholeFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat('sr-RS', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats a number in sr-RS style: `1.234`, `69,99`. Decimals only when non-zero. */
export function formatAmount(amount: number): string {
  // `|| 0` turns -0 into 0 so we never show "-0".
  const rounded = Math.round(amount * 100) / 100 || 0
  return Number.isInteger(rounded)
    ? wholeFormatter.format(rounded)
    : decimalFormatter.format(rounded)
}

const percentFormatter = new Intl.NumberFormat('sr-RS', { style: 'percent', maximumFractionDigits: 0 })

/** A 0–1 ratio as a whole percent: `0.234` → `23%`. */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio || 0)
}

/** `1.234 RSD` — uses a non-breaking space so the currency never wraps to a new line. */
export function formatRSD(amount: number): string {
  return `${formatAmount(amount)}\u00a0${sr.currency}`
}

function isValidGrouping(digits: string, separator: string): boolean {
  if (!digits.includes(separator)) return /^\d*$/.test(digits)
  const escaped = separator === '.' ? '\\.' : separator
  return new RegExp(`^\\d{1,3}(${escaped}\\d{3})+$`).test(digits)
}

/**
 * Reads an amount typed by a user. Accepts both Serbian and English styles:
 * `1.234,50`, `1,234.50`, `1234,5`, `1234.5`, `1234`, `1 234`, optional `RSD`.
 *
 * Rules:
 * - both `.` and `,` present: the last one is the decimal separator
 * - only `,` once: decimal separator
 * - only `.` once: thousands separator when followed by exactly 3 digits (`1.234`),
 *   otherwise decimal (`69.99`)
 * - the same separator more than once: thousands separator (`1.234.567`)
 *
 * Returns `null` for anything that is not a valid number or has more than 2 decimals.
 */
export function parseAmount(input: string): number | null {
  let text = input
    .replace(/rsd/i, '')
    .replace(/[\s\u00a0]/g, '')

  let sign = 1
  if (text.startsWith('-')) {
    sign = -1
    text = text.slice(1)
  }
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return null

  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')
  let decimalSeparator: '.' | ',' | null = null

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ','
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ','
    const parts = text.split(separator)
    if (parts.length === 2) {
      const [before, after] = parts
      const looksLikeThousands =
        separator === '.' && after.length === 3 && /^[1-9]\d{0,2}$/.test(before)
      decimalSeparator = looksLikeThousands ? null : separator
    }
  }

  let integerPart = text
  let fractionPart = ''
  if (decimalSeparator) {
    const index = text.lastIndexOf(decimalSeparator)
    integerPart = text.slice(0, index)
    fractionPart = text.slice(index + 1)
  }

  if (!/^\d{0,2}$/.test(fractionPart)) return null

  const otherSeparator = decimalSeparator === ',' ? '.' : ','
  const thousandsSeparator = decimalSeparator ? otherSeparator : text.includes('.') ? '.' : ','
  if (!isValidGrouping(integerPart, thousandsSeparator)) return null

  const digits = integerPart.split(thousandsSeparator).join('')
  if (digits === '' && fractionPart === '') return null

  const value = Number(`${digits || '0'}.${fractionPart || '0'}`)
  return Number.isFinite(value) ? sign * value || 0 : null
}

/** Amount as the user would type it back into a field: `1234.5` → `1234,5`. */
export function amountToText(amount: number): string {
  return String(Math.abs(amount)).replace('.', ',')
}
