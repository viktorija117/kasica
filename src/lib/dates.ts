import { addDays, addMonths, endOfMonth, format, isValid, parse } from 'date-fns'
import { srLatn } from 'date-fns/locale'
import { sr } from '../i18n/sr'

/** First day of a month as `YYYY-MM-01`, in the user's local calendar. */
export type MonthKey = string

/** A calendar day as `YYYY-MM-DD`, in the user's local calendar (never derived from UTC). */
export type DateKey = string

const MONTH_KEY_FORMAT = 'yyyy-MM-01'
const MONTH_PARAM_FORMAT = 'yyyy-MM'
const DATE_KEY_FORMAT = 'yyyy-MM-dd'

export function toDateKey(date: Date): DateKey {
  return format(date, DATE_KEY_FORMAT)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

/** Local-time Date for a `YYYY-MM-DD` key. */
export function dateKeyToDate(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** The month a day belongs to: `2026-10-27` → `2026-10-01`. */
export function monthOfDate(key: DateKey): MonthKey {
  return `${key.slice(0, 7)}-01`
}

/** Last day of the month as a date key: `2026-02-01` → `2026-02-28`. */
export function endOfMonthKey(key: MonthKey): DateKey {
  return toDateKey(endOfMonth(monthKeyToDate(key)))
}

/**
 * Heading for a day in the expense list: `Danas`, `Juče`, otherwise
 * `Ponedeljak, 26. oktobar` (with the year only when it is not the current one).
 */
export function dayLabel(key: DateKey, now: Date = new Date()): string {
  if (key === toDateKey(now)) return sr.day.today
  if (key === toDateKey(addDays(now, -1))) return sr.day.yesterday
  const date = dateKeyToDate(key)
  const pattern = date.getFullYear() === now.getFullYear() ? 'EEEE, d. MMMM' : 'EEEE, d. MMMM yyyy.'
  const text = format(date, pattern, { locale: srLatn })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function toMonthKey(date: Date): MonthKey {
  return format(date, MONTH_KEY_FORMAT)
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return toMonthKey(now)
}

/** Local-time Date for the first day of the month (never parsed as UTC). */
export function monthKeyToDate(key: MonthKey): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function shiftMonth(key: MonthKey, months: number): MonthKey {
  return toMonthKey(addMonths(monthKeyToDate(key), months))
}

/** `Oktobar 2026` */
export function monthLabel(key: MonthKey): string {
  const date = monthKeyToDate(key)
  return `${sr.month.names[date.getMonth()]} ${date.getFullYear()}`
}

/** Month as it appears in the URL: `2026-10`. */
export function monthKeyToParam(key: MonthKey): string {
  return format(monthKeyToDate(key), MONTH_PARAM_FORMAT)
}

/** Parses `2026-10` from the URL; returns `null` for anything else. */
export function monthKeyFromParam(param: string | null): MonthKey | null {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null
  const date = parse(param, MONTH_PARAM_FORMAT, new Date())
  return isValid(date) ? toMonthKey(date) : null
}
