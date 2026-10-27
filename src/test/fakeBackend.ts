// In-memory stand-ins for the src/data modules, so tests never talk to Supabase.
// Usage in a test file:
//   vi.mock('../data/auth', async () => (await import('../test/fakeBackend')).fakeAuth)
// It must not import any app module, or the mock factories would import themselves.
import type { Session } from '../data/auth'
import type { Category } from '../data/categories'
import type { Household, HouseholdMember } from '../data/households'

export const VALID_INVITE_CODE = 'K7M2QX9P'
const HOUSEHOLD_ID = 'hh-1'

type Listener = (session: Session | null) => void

const state = {
  session: null as Session | null,
  household: null as Household | null,
  members: [] as HouseholdMember[],
  categories: [] as Category[],
  listeners: new Set<Listener>(),
}

function makeSession(userId: string, email: string): Session {
  return { user: { id: userId, email } } as unknown as Session
}

function setSession(session: Session | null) {
  state.session = session
  state.listeners.forEach((listener) => listener(session))
}

function makeHousehold(name: string): Household {
  return {
    id: HOUSEHOLD_ID,
    name,
    invite_code: VALID_INVITE_CODE,
    created_at: '2026-10-27T10:00:00Z',
  }
}

function makeMember(userId: string, displayName: string): HouseholdMember {
  return {
    household_id: HOUSEHOLD_ID,
    user_id: userId,
    display_name: displayName,
    joined_at: '2026-10-27T10:00:00Z',
  }
}

function makeCategory(sort: number, name: string, emoji: string): Category {
  return {
    id: `cat-${sort}`,
    household_id: HOUSEHOLD_ID,
    name,
    emoji,
    color: '#43a047',
    sort,
    monthly_limit: null,
    default_necessity: 'needed',
    archived: false,
    created_at: '2026-10-27T10:00:00Z',
  }
}

function databaseError(message: string) {
  return Object.assign(new Error(message), { code: 'P0001' })
}

export const fakeAuth = {
  onSessionChange: vi.fn((listener: Listener) => {
    state.listeners.add(listener)
    listener(state.session)
    return () => {
      state.listeners.delete(listener)
    }
  }),
  signIn: vi.fn(async (email: string, password: string) => {
    if (password !== 'tajna123') {
      throw Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' })
    }
    setSession(makeSession('user-me', email))
  }),
  signUp: vi.fn(async (email: string) => {
    setSession(makeSession('user-me', email))
    return { needsConfirmation: false }
  }),
  signOut: vi.fn(async () => setSession(null)),
}

export const fakeHouseholds = {
  fetchMyHousehold: vi.fn(async () => state.household),
  fetchMembers: vi.fn(async () => state.members),
  createHousehold: vi.fn(async (name: string, displayName: string) => {
    state.household = makeHousehold(name)
    state.members = [makeMember(state.session!.user.id, displayName)]
    state.categories = [makeCategory(1, 'Hrana', '🛒'), makeCategory(2, 'Računi', '🧾')]
    return HOUSEHOLD_ID
  }),
  joinHousehold: vi.fn(async (code: string, displayName: string) => {
    if (code !== VALID_INVITE_CODE) throw databaseError('invalid_invite_code')
    state.household = makeHousehold('Naša kuća')
    state.members = [makeMember('user-partner', 'Viki'), makeMember(state.session!.user.id, displayName)]
    return HOUSEHOLD_ID
  }),
}

export const fakeCategories = {
  fetchCategories: vi.fn(async () => state.categories),
}

/** Resets the fake backend. `signedIn` and `withHousehold` set up the starting point. */
export function resetBackend({ signedIn = false, withHousehold = false } = {}) {
  state.listeners.clear()
  state.session = signedIn ? makeSession('user-me', 'ja@example.com') : null
  state.household = null
  state.members = []
  state.categories = []
  if (withHousehold) {
    state.household = makeHousehold('Naša kuća')
    state.members = [makeMember('user-me', 'Ja'), makeMember('user-partner', 'Partner')]
    state.categories = [makeCategory(1, 'Hrana', '🛒'), makeCategory(2, 'Računi', '🧾')]
  }
}
