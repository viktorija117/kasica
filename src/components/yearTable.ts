import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { YearCategory } from '../lib/budget'
import type { MonthKey } from '../lib/dates'

/** Table classes shared by the Year tables; the first column stays put while the rest scroll. */
export const yearTable = {
  wrap: '-mx-4 mt-3 overflow-x-auto px-4',
  table: 'w-full border-separate border-spacing-0 text-sm',
  head: 'whitespace-nowrap border-b border-border px-2 py-2 text-right text-xs font-medium text-text-muted',
  sticky: 'sticky left-0 z-10 bg-surface',
  cell: 'amount whitespace-nowrap border-b border-border px-2 py-2.5 text-right',
  totalRow: 'font-semibold',
} as const

/** `Mar` for `2026-03-01`. */
export function shortMonth(month: MonthKey): string {
  return sr.month.names[Number(month.slice(5, 7)) - 1].slice(0, 3)
}

export function fullMonth(month: MonthKey): string {
  return sr.month.names[Number(month.slice(5, 7)) - 1]
}

export function categoryLabel(column: YearCategory<Category> | undefined): string {
  const category = column?.category
  return category ? `${category.emoji} ${category.name}` : sr.year.unknownCategory
}

/** Colour of a category in the heatmap; grey when the category is unknown. */
export function categoryColor(column: YearCategory<Category>): string {
  return column.category?.color ?? 'var(--text-muted)'
}

/** Cell background: the category colour, stronger the closer the month is to its biggest. */
export function cellBackground(color: string, intensity: number): string | undefined {
  if (intensity <= 0) return undefined
  const pct = Math.round(12 + intensity * 58)
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}
