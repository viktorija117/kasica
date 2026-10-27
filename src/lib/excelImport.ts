// Reads the old "Budžet kućni" Excel workbook and turns it into rows for the database.
//
// Workbook layout:
// - "Troškovi": from row 4, columns Datum, Kategorija, Opis, Iznos (RSD), Napomena
//   (Potrebno / Bespotrebno). "Prebacivanje u sledeći mesec" rows are not spending: their sum
//   becomes the carry-over of the NEXT month.
// - "Godišnji pregled": year in B2, months in rows 5–16. Column B (Početno stanje) is usually
//   `=SUM(…)` of the month's incomes plus the amount carried in from the previous month;
//   column D is that month's savings.
//
// Everything here is pure and works on a SheetJS WorkBook object, so it can be tested without
// files. Reading the file itself is in `readWorkbookFile`, which loads SheetJS on demand.

import type { CellObject, WorkBook, WorkSheet } from 'xlsx'
import { roundMoney, sameAmount, sumAmounts, sumByMonth } from './budget'
import { shiftMonth, type DateKey, type MonthKey } from './dates'
import { MAX_AMOUNT, parseAmount } from './money'
import { searchKey } from './text'

type Necessity = 'needed' | 'unneeded'

const EXPENSES_SHEET = 'Troškovi'
const YEAR_SHEET = 'Godišnji pregled'
const TRANSFER_CATEGORY = 'Prebacivanje u sledeći mesec'
const FIRST_EXPENSE_ROW = 4
const FIRST_MONTH_ROW = 5
const MAX_DESCRIPTION = 200
const MAX_CATEGORY_NAME = 60
/** Days between Excel's 1900 and 1904 date systems. */
const DATE_1904_OFFSET = 1462

const necessityWords: Record<string, Necessity> = {
  potrebno: 'needed',
  bespotrebno: 'unneeded',
}

export type WarningReason =
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidDate'
  | 'missingCategory'
  | 'missingYear'
  | 'unreadableOpening'
  | 'invalidIncome'
  | 'invalidSaving'

export type ImportWarning = {
  sheet: 'expenses' | 'year'
  /** 1-based row number as Excel shows it. */
  row: number
  reason: WarningReason
  /** What the row is about: the expense description or the month name. */
  text: string
}

export type ParsedExpense = {
  row: number
  date: DateKey
  /** Category name as written in the workbook, trimmed. */
  category: string
  description: string
  amount: number
  /** `null` when the Napomena column is empty or says something else. */
  necessity: Necessity | null
}

export type ParsedEntry = { date: DateKey; amount: number }

export type CarryOverride = { month: MonthKey; amount: number }

export type ParsedWorkbook = {
  expenses: ParsedExpense[]
  incomes: ParsedEntry[]
  savings: ParsedEntry[]
  /** carry_override per month, from the transfers of the month before. */
  carry: CarryOverride[]
  transferCount: number
  warnings: ImportWarning[]
}

export type ImportFileErrorReason = 'unreadableFile' | 'missingExpensesSheet'

export class ImportFileError extends Error {
  readonly reason: ImportFileErrorReason
  constructor(reason: ImportFileErrorReason) {
    super(reason)
    this.reason = reason
  }
}

// --- cells -------------------------------------------------------------------------------

function findSheet(workbook: WorkBook, name: string): WorkSheet | undefined {
  const wanted = searchKey(name)
  const found = workbook.SheetNames.find((sheetName) => searchKey(sheetName) === wanted)
  return found === undefined ? undefined : workbook.Sheets[found]
}

function cellAt(sheet: WorkSheet, column: string, row: number): CellObject | undefined {
  return sheet[`${column}${row}`] as CellObject | undefined
}

function lastRow(sheet: WorkSheet): number {
  const match = /(\d+)$/.exec(sheet['!ref'] ?? '')
  return match ? Number(match[1]) : 0
}

function isEmpty(cell: CellObject | undefined): boolean {
  return !cell || cell.v === undefined || cell.v === null || String(cell.v).trim() === ''
}

function cellText(cell: CellObject | undefined): string {
  return isEmpty(cell) ? '' : String(cell!.v).trim()
}

const pad = (n: number) => String(n).padStart(2, '0')

function dateKeyOf(year: number, month: number, day: number): DateKey | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    year >= 1900 &&
    year <= 9999 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  return valid ? `${year}-${pad(month)}-${pad(day)}` : null
}

