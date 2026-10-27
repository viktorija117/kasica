import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('maps Supabase Auth error codes', () => {
    expect(errorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Pogrešan email ili lozinka.',
    )
    expect(errorMessage({ code: 'user_already_exists', message: 'User already registered' })).toBe(
      'Nalog sa ovim emailom već postoji. Prijavi se.',
    )
    expect(errorMessage({ code: 'weak_password', message: '...' })).toBe(
      'Lozinka je preslaba. Koristi najmanje 6 znakova.',
    )
  })

  it('maps messages raised by database functions', () => {
    expect(errorMessage({ code: 'P0001', message: 'invalid_invite_code' })).toBe(
      'Kod nije ispravan. Proveri ga i pokušaj ponovo.',
    )
    expect(errorMessage({ code: 'P0001', message: 'already_member' })).toBe(
      'Već si član jednog domaćinstva.',
    )
  })

  it('recognises network failures', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(
      'Nema veze sa serverom. Proveri internet i pokušaj ponovo.',
    )
    expect(errorMessage({ name: 'AuthRetryableFetchError', message: '{}' })).toBe(
      'Nema veze sa serverom. Proveri internet i pokušaj ponovo.',
    )
  })

  it('falls back to a generic message', () => {
    expect(errorMessage(undefined)).toBe('Nešto nije u redu. Pokušaj ponovo.')
    expect(errorMessage('boom')).toBe('Nešto nije u redu. Pokušaj ponovo.')
    expect(errorMessage({ code: 'something_new', message: 'Unknown' })).toBe(
      'Nešto nije u redu. Pokušaj ponovo.',
    )
  })
})
