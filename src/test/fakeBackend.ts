// In-memory stand-ins for the src/data modules, so tests never talk to Supabase.
// Usage in a test file:
//   vi.mock('../data/auth', async () => (await import('../test/fakeBackend')).fakeAuth)
// It must not import any app module, or the mock factories would import themselves.
import type { Session } from '../data/auth'
import type { Category } from '../data/categories'
import type { Expense, ExpenseInput, ExpenseSuggestion } from '../data/expenses'
import type { Household, HouseholdMember } from '../data/households'
import type { Income, IncomeInput } from '../data/incomes'
import type { MonthSetting, MonthSettingInput } from '../data/monthSettings'
import type { MonthTotalsRow } from '../data/monthTotals'
import type { Saving, SavingInput } from '../data/savings'

export const VALID_INVITE_CODE = 'K7M2QX9P'
const HOUSEHOLD_ID = 'hh-1'

type Listener = (session: Session | null) => void

const state = {
  session: null as Session | null,
  household: null as Household | null,
  members: [] as HouseholdMember[],
  categories: [] as Category[],
  expenses: [] as Expense[],
  incomes: [] as Income[],
  savings: [] as Saving[],
  monthSettings: [] as MonthSetting[],
  nextId: 1,
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

function makeExpense(id: string, input: ExpenseInput, createdBy: string | null): Expense {
  const now = new Date().toISOString()
  return {
    id,
    household_id: HOUSEHOLD_ID,
    description: '',
    paid_by: null,
    note: null,
    recurring_id: null,
    import_batch: null,
    receipt_id: null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
    ...input,
  }
}

function newId(prefix: string): string {
  return `${prefix}-${state.nextId++}`
}

function makeIncome(input: IncomeInput): Income {
  return {
    id: newId('inc'),
    household_id: HOUSEHOLD_ID,
    received_by: null,
    note: null,
    import_batch: null,
    created_at: new Date().toISOString(),
    ...input,
  }
}

function makeSaving(input: SavingInput): Saving {
  return {
    id: newId('sav'),
    household_id: HOUSEHOLD_ID,
    note: null,
    import_batch: null,
    created_at: new Date().toISOString(),
    ...input,
  }
}

function inMonth<T extends { date: string; created_at: string }>(rows: T[], month: string): T[] {
  return rows
    .filter((row) => row.date.slice(0, 7) === month.slice(0, 7))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
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

export const fakeExpenses = {
  fetchExpenses: vi.fn(async (_householdId: string, month: string) =>
    state.expenses
      .filter((expense) => expense.date.slice(0, 7) === month.slice(0, 7))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
  ),
  createExpense: vi.fn(async (_householdId: string, id: string, input: ExpenseInput) => {
    const expense = makeExpense(id, input, state.session?.user.id ?? null)
    state.expenses.push(expense)
    return expense
  }),
  updateExpense: vi.fn(async (id: string, input: ExpenseInput) => {
    const index = state.expenses.findIndex((expense) => expense.id === id)
    state.expenses[index] = { ...state.expenses[index], ...input }
    return state.expenses[index]
  }),
  deleteExpense: vi.fn(async (id: string) => {
    state.expenses = state.expenses.filter((expense) => expense.id !== id)
  }),
  // Same rules as the expense_suggestions view: latest expense per description wins.
  fetchSuggestions: vi.fn(async () => {
    const byKey = new Map<string, ExpenseSuggestion>()
    const latestFirst = [...state.expenses].sort(
      (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
    )
    for (const expense of latestFirst) {
      if (!expense.description) continue
      const key = expense.description.toLowerCase()
      const known = byKey.get(key)
      if (known) known.uses += 1
      else
        byKey.set(key, {
          household_id: HOUSEHOLD_ID,
          description: expense.description,
          category_id: expense.category_id,
          necessity: expense.necessity,
          uses: 1,
          last_date: expense.date,
        })
    }
    return [...byKey.values()]
  }),
}

export const fakeIncomes = {
  fetchIncomes: vi.fn(async (_householdId: string, month: string) => inMonth(state.incomes, month)),
  createIncome: vi.fn(async (_householdId: string, input: IncomeInput) => {
    const income = makeIncome(input)
    state.incomes.push(income)
    return income
  }),
  updateIncome: vi.fn(async (id: string, input: IncomeInput) => {
    const index = state.incomes.findIndex((income) => income.id === id)
    state.incomes[index] = { ...state.incomes[index], ...input }
    return state.incomes[index]
  }),
  deleteIncome: vi.fn(async (id: string) => {
    state.incomes = state.incomes.filter((income) => income.id !== id)
  }),
}

export const fakeSavings = {
  fetchSavings: vi.fn(async (_householdId: string, month: string) => inMonth(state.savings, month)),
  createSaving: vi.fn(async (_householdId: string, input: SavingInput) => {
    const saving = makeSaving(input)
    state.savings.push(saving)
    return saving
  }),
  updateSaving: vi.fn(async (id: string, input: SavingInput) => {
    const index = state.savings.findIndex((saving) => saving.id === id)
    state.savings[index] = { ...state.savings[index], ...input }
    return state.savings[index]
  }),
  deleteSaving: vi.fn(async (id: string) => {
    state.savings = state.savings.filter((saving) => saving.id !== id)
  }),
}

export const fakeMonthSettings = {
  DEFAULT_MONTH_SETTING: { carry_enabled: true, carry_override: null } satisfies MonthSettingInput,
  fetchMonthSettings: vi.fn(async () => state.monthSettings.map((row) => ({ ...row }))),
  saveMonthSetting: vi.fn(async (_householdId: string, month: string, input: MonthSettingInput) => {
    const row: MonthSetting = { household_id: HOUSEHOLD_ID, month, ...input }
    state.monthSettings = [...state.monthSettings.filter((setting) => setting.month !== month), row]
    return row
  }),
}

// Same sums as the month_totals view.
export const fakeMonthTotals = {
  fetchMonthTotals: vi.fn(async () => {
    const byMonth = new Map<string, MonthTotalsRow>()
    const add = (date: string, field: 'income' | 'spent' | 'saved', amount: number) => {
      const month = `${date.slice(0, 7)}-01`
      const row = byMonth.get(month) ?? {
        household_id: HOUSEHOLD_ID,
        month,
        income: 0,
        spent: 0,
        saved: 0,
        entries: 0,
      }
      row[field] = Math.round((row[field] + amount) * 100) / 100
      row.entries += 1
      byMonth.set(month, row)
    }
    state.incomes.forEach((row) => add(row.date, 'income', row.amount))
    state.expenses.forEach((row) => add(row.date, 'spent', row.amount))
    state.savings.forEach((row) => add(row.date, 'saved', row.amount))
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  }),
}

export function seedIncome(input: Partial<IncomeInput> & Pick<IncomeInput, 'date' | 'amount'>) {
  const income = makeIncome({ source: 'Plata', received_by: 'user-me', ...input })
  state.incomes.push(income)
  return income
}

export function seedSaving(input: SavingInput) {
  const saving = makeSaving(input)
  state.savings.push(saving)
  return saving
}

/** Adds an existing expense, as if one of the members had saved it earlier. */
export function seedExpense(input: Partial<ExpenseInput> & Pick<ExpenseInput, 'date' | 'amount'>) {
  const expense = makeExpense(
    `exp-${state.expenses.length + 1}`,
    { category_id: 'cat-1', necessity: 'needed', paid_by: 'user-me', ...input },
    'user-me',
  )
  state.expenses.push(expense)
  return expense
}

/** Resets the fake backend. `signedIn` and `withHousehold` set up the starting point. */
export function resetBackend({ signedIn = false, withHousehold = false } = {}) {
  state.listeners.clear()
  state.session = signedIn ? makeSession('user-me', 'ja@example.com') : null
  state.household = null
  state.members = []
  state.categories = []
  state.expenses = []
  state.incomes = []
  state.savings = []
  state.monthSettings = []
  state.nextId = 1
  if (withHousehold) {
    state.household = makeHousehold('Naša kuća')
    state.members = [makeMember('user-me', 'Ja'), makeMember('user-partner', 'Partner')]
    state.categories = [
      makeCategory(1, 'Hrana', '🛒'),
      makeCategory(2, 'Računi', '🧾'),
      { ...makeCategory(3, 'Brza hrana', '🍟'), default_necessity: 'unneeded' },
      { ...makeCategory(4, 'Stara kategorija', '🗃️'), archived: true },
    ]
  }
}
