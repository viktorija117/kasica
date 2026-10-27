// All money math of the app. Pure functions only; components never sum money themselves.
//
// Amounts have at most 2 decimals, so sums are done in whole para (1/100 RSD) to avoid
// floating point drift such as 0.1 + 0.2 = 0.30000000000000004.

import {
  dayOfMonth,
  daysInMonth,
  monthOfDate,
  shiftMonth,
  type DateKey,
  type MonthKey,
} from './dates'

type HasAmount = { amount: number }
type Dated = HasAmount & { date: string }
type SpendingRow = Dated & { necessity: 'needed' | 'unneeded' }

function toPara(amount: number): number {
  return Math.round(amount * 100)
}

function fromPara(para: number): number {
  return para / 100
}

/** Money rounded to whole para, for results of a division. */
function roundMoney(amount: number): number {
  return fromPara(Math.round(amount * 100)) || 0
}

/** `part / whole`, or 0 when there is nothing to divide by. */
function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole
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

// --- totals per category and per day -----------------------------------------------------

export type CategoryTotal = {
  categoryId: string
  total: number
  /** Part of all spending in the list, 0–1. */
  share: number
}

/** Spending per category, biggest first. The totals add up to the sum of the list. */
export function sumByCategory(
  expenses: readonly (HasAmount & { category_id: string })[],
): CategoryTotal[] {
  const byCategory = new Map<string, number>()
  let all = 0
  for (const expense of expenses) {
    const para = toPara(expense.amount)
    byCategory.set(expense.category_id, (byCategory.get(expense.category_id) ?? 0) + para)
    all += para
  }
  return [...byCategory.entries()]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([categoryId, para]) => ({ categoryId, total: fromPara(para), share: ratio(para, all) }))
}

export type DayTotal = { date: DateKey; total: number }

/** Spending on every day of the month, oldest first, with 0 for days without expenses. */
export function sumByDay(expenses: readonly Dated[], month: MonthKey): DayTotal[] {
  const prefix = month.slice(0, 8)
  const byDay = new Map<string, number>()
  for (const expense of expenses) {
    if (monthOfDate(expense.date) !== month) continue
    byDay.set(expense.date, (byDay.get(expense.date) ?? 0) + toPara(expense.amount))
  }
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const date = `${prefix}${String(index + 1).padStart(2, '0')}`
    return { date, total: fromPara(byDay.get(date) ?? 0) }
  })
}

// --- carry-over chain --------------------------------------------------------------------

/** Sums of one month, as the `month_totals` view returns them. */
export type MonthTotals = {
  month: MonthKey
  income: number
  spent: number
  saved: number
  /** How many incomes, expenses and savings rows there are in the month. */
  entries: number
}

/** A `month_settings` row. A month without one uses the defaults. */
export type CarrySetting = {
  month: MonthKey
  carry_enabled: boolean
  carry_override: number | null
}

export type MonthBalance = {
  month: MonthKey
  /** `remaining` of the previous month when it has data, else 0. What "automatic" would carry. */
  autoCarry: number
  /** Carried in from the previous month ("preneto"). */
  carryIn: number
  carryEnabled: boolean
  /** The carry was set by hand ("Uskladi stanje"). */
  carryOverridden: boolean
  income: number
  /** "Početno stanje" = carryIn + income */
  opening: number
  /** "Potrošeno" */
  spent: number
  /** "Ušteđeno", withdrawals are negative */
  saved: number
  /** "Preostalo" = opening − spent − saved */
  remaining: number
  /** The month has incomes, expenses, savings or a carry set by hand. */
  hasData: boolean
}

/** Sums the lists of one month into its totals. */
export function monthTotalsOf(
  month: MonthKey,
  lists: { incomes: readonly HasAmount[]; expenses: readonly HasAmount[]; savings: readonly HasAmount[] },
): MonthTotals {
  return {
    month,
    income: sumAmounts(lists.incomes),
    spent: sumAmounts(lists.expenses),
    saved: sumAmounts(lists.savings),
    entries: lists.incomes.length + lists.expenses.length + lists.savings.length,
  }
}

/** `totals` with the row of `replacement.month` swapped for `replacement`. */
export function withMonthTotals(totals: readonly MonthTotals[], replacement: MonthTotals): MonthTotals[] {
  return [...totals.filter((row) => row.month !== replacement.month), replacement]
}

function balanceOf(
  month: MonthKey,
  totals: MonthTotals | undefined,
  setting: CarrySetting | undefined,
  previous: MonthBalance | null,
): MonthBalance {
  const carryEnabled = setting?.carry_enabled ?? true
  const override = setting?.carry_override ?? null
  const autoCarry = previous?.hasData ? toPara(previous.remaining) : 0
  const carryIn = override !== null ? toPara(override) : carryEnabled ? autoCarry : 0
  const income = toPara(totals?.income ?? 0)
  const spent = toPara(totals?.spent ?? 0)
  const saved = toPara(totals?.saved ?? 0)
  const opening = carryIn + income

  return {
    month,
    autoCarry: fromPara(autoCarry),
    carryIn: fromPara(carryIn),
    carryEnabled,
    carryOverridden: override !== null,
    income: fromPara(income),
    opening: fromPara(opening),
    spent: fromPara(spent),
    saved: fromPara(saved),
    remaining: fromPara(opening - spent - saved),
    hasData: (totals?.entries ?? 0) > 0 || override !== null,
  }
}

