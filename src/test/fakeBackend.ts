// In-memory stand-ins for the src/data modules, so tests never talk to Supabase.
// Usage in a test file:
//   vi.mock('../data/auth', async () => (await import('../test/fakeBackend')).fakeAuth)
// It must not import any app module, or the mock factories would import themselves.
import type { Session } from '../data/auth'
import type { Category, CategoryInput, CategoryPatch } from '../data/categories'
import type { Expense, ExpenseInput, ExpenseSuggestion, NewExpenseInput } from '../data/expenses'
import type { Household, HouseholdMember } from '../data/households'
import type { ImportBatch } from '../data/imports'
import type { Income, IncomeInput } from '../data/incomes'
import type { ImportPlan } from '../lib/excelImport'
import type { MonthSetting, MonthSettingInput } from '../data/monthSettings'
import type { MonthCategoryTotalsRow } from '../data/monthCategoryTotals'
import type { MonthTotalsRow } from '../data/monthTotals'
import type { RecurringExpense, RecurringInput, RecurringPatch } from '../data/recurring'
import type { ReceiptInput, SavedReceipt } from '../data/receipts'
import type { Saving, SavingInput } from '../data/savings'
import type { RawReceipt } from '../lib/receipt'
import { RECEIPT_SPECIFICATIONS, RECEIPT_URL, receiptHtml } from './receiptFixtures'

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
  recurring: [] as RecurringExpense[],
  importBatches: [] as (ImportBatch & { carryMonths: string[]; settingsBefore: MonthSetting[] })[],
  receipts: [] as (SavedReceipt & ReceiptInput)[],
  /** What suf.purs.gov.rs answers for a link: the receipt, or an error code of the Edge Function. */
  fiscalSite: new Map<string, RawReceipt | string>(),
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
    savings_opening: 0,
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
    import_batch: null,
    created_at: '2026-10-27T10:00:00Z',
  }
}

