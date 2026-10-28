import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { currentMonthKey, monthKeyToParam, type MonthKey } from '../lib/dates'
import { MONTH_PARAM } from './useSelectedMonth'

export const CATEGORY_PARAM = 'k'

/**
 * Category filter of the Expenses screen, kept in the URL (`?k=<id>`) so other screens can
 * link to an already filtered list.
 */
export function useCategoryFilter(): [string | null, (categoryId: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get(CATEGORY_PARAM)

  const setCategoryId = useCallback(
    (next: string | null) => {
      setSearchParams(
        (params) => {
          if (next) params.set(CATEGORY_PARAM, next)
          else params.delete(CATEGORY_PARAM)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [categoryId, setCategoryId]
}

/** Link to the Expenses screen of `month`, filtered by one category. */
export function expensesPath(month: MonthKey, categoryId: string): string {
  const params = new URLSearchParams({ [CATEGORY_PARAM]: categoryId })
  if (month !== currentMonthKey()) params.set(MONTH_PARAM, monthKeyToParam(month))
  return `/troskovi?${params}`
}
