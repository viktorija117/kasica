import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type { Session }

/** Calls back with the current session right away and on every change. */
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns `needsConfirmation` when the project requires email confirmation. */
export async function signUp(
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
