import { addMonths, format, isValid, parse } from 'date-fns'
import { sr } from '../i18n/sr'

/** First day of a month as `YYYY-MM-01`, in the user's local calendar. */
export type MonthKey = string

const MONTH_KEY_FORMAT = 'yyyy-MM-01'
const MONTH_PARAM_FORMAT = 'yyyy-MM'

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