/** Excel day number → calendar day. Done in UTC so the user's time zone never shifts it. */
export function excelSerialToDateKey(serial: number, date1904 = false): DateKey | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  const days = Math.floor(serial) + (date1904 ? DATE_1904_OFFSET : 0)
  const date = new Date(Date.UTC(1899, 11, 30) + days * 86_400_000)
  return dateKeyOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** A date typed as text: `23.9.2026`, `23.09.2026.` or `2026-09-23`. */
export function textToDateKey(text: string): DateKey | null {
  const serbian = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(text.trim())
  if (serbian) return dateKeyOf(Number(serbian[3]), Number(serbian[2]), Number(serbian[1]))
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim())
  if (iso) return dateKeyOf(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  return null
}

function readDate(cell: CellObject | undefined, date1904: boolean): DateKey | null {
  if (isEmpty(cell)) return null
  const value = cell!.v
  if (typeof value === 'number') return excelSerialToDateKey(value, date1904)
  if (value instanceof Date) return dateKeyOf(value.getFullYear(), value.getMonth() + 1, value.getDate())
  return textToDateKey(String(value))
}

/** `undefined` for an empty cell, `null` for something that is not an amount. */
function readAmount(cell: CellObject | undefined): number | null | undefined {
  if (isEmpty(cell)) return undefined
  const value = cell!.v
  if (typeof value === 'number') return Number.isFinite(value) ? roundMoney(value) : null
  if (typeof value === 'string') return parseAmount(value)
  return null
}

function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= MAX_AMOUNT
}

/**
 * The numbers of a formula that only adds constants: `SUM(70000, 32970)`, `SUM(1; 2)`,
 * `70000+32970`. `null` when the formula refers to cells or does anything else.
 */
export function formulaNumbers(formula: string): number[] | null {
  const body = formula.trim().replace(/^=/, '').replace(/\s+/g, '')
  const sum = /^SUM\((.*)\)$/i.exec(body)
  const parts = (sum ? sum[1] : body).split(/[;,+]/)
  if (parts.some((part) => !/^-?\d+(\.\d+)?$/.test(part))) return null
  return parts.map(Number)
}

// --- workbook ----------------------------------------------------------------------------

function isTransfer(category: string): boolean {
  return searchKey(category) === searchKey(TRANSFER_CATEGORY)
}

function parseExpensesSheet(sheet: WorkSheet, date1904: boolean) {
  const expenses: ParsedExpense[] = []
  const transfers: ParsedEntry[] = []
  const warnings: ImportWarning[] = []

  for (let row = FIRST_EXPENSE_ROW; row <= lastRow(sheet); row++) {
    const cells = ['A', 'B', 'C', 'D', 'E'].map((column) => cellAt(sheet, column, row))
    if (cells.every(isEmpty)) continue
    const [dateCell, categoryCell, descriptionCell, amountCell, noteCell] = cells

    const category = cellText(categoryCell)
    const description = cellText(descriptionCell).slice(0, MAX_DESCRIPTION)
    const date = readDate(dateCell, date1904)
    const amount = readAmount(amountCell)
    const warn = (reason: WarningReason) =>
      warnings.push({ sheet: 'expenses', row, reason, text: description || category })

    if (amount === undefined) warn('missingAmount')
    else if (amount === null || !isValidAmount(amount)) warn('invalidAmount')
    else if (!date) warn('invalidDate')
    else if (!category) warn('missingCategory')
    else if (isTransfer(category)) transfers.push({ date, amount })
    else {
      const necessity = necessityWords[searchKey(cellText(noteCell))] ?? null
      expenses.push({ row, date, category, description, amount, necessity })
    }
  }

  const carry = sumByMonth(transfers).map(({ month, total }) => ({
    month: shiftMonth(month, 1),
    amount: total,
  }))
  return { expenses, transfers, carry, warnings }
}

/**
 * Incomes of one month from its "Početno stanje" cell. The amount carried in from the previous
 * month is part of that sum in the workbook, but in the app it is the carry-over, not income.
 */
function openingIncomes(cell: CellObject, carriedIn: number | null): number[] | 'unreadable' {
  const parts = cell.f ? formulaNumbers(cell.f) : null
  if (parts) {
    const carryIndex = carriedIn === null ? -1 : parts.findIndex((part) => sameAmount(part, carriedIn))
    return parts.filter((_, index) => index !== carryIndex)
  }

  // A plain number, or a formula that refers to other cells: its result is the opening balance.
  const value = readAmount(cell)
  if (typeof value !== 'number') return 'unreadable'
  if (carriedIn !== null && value >= carriedIn) {
    const income = sumAmounts([{ amount: value }, { amount: -carriedIn }])
    return income === 0 ? [] : [income]
  }
  return [value]
}