function makeExpense(id: string, input: NewExpenseInput, createdBy: string | null): Expense {
  const now = new Date().toISOString()
  return {
    id,
    household_id: HOUSEHOLD_ID,
    description: '',
    paid_by: null,
    note: null,
    import_batch: null,
    receipt_id: null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
    ...input,
    recurring_id: input.recurring_id ?? null,
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
  updateSavingsOpening: vi.fn(async (_householdId: string, amount: number) => {
    state.household = { ...state.household!, savings_opening: amount }
  }),
  joinHousehold: vi.fn(async (code: string, displayName: string) => {
    if (code !== VALID_INVITE_CODE) throw databaseError('invalid_invite_code')
    state.household = makeHousehold('Naša kuća')
    state.members = [makeMember('user-partner', 'Viki'), makeMember(state.session!.user.id, displayName)]
    return HOUSEHOLD_ID
  }),
}

export const fakeCategories = {
  fetchCategories: vi.fn(async () =>
    [...state.categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
  ),
  createCategory: vi.fn(async (_householdId: string, input: CategoryInput & { sort: number }) => {
    const category: Category = { ...makeCategory(input.sort, input.name, input.emoji ?? '📦'), ...input, id: newId('cat') }
    state.categories.push(category)
    return category
  }),
  updateCategory: vi.fn(async (id: string, patch: CategoryPatch) => {
    const index = state.categories.findIndex((category) => category.id === id)
    state.categories[index] = { ...state.categories[index], ...patch }
    return state.categories[index]
  }),
  reorderCategories: vi.fn(async (_householdId: string, ids: string[]) => {
    state.categories = state.categories.map((category) =>
      ids.includes(category.id) ? { ...category, sort: ids.indexOf(category.id) + 1 } : category,
    )
  }),
}

export const fakeExpenses = {
  fetchExpenses: vi.fn(async (_householdId: string, month: string) =>
    state.expenses
      .filter((expense) => expense.date.slice(0, 7) === month.slice(0, 7))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
  ),
  createExpense: vi.fn(async (_householdId: string, id: string, input: NewExpenseInput) => {
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

function makeRecurring(id: string, input: RecurringInput & { sort: number }): RecurringExpense {
  return {
    id,
    household_id: HOUSEHOLD_ID,
    necessity: 'needed',
    active: true,
    created_at: new Date().toISOString(),
    ...input,
  }
}

export const fakeRecurring = {
  fetchRecurring: vi.fn(async () =>
    [...state.recurring].sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)),
  ),
  createRecurring: vi.fn(async (_householdId: string, input: RecurringInput & { sort: number }) => {
    const recurring = makeRecurring(newId('rec'), input)
    state.recurring.push(recurring)
    return recurring
  }),
  updateRecurring: vi.fn(async (id: string, patch: RecurringPatch) => {
    const index = state.recurring.findIndex((recurring) => recurring.id === id)
    state.recurring[index] = { ...state.recurring[index], ...patch }
    return state.recurring[index]
  }),
  // Like `on delete set null`: payments stay, without the link.
  deleteRecurring: vi.fn(async (id: string) => {
    state.recurring = state.recurring.filter((recurring) => recurring.id !== id)
    state.expenses = state.expenses.map((expense) =>
      expense.recurring_id === id ? { ...expense, recurring_id: null } : expense,
    )
  }),
  reorderRecurring: vi.fn(async (_householdId: string, ids: string[]) => {
    state.recurring = state.recurring.map((recurring) =>
      ids.includes(recurring.id) ? { ...recurring, sort: ids.indexOf(recurring.id) + 1 } : recurring,
    )
  }),
}

/** Adds a recurring expense that was set up long ago. */
export function seedRecurring(input: Partial<RecurringExpense> & Pick<RecurringExpense, 'name' | 'amount' | 'day_of_month'>) {
  const recurring = makeRecurring(input.id ?? `rec-${state.recurring.length + 1}`, {
    category_id: 'cat-2',
    sort: state.recurring.length + 1,
    ...input,
  })
  recurring.created_at = input.created_at ?? '2026-01-01T09:00:00'
  state.recurring.push(recurring)
  return recurring
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

// Same effect as the import_workbook / undo_import database functions.
export const fakeImports = {
  fetchImportBatches: vi.fn(async () =>
    state.importBatches.map(({ id, file_name, created_at }) => ({ id, file_name, created_at })),
  ),
  importWorkbook: vi.fn(async (_householdId: string, fileName: string, plan: ImportPlan) => {
    const batch = newId('batch')
    const categoryIds = new Map<string, string>()
    for (const category of plan.categories) {
      const id = newId('cat')
      categoryIds.set(category.key, id)
      state.categories.push({
        ...makeCategory(state.categories.length + 1, category.name, category.emoji),
        id,
        color: category.color,
        default_necessity: category.default_necessity,
        import_batch: batch,
      })
    }
    for (const { category_id, category_key, ...expense } of plan.expenses) {
      const input = { ...expense, category_id: category_id ?? categoryIds.get(category_key!)!, paid_by: null }
      state.expenses.push({ ...makeExpense(newId('exp'), input, 'user-me'), import_batch: batch })
    }
    for (const income of plan.incomes) state.incomes.push({ ...makeIncome(income), import_batch: batch })
    for (const saving of plan.savings) state.savings.push({ ...makeSaving(saving), import_batch: batch })
    const carryMonths = plan.carry.map(({ month }) => month)
    const settingsBefore = state.monthSettings
      .filter((row) => carryMonths.includes(row.month))
      .map((row) => ({ ...row }))
    for (const { month, amount } of plan.carry) {
      const row = state.monthSettings.find((setting) => setting.month === month)
      if (row) row.carry_override = amount
      else state.monthSettings.push({ household_id: HOUSEHOLD_ID, month, carry_enabled: true, carry_override: amount })
    }
    state.importBatches.unshift({ id: batch, file_name: fileName, created_at: new Date().toISOString(), carryMonths, settingsBefore })
    return batch
  }),
  undoImport: vi.fn(async (batchId: string) => {
    const batch = state.importBatches.find(({ id }) => id === batchId)!
    const keep = <T extends { import_batch: string | null }>(rows: T[]) =>
      rows.filter((row) => row.import_batch !== batchId)
    state.monthSettings = [
      ...state.monthSettings.filter((row) => !batch.carryMonths.includes(row.month)),
      ...batch.settingsBefore,
    ]
    state.expenses = keep(state.expenses)
    state.incomes = keep(state.incomes)
    state.savings = keep(state.savings)
    state.categories = keep(state.categories)
    state.importBatches = state.importBatches.filter(({ id }) => id !== batchId)
  }),
}

// Same effect as the fiscal-receipt Edge Function and the save_receipt database function.
export const fakeReceipts = {
  fetchFiscalReceipt: vi.fn(async (url: string) => {
    const answer = state.fiscalSite.get(url) ?? 'receipt_not_found'
    if (typeof answer === 'string') throw new Error(answer)
    return answer
  }),
  findReceiptByUrl: vi.fn(async (_householdId: string, url: string) => {
    const receipt = state.receipts.find((row) => row.url === url)
    return receipt ? { id: receipt.id, store: receipt.store, date: receipt.date, created_at: receipt.created_at } : null
  }),
  saveReceipt: vi.fn(async (_householdId: string, receipt: ReceiptInput, expenses: ExpenseInput[]) => {
    if (state.receipts.some((row) => row.url === receipt.url)) throw databaseError('receipt_exists')
    const id = newId('rcp')
    state.receipts.push({ ...receipt, id, created_at: new Date().toISOString() })
    for (const expense of expenses) {
      state.expenses.push({ ...makeExpense(newId('exp'), expense, state.session?.user.id ?? null), receipt_id: id })
    }
    return id
  }),
}

/** Sets what the tax office's site answers for a receipt link. */
export function setFiscalSiteAnswer(url: string, answer: RawReceipt | string) {
  state.fiscalSite.set(url, answer)
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

// Same sums as the month_category_totals view.
export const fakeMonthCategoryTotals = {
  fetchMonthCategoryTotals: vi.fn(async (_householdId: string, year: number) => {
    const byKey = new Map<string, MonthCategoryTotalsRow>()
    for (const expense of state.expenses) {
      if (expense.date.slice(0, 4) !== String(year)) continue
      const month = `${expense.date.slice(0, 7)}-01`
      const key = `${month}|${expense.category_id}`
      const row = byKey.get(key) ?? {
        household_id: HOUSEHOLD_ID,
        month,
        category_id: expense.category_id,
        spent: 0,
        unneeded: 0,
      }
      row.spent = Math.round((row.spent + expense.amount) * 100) / 100
      if (expense.necessity === 'unneeded') row.unneeded = Math.round((row.unneeded + expense.amount) * 100) / 100
      byKey.set(key, row)
    }
    return [...byKey.values()].sort((a, b) => a.month.localeCompare(b.month))
  }),
}

// Same rows as fetchYearRows: the whole year, oldest first.
export const fakeYearExport = {
  fetchYearRows: vi.fn(async (_householdId: string, year: number) => {
    const ofYear = <T extends { date: string; created_at: string }>(rows: T[]) =>
      rows
        .filter((row) => row.date.slice(0, 4) === String(year))
        .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    return { expenses: ofYear(state.expenses), incomes: ofYear(state.incomes), savings: ofYear(state.savings) }
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

export function saveMonthSettingForTest(month: string, input: MonthSettingInput) {
  state.monthSettings.push({ household_id: HOUSEHOLD_ID, month, ...input })
}

/** Adds an existing expense, as if one of the members had saved it earlier. */
export function seedExpense(input: Partial<NewExpenseInput> & Pick<ExpenseInput, 'date' | 'amount'>) {
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
  state.recurring = []
  state.importBatches = []
  state.receipts = []
  state.fiscalSite = new Map([[RECEIPT_URL, { html: receiptHtml(), specifications: RECEIPT_SPECIFICATIONS }]])
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
