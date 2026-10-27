// All money math of the app. Pure functions only; components never sum money themselves.
//
// Amounts have at most 2 decimals, so sums are done in whole para (1/100 RSD) to avoid
// floating point drift such as 0.1 + 0.2 = 0.30000000000000004.

type HasAmount = { amount: number }
type Dated = HasAmount & { date: string }

function toPara(amount: number): number {
  return Math.round(amount * 100)
}

function fromPara(para: number): number {
  return para / 100
}

/** Exact sum of amounts. */
export function sumAmounts(items: readonly HasAmount[]): number {
  return fromPara(items.reduce((total, item) => total + toPara(item.amount), 0))
}

export type DayGroup<T> = {
  date: string
  total: number
  items: T[]
}

/**
 * Groups rows by their `date`, newest day first, with the sum of each day.
 * Rows keep their input order inside a day.
 */
export function groupByDay<T extends Dated>(items: readonly T[]): DayGroup<T>[] {
  const byDate = new Map<string, T[]>()
  for (const item of items) {
    const day = byDate.get(item.date)
    if (day) day.push(item)
    else byDate.set(item.date, [item])
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, dayItems]) => ({ date, total: sumAmounts(dayItems), items: dayItems }))
}
