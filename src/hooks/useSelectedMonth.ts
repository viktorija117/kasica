import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { currentMonthKey, monthKeyFromParam, monthKeyToParam, type MonthKey } from '../lib/dates'

export const MONTH_PARAM = 'm'

/**
 * The month shown on Home and Expenses, kept in the URL (`?m=2026-10`) so it survives
 * reloads and stays the same when switching between those screens.
 * The current month has no param, which keeps everyday URLs clean.
 */
export function useSelectedMonth(): [MonthKey, (month: MonthKey) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const month = monthKeyFromParam(searchParams.get(MONTH_PARAM)) ?? currentMonthKey()

  const setMonth = useCallback(
    (next: MonthKey) => {
      setSearchParams(
        (params) => {
          if (next === currentMonthKey()) params.delete(MONTH_PARAM)
          else params.set(MONTH_PARAM, monthKeyToParam(next))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [month, setMonth]
}