function parseYearSheet(sheet: WorkSheet, carry: CarryOverride[]) {
  const incomes: ParsedEntry[] = []
  const savings: ParsedEntry[] = []
  const warnings: ImportWarning[] = []

  const yearValue = cellAt(sheet, 'B', 2)?.v
  const year = typeof yearValue === 'number' ? yearValue : Number(String(yearValue ?? '').trim())
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    warnings.push({ sheet: 'year', row: 2, reason: 'missingYear', text: '' })
    return { incomes, savings, warnings }
  }

  for (let index = 0; index < 12; index++) {
    const row = FIRST_MONTH_ROW + index
    const month: MonthKey = `${year}-${pad(index + 1)}-01`
    const label = cellText(cellAt(sheet, 'A', row))
    const warn = (reason: WarningReason) => warnings.push({ sheet: 'year', row, reason, text: label })

    const openingCell = cellAt(sheet, 'B', row)
    if (openingCell && !isEmpty(openingCell)) {
      const carriedIn = carry.find((entry) => entry.month === month)?.amount ?? null
      const parts = openingIncomes(openingCell, carriedIn)
      if (parts === 'unreadable') warn('unreadableOpening')
      else {
        for (const amount of parts) {
          if (amount === 0) continue
          if (isValidAmount(amount)) incomes.push({ date: month, amount: roundMoney(amount) })
          else warn('invalidIncome')
        }
      }
    }

    const saving = readAmount(cellAt(sheet, 'D', row))
    if (saving === null || (saving !== undefined && Math.abs(saving) > MAX_AMOUNT)) warn('invalidSaving')
    else if (saving) savings.push({ date: month, amount: saving })
  }

  return { incomes, savings, warnings }
}

export function parseWorkbook(workbook: WorkBook): ParsedWorkbook {
  const expensesSheet = findSheet(workbook, EXPENSES_SHEET)
  if (!expensesSheet) throw new ImportFileError('missingExpensesSheet')
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904)

  const expensePart = parseExpensesSheet(expensesSheet, date1904)
  const yearSheet = findSheet(workbook, YEAR_SHEET)
  const yearPart = yearSheet
    ? parseYearSheet(yearSheet, expensePart.carry)
    : { incomes: [], savings: [], warnings: [] }

  return {
    expenses: expensePart.expenses,
    incomes: yearPart.incomes,
    savings: yearPart.savings,
    carry: expensePart.carry,
    transferCount: expensePart.transfers.length,
    warnings: [...expensePart.warnings, ...yearPart.warnings],
  }
}

/** Opens an .xlsx file in the browser. SheetJS is loaded only when someone imports. */
export async function readWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const { read } = await import('xlsx')
  let workbook: WorkBook
  try {
    workbook = read(await file.arrayBuffer(), { cellFormula: true })
  } catch {
    throw new ImportFileError('unreadableFile')
  }
  return parseWorkbook(workbook)
}

// --- categories --------------------------------------------------------------------------

type CategoryLike = { id: string; name: string; default_necessity: Necessity; archived: boolean }

export type ExcelCategory = { name: string; count: number }

/** Category names used by the expenses, in order of first appearance. */
export function excelCategories(parsed: ParsedWorkbook): ExcelCategory[] {
  const counts = new Map<string, number>()
  for (const expense of parsed.expenses) {
    counts.set(expense.category, (counts.get(expense.category) ?? 0) + 1)
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }))
}

export type CategoryChoice = { kind: 'existing'; categoryId: string } | { kind: 'new' }

/** Excel category name → what it becomes in the app. */
export type CategoryMapping = Record<string, CategoryChoice>

const firstWord = (name: string) => searchKey(name).split(/[\s,]+/)[0] ?? ''

/**
 * Same name (ignoring case and diacritics) → that category, preferring active ones. Otherwise
 * the only active category that starts with the same word ("Brza hrana, grickalice…" →
 * "Brza hrana i grickalice"). Otherwise a new category.
 */
