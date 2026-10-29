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

/** Money rounded to whole para, for results of a division or numbers read from a file. */
export function roundMoney(amount: number): number {
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

export type MonthCount = { month: MonthKey; count: number; total: number }

/** Number and sum of entries per month, oldest month first; months without entries are left out. */
export function sumByMonth(items: readonly Dated[]): MonthCount[] {
  const byMonth = new Map<MonthKey, { count: number; para: number }>()
  for (const item of items) {
    const month = monthOfDate(item.date)
    const current = byMonth.get(month) ?? { count: 0, para: 0 }
    byMonth.set(month, { count: current.count + 1, para: current.para + toPara(item.amount) })
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, { count, para }]) => ({ month, count, total: fromPara(para) }))
}

/** True when two amounts are the same to the para (ignores floating point noise). */
export function sameAmount(a: number, b: number): boolean {
  return toPara(a) === toPara(b)
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

// --- savings balance ---------------------------------------------------------------------

export type SavingsBalance = {
  /** In savings at the end of the month: the opening balance + every saving up to it. */
  total: number
  /** Saved in the month itself (negative when more was withdrawn). */
  month: number
}

/** How much is in savings by the end of `month`. Later months do not count. */
export function savingsBalance(
  opening: number,
  totals: readonly MonthTotals[],
  month: MonthKey,
): SavingsBalance {
  let total = toPara(opening)
  let inMonth = 0
  for (const row of totals) {
    if (row.month > month) continue
    total += toPara(row.saved)
    if (row.month === month) inMonth += toPara(row.saved)
  }
  return { total: fromPara(total), month: fromPara(inMonth) }
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

// --- spending breakdowns -----------------------------------------------------------------

/** From this part of a monthly limit on, the category shows a warning. */
export const LIMIT_WARNING_AT = 0.8

/** `none` without a limit; `warning` from 80% of the limit; `over` above 100%. */
export type LimitStatus = 'none' | 'ok' | 'warning' | 'over'

export function limitStatus(spent: number, limit: number | null): LimitStatus {
  if (limit === null || limit <= 0) return 'none'
  const used = toPara(spent) / toPara(limit)
  return used > 1 ? 'over' : used >= LIMIT_WARNING_AT ? 'warning' : 'ok'
}

type LimitedCategory = { id: string; monthly_limit: number | null; archived: boolean }

export type CategorySpending<C> = CategoryTotal & {
  /** Undefined when the expense points at a category that is not in the list. */
  category: C | undefined
  limit: number | null
  /** total / limit (above 1 when over), null without a limit. */
  limitUsed: number | null
  status: LimitStatus
}

/**
 * Spending per category for the Home screen, biggest first. Every expense is counted once,
 * so the totals always add up to "Potrošeno" (archived categories included). Active
 * categories with a limit but no spending yet follow at the end, so their limit is visible.
 */
export function categoryBreakdown<C extends LimitedCategory>(
  expenses: readonly (HasAmount & { category_id: string })[],
  categories: readonly C[],
): CategorySpending<C>[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const withLimit = (categoryId: string, total: number, share: number): CategorySpending<C> => {
    const category = byId.get(categoryId)
    const limit = category?.monthly_limit ?? null
    return {
      categoryId,
      total,
      share,
      category,
      limit,
      limitUsed: limit === null ? null : ratio(toPara(total), toPara(limit)),
      status: limitStatus(total, limit),
    }
  }

  const spent = sumByCategory(expenses).map((row) => withLimit(row.categoryId, row.total, row.share))
  const seen = new Set(spent.map((row) => row.categoryId))
  const unspent = categories
    .filter((category) => !category.archived && category.monthly_limit !== null && !seen.has(category.id))
    .map((category) => withLimit(category.id, 0, 0))
  return [...spent, ...unspent]
}

/** The category with the most spending, or null when nothing was spent. */
export function topCategory<T extends CategoryTotal>(breakdown: readonly T[]): T | null {
  const top = breakdown[0]
  return top && top.total > 0 ? top : null
}

export type NecessitySplit = {
  needed: number
  unneeded: number
  /** Parts of all spending, 0–1. */
  neededShare: number
  unneededShare: number
}

/** "Potrebno" against "Bespotrebno". */
export function splitByNecessity(expenses: readonly SpendingRow[]): NecessitySplit {
  let needed = 0
  let unneeded = 0
  for (const expense of expenses) {
    if (expense.necessity === 'unneeded') unneeded += toPara(expense.amount)
    else needed += toPara(expense.amount)
  }
  return {
    needed: fromPara(needed),
    unneeded: fromPara(unneeded),
    neededShare: ratio(needed, needed + unneeded),
    unneededShare: ratio(unneeded, needed + unneeded),
  }
}

export type PayerTotal = {
  /** null for expenses without `paid_by`. */
  payerId: string | null
  total: number
  share: number
}

/**
 * "Ko je koliko platio": every member in `memberIds` order (0 when they paid nothing), then
 * people who are no longer members, then expenses without a payer. Adds up to the sum of
 * the list.
 */
export function sumByPayer(
  expenses: readonly (HasAmount & { paid_by: string | null })[],
  memberIds: readonly string[],
): PayerTotal[] {
  const byPayer = new Map<string | null, number>(memberIds.map((id) => [id, 0]))
  let all = 0
  for (const expense of expenses) {
    const para = toPara(expense.amount)
    byPayer.set(expense.paid_by, (byPayer.get(expense.paid_by) ?? 0) + para)
    all += para
  }
  const rank = (id: string | null) => (id === null ? 2 : memberIds.includes(id) ? 0 : 1)
  return [...byPayer.entries()]
    .filter(([id, para]) => para > 0 || (id !== null && memberIds.includes(id)))
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([payerId, para]) => ({ payerId, total: fromPara(para), share: ratio(para, all) }))
}

// --- year overview -----------------------------------------------------------------------

/** Spending of one category in one month, as the `month_category_totals` view returns it. */
export type CategoryMonthTotals = {
  month: MonthKey
  category_id: string
  spent: number
  /** Part of `spent` marked unneeded. */
  unneeded: number
}

export type YearMonth = {
  month: MonthKey
  balance: MonthBalance
  /**
   * False for a month with nothing to show: no entries and nothing carried in, or a future
   * month without entries (its carry would only repeat today's balance).
   */
  shown: boolean
  /** Spending per category of this month, in the order of `YearOverview.categories`. */
  cells: YearCell[]
  top: CategoryTotal | null
}

export type YearCell = {
  categoryId: string
  total: number
  /** total / the biggest month of this category, 0–1; drives the colour of the cell. */
  intensity: number
}

export type YearCategory<C> = {
  categoryId: string
  /** Undefined when the expenses point at a category that is not in the list. */
  category: C | undefined
  total: number
  /** Part of the year's spending, 0–1. */
  share: number
}

export type YearOverview<C> = {
  year: number
  /** Always the 12 months, January first. */
  months: YearMonth[]
  /** At least one month is shown. */
  hasData: boolean
  /** Every category with spending in the year (archived ones too), in the categories' order. */
  categories: YearCategory<C>[]
  /** The "UKUPNO" row. */
  total: {
    /** What January carried in + the incomes of the year. */
    opening: number
    income: number
    spent: number
    saved: number
    /** "Preostalo" of the last shown month. */
    remaining: number
  }
  /** Average spending of the months that have expenses, null when none has. */
  avgMonthlySpent: number | null
  monthsWithSpending: number
  /** The month with the most spending, null when nothing was spent. */
  topMonth: { month: MonthKey; spent: number } | null
  topCategory: YearCategory<C> | null
  unneeded: number
  /** Unneeded part of the year's spending, 0–1. */
  unneededPct: number
}

/**
 * Everything the Year screen shows. Month balances come from the same carry chain as Home,
 * so every month agrees with Home for that month. `categoryTotals` must be summed from the
 * same expenses as `totals`, so each month's cells add up to its `spent`.
 */
export function yearOverview<C extends { id: string }>(input: {
  year: number
  totals: readonly MonthTotals[]
  settings: readonly CarrySetting[]
  categoryTotals: readonly CategoryMonthTotals[]
  categories: readonly C[]
  today: DateKey
}): YearOverview<C> {
  const { year, totals, settings, categories, today } = input
  const first: MonthKey = `${year}-01-01`
  const monthKeys = Array.from({ length: 12 }, (_, index) => shiftMonth(first, index))
  const rows = input.categoryTotals.filter((row) => monthKeys.includes(row.month))

  const chain = new Map(balanceChain(totals, settings, monthKeys[11]).map((b) => [b.month, b]))
  const balances = monthKeys.map((month) => chain.get(month) ?? balanceOf(month, undefined, undefined, null))

  // Category columns: every category with spending, in the household's order.
  const byCategory = new Map<string, number>()
  let spentPara = 0
  let unneededPara = 0
  for (const row of rows) {
    const para = toPara(row.spent)
    byCategory.set(row.category_id, (byCategory.get(row.category_id) ?? 0) + para)
    spentPara += para
    unneededPara += toPara(row.unneeded)
  }
  const position = new Map(categories.map((category, index) => [category.id, index]))
  const columns: YearCategory<C>[] = [...byCategory.entries()]
    .sort(
      ([a], [b]) =>
        (position.get(a) ?? Infinity) - (position.get(b) ?? Infinity) || a.localeCompare(b),
    )
    .map(([categoryId, para]) => ({
      categoryId,
      category: categories.find((category) => category.id === categoryId),
      total: fromPara(para),
      share: ratio(para, spentPara),
    }))

  const cellPara = (month: MonthKey, categoryId: string) =>
    rows
      .filter((row) => row.month === month && row.category_id === categoryId)
      .reduce((sum, row) => sum + toPara(row.spent), 0)
  const columnMax = new Map(
    columns.map(({ categoryId }) => [
      categoryId,
      Math.max(...monthKeys.map((month) => cellPara(month, categoryId))),
    ]),
  )

  const months: YearMonth[] = balances.map((balance) => {
    const cells = columns.map(({ categoryId }) => {
      const para = cellPara(balance.month, categoryId)
      return { categoryId, total: fromPara(para), intensity: ratio(para, columnMax.get(categoryId) ?? 0) }
    })
    const future = monthPhase(balance.month, today) === 'future'
    return {
      month: balance.month,
      balance,
      shown: balance.hasData || (!future && balance.carryIn !== 0),
      cells,
      top: topCategory(sumByCategory(rows.filter((row) => row.month === balance.month).map(asExpense))),
    }
  })

  const shown = months.filter((month) => month.shown)
  const withSpending = balances.filter((balance) => balance.spent !== 0)
  const sumOf = (field: 'income' | 'spent' | 'saved') =>
    fromPara(balances.reduce((sum, balance) => sum + toPara(balance[field]), 0))
  const income = sumOf('income')
  const topMonth = withSpending.reduce<MonthBalance | null>(
    (best, balance) => (best === null || balance.spent > best.spent ? balance : best),
    null,
  )
  const largest = [...columns].sort((a, b) => b.total - a.total)[0]

  return {
    year,
    months,
    hasData: shown.length > 0,
    categories: columns,
    total: {
      opening: fromPara(toPara(balances[0].carryIn) + toPara(income)),
      income,
      spent: sumOf('spent'),
      saved: sumOf('saved'),
      remaining: shown.length > 0 ? shown[shown.length - 1].balance.remaining : 0,
    },
    avgMonthlySpent:
      withSpending.length > 0 ? roundMoney(sumOf('spent') / withSpending.length) : null,
    monthsWithSpending: withSpending.length,
    topMonth: topMonth && topMonth.spent > 0 ? { month: topMonth.month, spent: topMonth.spent } : null,
    topCategory: largest && largest.total > 0 ? largest : null,
    unneeded: fromPara(unneededPara),
    unneededPct: ratio(unneededPara, spentPara),
  }
}

function asExpense(row: CategoryMonthTotals) {
  return { category_id: row.category_id, amount: row.spent }
}

export type YearChartPoint = { month: MonthKey; income: number; spent: number; saved: number }

/** Incomes, spending and savings of every month, for the Year chart. */
export function yearChartData(overview: YearOverview<unknown>): YearChartPoint[] {
  return overview.months.map(({ month, balance }) => ({
    month,
    income: balance.income,
    spent: balance.spent,
    saved: balance.saved,
  }))
}

// --- fiscal receipts ---------------------------------------------------------------------

/**
 * Folds discount lines (negative totals) of a receipt into the item they belong to: the item
 * right above them, or the first item below when the receipt starts with a discount.
 * The receipt's sum stays the same. Lines left at 0 or less are dropped, since an expense
 * needs an amount above zero.
 */
export function foldDiscounts<T extends { total: number }>(lines: readonly T[]): T[] {
  const folded: { line: T; para: number }[] = []
  let pending = 0
  for (const line of lines) {
    const para = toPara(line.total)
    if (para < 0 && folded.length > 0) folded[folded.length - 1].para += para
    else if (para < 0) pending += para
    else {
      folded.push({ line, para: para + pending })
      pending = 0
    }
  }
  return folded
    .filter(({ para }) => para > 0)
    .map(({ line, para }) => ({ ...line, total: fromPara(para) }))
}

export type ReceiptBalance = {
  /** Sum of the items that will be saved. */
  selected: number
  /** `selected - receipt total`; null when the receipt has no total. */
  difference: number | null
}

export function receiptBalance(items: readonly HasAmount[], receiptTotal: number | null): ReceiptBalance {
  const selected = sumAmounts(items)
  return {
    selected,
    difference: receiptTotal === null ? null : fromPara(toPara(selected) - toPara(receiptTotal)),
  }
}
