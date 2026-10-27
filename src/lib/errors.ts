import { sr } from '../i18n/sr'

type ErrorLike = { code?: unknown; message?: unknown; name?: unknown }

// Supabase Auth error codes (https://supabase.com/docs/guides/auth/debugging/error-codes).
const authCodes: Record<string, string> = {
  invalid_credentials: sr.errors.invalidCredentials,
  user_already_exists: sr.errors.userExists,
  email_exists: sr.errors.userExists,
  weak_password: sr.errors.weakPassword,
  email_address_invalid: sr.errors.invalidEmail,
  validation_failed: sr.errors.invalidEmail,
  email_not_confirmed: sr.errors.emailNotConfirmed,
  over_request_rate_limit: sr.errors.rateLimited,
  over_email_send_rate_limit: sr.errors.rateLimited,
}

// Messages raised by our own database functions (see the init migration).
const databaseMessages: Record<string, string> = {
  not_authenticated: sr.errors.notAuthenticated,
  already_member: sr.errors.alreadyMember,
  invalid_invite_code: sr.errors.invalidInviteCode,
  invalid_household_name: sr.errors.invalidHouseholdName,
  invalid_display_name: sr.errors.invalidDisplayName,
}

/** Turns any error from Supabase or the network into a Serbian sentence for the user. */
export function errorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return sr.errors.generic
  const { code, message, name } = error as ErrorLike

  if (typeof code === 'string' && code in authCodes) return authCodes[code]
  if (typeof message === 'string') {
    if (message in databaseMessages) return databaseMessages[message]
    if (name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(message)) {
      return sr.errors.network
    }
  }
  return sr.errors.generic
}
