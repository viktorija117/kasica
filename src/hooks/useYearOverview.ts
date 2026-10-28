import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchMonthCategoryTotals } from '../data/monthCategoryTotals'
import { yearChartData, yearOverview } from '../lib/budget'
import { todayKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useCategories, useHousehold } from './useHousehold'
import { useMonthSettings, useMonthTotals } from './useMonthSummary'

function useMonthCategoryTotals(year: number) {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.monthCategoryTotals(householdId, year),
    queryFn: () => fetchMonthCategoryTotals(householdId, year),
  })
}

/** Everything the Year screen shows for `year`. */
export function useYearOverview(year: number) {
  const totals = useMonthTotals()
  const settings = useMonthSettings()
  const categories = useCategories()
  const categoryTotals = useMonthCategoryTotals(year)

  const data = useMemo(() => {
    if (!totals.data || !settings.data || !categories.data || !categoryTotals.data) return undefined
    const overview = yearOverview({
      year,
      totals: totals.data,
      settings: settings.data,
      categoryTotals: categoryTotals.data,
      categories: categories.data,
      today: todayKey(),
    })
    return { overview, chart: yearChartData(overview) }
  }, [year, totals.data, settings.data, categories.data, categoryTotals.data])

  const error = totals.error ?? settings.error ?? categories.error ?? categoryTotals.error
  return { data, error }
}
