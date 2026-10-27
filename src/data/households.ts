import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type Household = Tables<'households'>
export type HouseholdMember = Tables<'household_members'>

/** The signed-in user's household, or `null` before they create or join one. */
export async function fetchMyHousehold(userId: string): Promise<Household | null> {
  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (memberError) throw memberError
  if (!membership) return null

  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', membership.household_id)
    .single()
  if (error) throw error
  return data
}

export async function fetchMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .order('joined_at')
  if (error) throw error
  return data
}

export async function createHousehold(name: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_household', {
    p_name: name,
    p_display_name: displayName,
  })
  if (error) throw error
  return data
}

export async function joinHousehold(code: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_household', {
    p_code: code,
    p_display_name: displayName,
  })
  if (error) throw error
  return data
}
