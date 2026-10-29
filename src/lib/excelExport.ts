// Excel export of one year: the rows of the year as four sheets. The month sums come from
// `yearOverview` (budget.ts), so the file shows the same numbers as the app.

import type { CellObject, WorkBook } from 'xlsx'
import { sr } from '../i18n/sr'
import type { YearOverview } from './budget'
import { monthLabel, type DateKey } from './dates'

export type ExportCell = string | { amount: number } | { date: DateKey } | null

export type ExportSheet = {
  name: string
  rows: ExportCell[][]
  /** Column widths in characters. */
  widths: number[]
}

type Named = { id: string; name: string }
type Member = { user_id: string; display_name: string }

export type ExportInput = {
  expenses: readonly {
    date: DateKey
    category_id: string
    description: string
    amount: number
    necessity: 'needed' | 'unneeded'
    paid_by: string | null
    created_by: string | null
    note: string | null
  }[]
  incomes: readonly { date: DateKey; source: string; amount: number; received_by: string | null; note: string | null }[]
  savings: readonly { date: DateKey; amount: number; note: string | null }[]
  overview: YearOverview<Named>
  /** Every category of the household, archived ones too. */
  categories: readonly Named[]
  members: readonly Member[]
}

const columns = sr.export.columns

/** The four sheets of the export: Troškovi, Prihodi, Štednja, Pregled po mesecima. */
export function exportSheets(input: ExportInput): ExportSheet[] {
  const categoryName = new Map(input.categories.map((category) => [category.id, category.name]))
  const memberName = new Map(input.members.map((member) => [member.user_id, member.display_name]))
  const person = (userId: string | null) => (userId ? (memberName.get(userId) ?? null) : null)
  const text = (value: string | null) => (value ? value : null)

  const expenses: ExportSheet = {
    name: sr.export.sheets.expenses,
    widths: [12, 18, 28, 14, 12, 12, 12, 28],
    rows: [
      [columns.date, columns.category, columns.description, columns.amount, columns.necessity, columns.paidBy, columns.createdBy, columns.note],
      ...input.expenses.map((expense) => [
        { date: expense.date },
        categoryName.get(expense.category_id) ?? sr.year.unknownCategory,
        text(expense.description),
        { amount: expense.amount },
        sr.necessity[expense.necessity],
        person(expense.paid_by),
        person(expense.created_by),
        text(expense.note),
      ]),
    ],
  }

  const incomes: ExportSheet = {
    name: sr.export.sheets.incomes,
    widths: [12, 24, 14, 12, 28],
    rows: [
      [columns.date, columns.source, columns.amount, columns.receivedBy, columns.note],
      ...input.incomes.map((income) => [
        { date: income.date },
        text(income.source),
        { amount: income.amount },
        person(income.received_by),
        text(income.note),
      ]),
    ],
  }

  const savings: ExportSheet = {
    name: sr.export.sheets.savings,
    widths: [12, 14, 28],
    rows: [
      [columns.date, columns.amount, columns.note],
      ...input.savings.map((saving) => [{ date: saving.date }, { amount: saving.amount }, text(saving.note)]),
    ],
  }

  const { overview } = input
  const categoryColumns = overview.categories.map((column) => column.category?.name ?? sr.year.unknownCategory)
  const shown = overview.months.filter((month) => month.shown)
  const months: ExportSheet = {
    name: sr.export.sheets.months,
    widths: [16, 14, 14, 16, 14, 14, 14, ...categoryColumns.map((name) => Math.max(12, name.length + 2))],
    rows: [
      [columns.month, columns.carryIn, columns.income, columns.opening, columns.spent, columns.saved, columns.remaining, ...categoryColumns],
      ...shown.map(({ month, balance, cells }) => [
        monthLabel(month),
        { amount: balance.carryIn },
        { amount: balance.income },
        { amount: balance.opening },
        { amount: balance.spent },
        { amount: balance.saved },
        { amount: balance.remaining },
        ...cells.map((cell) => ({ amount: cell.total })),
      ]),
      [
        sr.export.total,
        { amount: overview.months[0].balance.carryIn },
        { amount: overview.total.income },
        { amount: overview.total.opening },
        { amount: overview.total.spent },
        { amount: overview.total.saved },
        { amount: overview.total.remaining },
        ...overview.categories.map((column) => ({ amount: column.total })),
      ],
    ],
  }

  return [expenses, incomes, savings, months]
}

/** Days since 30.12.1899, the way Excel stores dates. */
export function dateKeyToExcelSerial(key: DateKey): number {
  const [year, month, day] = key.split('-').map(Number)
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000
}

const DATE_FORMAT = 'dd.mm.yyyy'
/** Decimals only when the amount has them, like `formatAmount`. */
const amountFormat = (amount: number) => (Number.isInteger(amount) ? '#,##0' : '#,##0.00')

function toCell(cell: ExportCell): CellObject | null {
  if (cell === null) return null
  if (typeof cell === 'string') return { t: 's', v: cell }
  if ('date' in cell) return { t: 'n', v: dateKeyToExcelSerial(cell.date), z: DATE_FORMAT }
  return { t: 'n', v: cell.amount, z: amountFormat(cell.amount) }
}

/** Turns the sheets into a SheetJS workbook. `xlsx` is passed in so it can be loaded lazily. */
export function toWorkbook(xlsx: Pick<typeof import('xlsx'), 'utils'>, sheets: readonly ExportSheet[]): WorkBook {
  const { utils } = xlsx
  const workbook = utils.book_new()
  for (const sheet of sheets) {
    const worksheet = utils.aoa_to_sheet([])
    sheet.rows.forEach((row, r) =>
      row.forEach((value, c) => {
        const cell = toCell(value)
        if (cell) worksheet[utils.encode_cell({ r, c })] = cell
      }),
    )
    const width = Math.max(...sheet.rows.map((row) => row.length))
    worksheet['!ref'] = utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sheet.rows.length - 1, c: width - 1 } })
    worksheet['!cols'] = sheet.widths.map((wch) => ({ wch }))
    utils.book_append_sheet(workbook, worksheet, sheet.name)
  }
  return workbook
}

/** Builds the file and hands it to the browser as a download. SheetJS loads only now. */
export async function downloadWorkbook(sheets: readonly ExportSheet[], fileName: string): Promise<void> {
  const xlsx = await import('xlsx')
  xlsx.writeFile(toWorkbook(xlsx, sheets), fileName, { compression: true })
}
