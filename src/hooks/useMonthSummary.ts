import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  DEFAULT_MONTH_SETTING,
  fetchMonthSettings,
  saveMonthSetting,
  type MonthSetting,
  type MonthSettingInput,
} from '../data/monthSettings'
import { fetchMonthTotals } from '../data/monthTotals'
import { sr } from '../i18n/sr'
import {
  categoryBreakdown,
  compareWithPrevious,
  monthBalance,
  monthSummary,
  monthTotalsOf,
  splitByNecessity,
  sumByDay,
  sumByPayer,
  topCategory,
  withMonthTotals,
} from '../lib/budget'
import { shiftMonth, todayKey, type MonthKey } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useExpenses } from './useExpenses'
import { useCategories, useHousehold, useMembers } from './useHousehold'
import { useIncomes } from './useIncomes'
import { useSavings } from './useSavings'
import { useToast } from './useToast'

export function useMonthTotals() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.monthTotals(householdId),
    queryFn: () => fetchMonthTotals(householdId),
  })
}

export function useMonthSettings() {
  const householdId = useHousehold().id
  return useQuery({
    queryKey: queryKeys.monthSettings(householdId),
    queryFn: () => fetchMonthSettings(householdId),
  })
}

/** Saves a month's carry settings; the change shows at once and is undone if saving fails. */
export function useSaveMonthSetting() {
  const queryClient = useQueryClient()
  const householdId = useHousehold().id
  const showToast = useToast()
  const key = queryKeys.monthSettings(householdId)

  return useMutation({
    mutationFn: ({ month, input }: { month: MonthKey; input: MonthSettingInput }) =>
      saveMonthSetting(householdId, month, input),
    onMutate: async ({ month, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MonthSetting[]>(key)
      const row: MonthSetting = { household_id: householdId, month, ...input }
      queryClient.setQueryData<MonthSetting[]>(key, (list = []) => [
        ...list.filter((setting) => setting.month !== month),
        row,
      ])
      return { previous }
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      showToast({ message: sr.carry.saveFailed, tone: 'error' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

/**
 * Everything the Home screen shows for a month. The selected month is summed from its live
 * lists (which already include optimistic expenses) and earlier months from `month_totals`.
 */
export function useMonthSummary(month: MonthKey) {
  const totals = useMonthTotals()
  const settings = useMonthSettings()
  const categories = useCategories()
  const members = useMembers()
  const { expenses, error: expensesError } = useExpenses(month)
  const { expenses: previousExpenses, error: previousError } = useExpenses(shiftMonth(month, -1))
  const { incomes, error: incomesError } = useIncomes(month)
  const { savings, error: savingsError } = useSavings(month)

  const data = useMemo(() => {
    if (
      !totals.data ||
      !settings.data ||
      !categories.data ||
      !members.data ||
      !expenses ||
      !previousExpenses ||
      !incomes ||
      !savings
    ) {
      return undefined
    }
    const today = todayKey()
    const live = monthTotalsOf(month, { incomes, expenses, savings })
    const balance = monthBalance(withMonthTotals(totals.data, live), settings.data, month)
    const saved = settings.data.find((row) => row.month === month)
    const setting: MonthSettingInput = saved
      ? { carry_enabled: saved.carry_enabled, carry_override: saved.carry_override }
      : DEFAULT_MONTH_SETTING
    const byCategory = categoryBreakdown(expenses, categories.data)
    return {
      summary: monthSummary(balance, expenses, today),
      comparison: compareWithPrevious(month, expenses, previousExpenses, today),
      setting,
      spending: {
        byCategory,
        top: topCategory(byCategory),
        byDay: sumByDay(expenses, month),
        necessity: splitByNecessity(expenses),
        payers: sumByPayer(
          expenses,
          members.data.map((member) => member.user_id),
        ),
      },
    }
  }, [
    month,
    totals.data,
    settings.data,
    categories.data,
    members.data,
    expenses,
    previousExpenses,
    incomes,
    savings,
  ])

  const error =
    totals.error ??
    settings.error ??
    categories.error ??
    members.error ??
    expensesError ??
    previousError ??
    incomesError ??
    savingsError
  return { data, error }
}
