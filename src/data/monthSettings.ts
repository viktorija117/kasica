import type { MonthKey } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type MonthSetting = Tables<'month_settings'>

/** The carry settings of a month. Months without a row use the defaults. */
export type MonthSettingInput = Pick<MonthSetting, 'carry_enabled' | 'carry_override'>

export const DEFAULT_MONTH_SETTING: MonthSettingInput = { carry_enabled: true, carry_override: null }

/** Every month's settings of the household; there is at most one small row per month. */
export async function fetchMonthSettings(householdId: string): Promise<MonthSetting[]> {
  const { data, error } = await supabase
    .from('month_settings')
    .select('*')
    .eq('household_id', householdId)
    .order('month')
  if (error) throw error
  return data
}

export async function saveMonthSetting(
  householdId: string,
  month: MonthKey,
  input: MonthSettingInput,
): Promise<MonthSetting> {
  const { data, error } = await supabase
    .from('month_settings')
    .upsert({ ...input, household_id: householdId, month }, { onConflict: 'household_id,month' })
    .select()
    .single()
  if (error) throw error
  return data
}