/**
 * Balances of every month from the first one with data up to and including `until`, oldest
 * first. Each month carries in the `remaining` of the month before it, by the rules in
 * CLAUDE.md ("Month summary"):
 * - a carry set by hand (`carry_override`) always wins
 * - otherwise the previous month's `remaining`, when carry is enabled and that month has data
 * - otherwise 0
 * Months after `until` are ignored. With no data at all the result is just `until`, empty.
 */
export function balanceChain(
  totals: readonly MonthTotals[],
  settings: readonly CarrySetting[],
  until: MonthKey,
): MonthBalance[] {
  const totalsByMonth = new Map(totals.map((row) => [row.month, row]))
  const settingsByMonth = new Map(settings.map((row) => [row.month, row]))
  const starts = [
    ...totals.filter((row) => row.entries > 0).map((row) => row.month),
    ...settings.filter((row) => row.carry_override !== null).map((row) => row.month),
  ].filter((month) => month <= until)

  const chain: MonthBalance[] = []
  let previous: MonthBalance | null = null
  let month = starts.length > 0 ? starts.reduce((a, b) => (a < b ? a : b)) : until
  for (;;) {
    previous = balanceOf(month, totalsByMonth.get(month), settingsByMonth.get(month), previous)
    chain.push(previous)
    if (month >= until) return chain
    month = shiftMonth(month, 1)
  }
}

/** Balance of one month, with the carry worked out through all months before it. */
export function monthBalance(
  totals: readonly MonthTotals[],
  settings: readonly CarrySetting[],
  month: MonthKey,
): MonthBalance {
  const chain = balanceChain(totals, settings, month)
  return chain[chain.length - 1]
}

// --- month summary -----------------------------------------------------------------------

export type MonthPhase = 'past' | 'current' | 'future'

export function monthPhase(month: MonthKey, today: DateKey): MonthPhase {
  const current = monthOfDate(today)
  return month < current ? 'past' : month === current ? 'current' : 'future'
}

export type MonthSummary = MonthBalance & {
  phase: MonthPhase
  /** Spent part of the opening balance, 0–1 (more than 1 when overspent). */
  usedPct: number
  /** Spent per day so far (current month) or over the whole month (past months). */
  avgPerDay: number
  /** Current month only: what can still be spent each day, today included. */
  dailyAllowance: number | null
  /** Sum of the unneeded expenses. */
  unneeded: number
  /** Unneeded part of the spending, 0–1. */
  unneededPct: number
  /** Current month only. */
  spentToday: number | null
  /** Number of expenses. */
  purchases: number
  daysInMonth: number
  daysElapsed: number
  /** Current month only: days left including today. */
  daysLeft: number | null
}

/**
 * Everything the Home screen shows for a month. `balance` must be built from the same
 * `expenses` (see `monthTotalsOf`), so `spent` and the per-expense numbers agree.
 */
export function monthSummary(
  balance: MonthBalance,
  expenses: readonly SpendingRow[],
  today: DateKey,
): MonthSummary {
  const phase = monthPhase(balance.month, today)
  const days = daysInMonth(balance.month)
  const daysElapsed = phase === 'past' ? days : phase === 'current' ? dayOfMonth(today) : 0
  const daysLeft = phase === 'current' ? days - dayOfMonth(today) + 1 : null
  const unneeded = sumAmounts(expenses.filter((expense) => expense.necessity === 'unneeded'))

  return {
    ...balance,
    phase,
    usedPct: ratio(balance.spent, balance.opening),
    avgPerDay: roundMoney(ratio(balance.spent, daysElapsed)),
    dailyAllowance: daysLeft === null ? null : roundMoney(balance.remaining / daysLeft),
    unneeded,
    unneededPct: ratio(unneeded, balance.spent),
    spentToday:
      phase === 'current' ? sumAmounts(expenses.filter((expense) => expense.date === today)) : null,
    purchases: expenses.length,
    daysInMonth: days,
    daysElapsed,
    daysLeft,
  }
}

export type SpentComparison = {
  /** Spending of this month that is compared (up to today for the current month). */
  current: number
  /** Spending of the previous month over the same days. */
  previous: number
  /** current − previous: positive means more is spent than last month. */
  diff: number
  /** diff / previous, or null when the previous month spent nothing. */
  diffPct: number | null
  /** For the current month: only days 1–throughDay were compared. Null for whole months. */
  throughDay: number | null
}

/**
 * Spending compared with the previous month. For the current month only the same days are
 * compared (1–27 Oct against 1–27 Sep), otherwise an unfinished month would always look
 * cheaper. Past and future months are compared in full.
 */
export function compareWithPrevious(
  month: MonthKey,
  expenses: readonly Dated[],
  previousExpenses: readonly Dated[],
  today: DateKey,
): SpentComparison {
  const throughDay = monthPhase(month, today) === 'current' ? dayOfMonth(today) : null
  const lastDay = throughDay ?? 31
  const upToLastDay = (expense: Dated) => dayOfMonth(expense.date) <= lastDay
  const previousMonth = shiftMonth(month, -1)

  const current = toPara(
    sumAmounts(expenses.filter((e) => monthOfDate(e.date) === month && upToLastDay(e))),
  )
  const previous = toPara(
    sumAmounts(previousExpenses.filter((e) => monthOfDate(e.date) === previousMonth && upToLastDay(e))),
  )
  return {
    current: fromPara(current),
    previous: fromPara(previous),
    diff: fromPara(current - previous),
    diffPct: previous === 0 ? null : (current - previous) / previous,
    throughDay,
  }
}