export function suggestMapping(names: readonly string[], categories: readonly CategoryLike[]): CategoryMapping {
  const active = categories.filter((category) => !category.archived)
  const mapping: CategoryMapping = {}
  for (const name of names) {
    const key = searchKey(name)
    const exact =
      active.find((category) => searchKey(category.name) === key) ??
      categories.find((category) => searchKey(category.name) === key)
    const word = firstWord(name)
    const sameWord = word.length >= 3 ? active.filter((category) => firstWord(category.name) === word) : []
    const match = exact ?? (sameWord.length === 1 ? sameWord[0] : undefined)
    mapping[name] = match ? { kind: 'existing', categoryId: match.id } : { kind: 'new' }
  }
  return mapping
}

// --- import plan -------------------------------------------------------------------------

export type NewCategory = {
  key: string
  name: string
  emoji: string
  color: string
  default_necessity: Necessity
}

export type ImportExpense = {
  date: DateKey
  category_id: string | null
  /** Key of a category in `ImportPlan.categories`, when the category is new. */
  category_key: string | null
  description: string
  amount: number
  necessity: Necessity
}

export type ImportIncome = { date: DateKey; source: string; amount: number }
export type ImportSaving = { date: DateKey; amount: number; note: string }

export type MonthPreview = {
  month: MonthKey
  expenseCount: number
  spent: number
  incomeCount: number
  income: number
  saved: number
  /** carry_override the import sets, `null` when the month keeps its automatic carry-over. */
  carryIn: number | null
}

export type ImportPlan = {
  categories: NewCategory[]
  expenses: ImportExpense[]
  incomes: ImportIncome[]
  savings: ImportSaving[]
  carry: CarryOverride[]
  months: MonthPreview[]
  total: Omit<MonthPreview, 'month' | 'carryIn'>
}

const NEW_CATEGORY_STYLE = { emoji: '📦', color: '#9e9e9e' }

function newCategory(name: string, expenses: readonly ParsedExpense[]): NewCategory {
  const rows = expenses.filter((expense) => expense.category === name)
  const unneeded = rows.filter((expense) => expense.necessity === 'unneeded').length
  return {
    key: name,
    name: name.slice(0, MAX_CATEGORY_NAME),
    ...NEW_CATEGORY_STYLE,
    default_necessity: unneeded * 2 > rows.length ? 'unneeded' : 'needed',
  }
}

/** The rows to write, with categories resolved, plus the per-month preview shown before. */
export function buildImportPlan(
  parsed: ParsedWorkbook,
  mapping: CategoryMapping,
  categories: readonly CategoryLike[],
  texts: { incomeSource: string; savingNote: string },
): ImportPlan {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const newCategories = new Map<string, NewCategory>()

  const expenses = parsed.expenses.map((expense): ImportExpense => {
    const choice = mapping[expense.category]
    const existing = choice?.kind === 'existing' ? byId.get(choice.categoryId) : undefined
    let fresh: NewCategory | undefined
    if (!existing) {
      fresh = newCategories.get(expense.category) ?? newCategory(expense.category, parsed.expenses)
      newCategories.set(expense.category, fresh)
    }
    const defaultNecessity = existing?.default_necessity ?? fresh!.default_necessity
    return {
      date: expense.date,
      category_id: existing?.id ?? null,
      category_key: fresh?.key ?? null,
      description: expense.description,
      amount: expense.amount,
      necessity: expense.necessity ?? defaultNecessity,
    }
  })

  const incomes = parsed.incomes.map(({ date, amount }) => ({ date, amount, source: texts.incomeSource }))
  const savings = parsed.savings.map(({ date, amount }) => ({ date, amount, note: texts.savingNote }))

  const spent = sumByMonth(expenses)
  const income = sumByMonth(incomes)
  const saved = sumByMonth(savings)
  const months = [
    ...new Set([...spent, ...income, ...saved, ...parsed.carry].map(({ month }) => month)),
  ].sort()

  return {
    categories: [...newCategories.values()],
    expenses,
    incomes,
    savings,
    carry: parsed.carry,
    months: months.map((month) => {
      const find = (list: typeof spent) => list.find((entry) => entry.month === month)
      return {
        month,
        expenseCount: find(spent)?.count ?? 0,
        spent: find(spent)?.total ?? 0,
        incomeCount: find(income)?.count ?? 0,
        income: find(income)?.total ?? 0,
        saved: find(saved)?.total ?? 0,
        carryIn: parsed.carry.find((entry) => entry.month === month)?.amount ?? null,
      }
    }),
    total: {
      expenseCount: expenses.length,
      spent: sumAmounts(expenses),
      incomeCount: incomes.length,
      income: sumAmounts(incomes),
      saved: sumAmounts(savings),
    },
  }
}

