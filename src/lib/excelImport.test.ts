import type { CellObject, WorkBook, WorkSheet } from 'xlsx'
import { describe, expect, it } from 'vitest'
import {
  buildImportPlan,
  excelCategories,
  excelSerialToDateKey,
  formulaNumbers,
  ImportFileError,
  parseWorkbook,
  suggestMapping,
  textToDateKey,
} from './excelImport'

// Excel day numbers: 46236 = 2026-08-02, 46265 = 2026-08-31, 46295 = 2026-09-30.
const AUG_2 = 46236
const AUG_31 = 46265
const SEP_30 = 46295

type Cell = string | number | { v?: string | number; f: string } | null
type Row = Cell[]

function toCell(value: Cell): CellObject | undefined {
  if (value === null) return undefined
  if (typeof value === 'number') return { t: 'n', v: value }
  if (typeof value === 'string') return { t: 's', v: value }
  return { t: typeof value.v === 'string' ? 's' : 'n', v: value.v, f: value.f }
}

/** A sheet whose rows start at `firstRow` (1-based), columns from A. */
function sheet(firstRow: number, rows: Row[], extra: Record<string, Cell> = {}): WorkSheet {
  const result: WorkSheet = {}
  rows.forEach((row, index) => {
    row.forEach((value, column) => {
      const cell = toCell(value)
      if (cell) result[`${String.fromCharCode(65 + column)}${firstRow + index}`] = cell
    })
  })
  for (const [address, value] of Object.entries(extra)) {
    const cell = toCell(value)
    if (cell) result[address] = cell
  }
  result['!ref'] = `A1:E${firstRow + rows.length - 1}`
  return result
}

function workbook(expenses: Row[], year?: { year: Cell; months: Row[] }): WorkBook {
  const sheets: Record<string, WorkSheet> = { Troškovi: sheet(4, expenses) }
  if (year) sheets['Godišnji pregled'] = sheet(5, year.months, { B2: year.year })
  return { SheetNames: Object.keys(sheets), Sheets: sheets }
}

const TRANSFER = 'Prebacivanje u sledeći mesec'
const texts = { incomeSource: 'Prihod (uvoz)', savingNote: 'Štednja (uvoz)' }

describe('excelSerialToDateKey', () => {
  it('turns Excel day numbers into calendar days', () => {
    expect(excelSerialToDateKey(AUG_2)).toBe('2026-08-02')
    expect(excelSerialToDateKey(46082)).toBe('2026-03-01')
    expect(excelSerialToDateKey(AUG_2 + 0.75)).toBe('2026-08-02')
  })

  it('handles the 1904 date system and rejects nonsense', () => {
    expect(excelSerialToDateKey(AUG_2 - 1462, true)).toBe('2026-08-02')
    expect(excelSerialToDateKey(0)).toBeNull()
    expect(excelSerialToDateKey(Number.NaN)).toBeNull()
  })
})

describe('textToDateKey', () => {
  it('reads Serbian and ISO dates', () => {
    expect(textToDateKey('23.9.2026')).toBe('2026-09-23')
    expect(textToDateKey('23.09.2026.')).toBe('2026-09-23')
    expect(textToDateKey('2026-09-23')).toBe('2026-09-23')
  })

  it('rejects days that do not exist', () => {
    expect(textToDateKey('31.9.2026')).toBeNull()
    expect(textToDateKey('29.2.2026')).toBeNull()
    expect(textToDateKey('29.2.2028')).toBe('2028-02-29')
    expect(textToDateKey('juče')).toBeNull()
  })
})

describe('formulaNumbers', () => {
  it('reads constants of SUM and plus formulas', () => {
    expect(formulaNumbers('SUM(70000, 32970, 21338)')).toEqual([70000, 32970, 21338])
    expect(formulaNumbers('=SUM(1500;69.99)')).toEqual([1500, 69.99])
    expect(formulaNumbers('70000+32970')).toEqual([70000, 32970])
    expect(formulaNumbers('5000')).toEqual([5000])
  })

  it('gives up on cell references and other functions', () => {
    expect(formulaNumbers('SUM(B5:B16)')).toBeNull()
    expect(formulaNumbers('C5-1000')).toBeNull()
    expect(formulaNumbers('SUM()')).toBeNull()
  })
})

describe('parseWorkbook — Troškovi', () => {
  it('reads expenses with trimmed category, description and necessity', () => {
    const parsed = parseWorkbook(
      workbook([
        [AUG_2, '  Hrana ', ' Blački sir 1.420kg', 1122, 'Potrebno'],
        ['3.8.2026', 'Brza hrana', 'Čips', '145,50', 'Bespotrebno'],
        [AUG_2, 'Hrana', '', 69.99, ''],
      ]),
    )
    expect(parsed.expenses).toEqual([
      { row: 4, date: '2026-08-02', category: 'Hrana', description: 'Blački sir 1.420kg', amount: 1122, necessity: 'needed' },
      { row: 5, date: '2026-08-03', category: 'Brza hrana', description: 'Čips', amount: 145.5, necessity: 'unneeded' },
      { row: 6, date: '2026-08-02', category: 'Hrana', description: '', amount: 69.99, necessity: null },
    ])
    expect(parsed.warnings).toEqual([])
  })

  it('turns transfers into the carry-over of the next month instead of expenses', () => {
    const parsed = parseWorkbook(
      workbook([
        [AUG_2, 'Hrana', 'Hleb', 80, 'Potrebno'],
        [AUG_31, TRANSFER, 'Prebacivanje novca', 10396, 'Potrebno'],
        [SEP_30, ` ${TRANSFER} `, 'Prebacivanje', 30000, 'Potrebno'],
        [SEP_30, TRANSFER, 'Još malo', 6132, 'Potrebno'],
      ]),
    )
    expect(parsed.expenses).toHaveLength(1)
    expect(parsed.transferCount).toBe(3)
    expect(parsed.carry).toEqual([
      { month: '2026-09-01', amount: 10396 },
      { month: '2026-10-01', amount: 36132 },
    ])
  })

  it('warns about rows it cannot import and skips empty rows', () => {
    const parsed = parseWorkbook(
      workbook([
        [AUG_2, 'Ostalo', 'Sredstvo za otpušavanje', null, 'Potrebno'],
        [null, null, null, null, null],
        [AUG_2, 'Ostalo', 'Minus', -50, ''],
        [AUG_2, 'Ostalo', 'Nije broj', 'mnogo', ''],
        ['juče', 'Ostalo', 'Bez datuma', 100, ''],
        [AUG_2, '', 'Bez kategorije', 100, ''],
      ]),
    )
    expect(parsed.expenses).toEqual([])
    expect(parsed.warnings.map(({ row, reason, text }) => [row, reason, text])).toEqual([
      [4, 'missingAmount', 'Sredstvo za otpušavanje'],
      [6, 'invalidAmount', 'Minus'],
      [7, 'invalidAmount', 'Nije broj'],
      [8, 'invalidDate', 'Bez datuma'],
      [9, 'missingCategory', 'Bez kategorije'],
    ])
  })

  it('needs the Troškovi sheet', () => {
    const empty: WorkBook = { SheetNames: ['List1'], Sheets: { List1: {} } }
    expect(() => parseWorkbook(empty)).toThrow(ImportFileError)
  })
})

describe('parseWorkbook — Godišnji pregled', () => {
  const months = (overrides: Record<number, Row>): Row[] =>
    Array.from({ length: 12 }, (_, index) => overrides[index + 1] ?? [`Mesec ${index + 1}`, null, 0, null])

  it('makes one income per number of the SUM, leaving out the amount carried in', () => {
    const parsed = parseWorkbook(
      workbook([[AUG_31, TRANSFER, '', 10396, '']], {
        year: 2026,
        months: months({
          8: ['Avgust', { v: 102970, f: 'SUM(70000, 32970)' }, 0, 75200],
          9: ['Septembar', { v: 52396, f: 'SUM(10396, 31500, 10500)' }, 0, null],
        }),
      }),
    )
    expect(parsed.incomes).toEqual([
      { date: '2026-08-01', amount: 70000 },
      { date: '2026-08-01', amount: 32970 },
      { date: '2026-09-01', amount: 31500 },
      { date: '2026-09-01', amount: 10500 },
    ])
    expect(parsed.savings).toEqual([{ date: '2026-08-01', amount: 75200 }])
  })

  it('leaves out the carried amount only once', () => {
    const parsed = parseWorkbook(
      workbook([[AUG_31, TRANSFER, '', 5000, '']], {
        year: 2026,
        months: months({ 9: ['Septembar', { v: 15000, f: 'SUM(5000, 5000, 5000)' }, 0, null] }),
      }),
    )
    expect(parsed.incomes.map(({ amount }) => amount)).toEqual([5000, 5000])
  })

  it('treats a plain opening value as one income, without the carried amount', () => {
    const parsed = parseWorkbook(
      workbook([[AUG_31, TRANSFER, '', 10396, '']], {
        year: 2026,
        months: months({ 8: ['Avgust', 90000, 0, null], 9: ['Septembar', 100396, 0, -5000] }),
      }),
    )
    expect(parsed.incomes).toEqual([
      { date: '2026-08-01', amount: 90000 },
      { date: '2026-09-01', amount: 90000 },
    ])
    expect(parsed.savings).toEqual([{ date: '2026-09-01', amount: -5000 }])
  })

  it('uses the result of a formula that refers to cells', () => {
    const parsed = parseWorkbook(
      workbook([], { year: 2026, months: months({ 1: ['Januar', { v: 1200, f: 'F1+F2' }, 0, null] }) }),
    )
    expect(parsed.incomes).toEqual([{ date: '2026-01-01', amount: 1200 }])
  })

  it('warns when the year is missing and imports no incomes', () => {
    const parsed = parseWorkbook(
      workbook([], { year: null, months: months({ 8: ['Avgust', 5000, 0, 100] }) }),
    )
    expect(parsed.incomes).toEqual([])
    expect(parsed.warnings).toEqual([{ sheet: 'year', row: 2, reason: 'missingYear', text: '' }])
  })

  it('works without the yearly sheet', () => {
    const parsed = parseWorkbook(workbook([[AUG_2, 'Hrana', 'Hleb', 80, '']]))
    expect(parsed.incomes).toEqual([])
    expect(parsed.savings).toEqual([])
  })
})

const categories = [
  { id: 'food', name: 'Hrana', default_necessity: 'needed' as const, archived: false },
  { id: 'snacks', name: 'Brza hrana i grickalice', default_necessity: 'unneeded' as const, archived: false },
  { id: 'old', name: 'Lična higijena', default_necessity: 'needed' as const, archived: true },
]

describe('suggestMapping', () => {
  it('matches by name, then by first word, otherwise suggests a new category', () => {
    expect(
      suggestMapping(['hrana', 'Brza hrana, grickalice, slatkiši', 'Licna higijena', 'Putovanja'], categories),
    ).toEqual({
      hrana: { kind: 'existing', categoryId: 'food' },
      'Brza hrana, grickalice, slatkiši': { kind: 'existing', categoryId: 'snacks' },
      'Licna higijena': { kind: 'existing', categoryId: 'old' },
      Putovanja: { kind: 'new' },
    })
  })
})

describe('buildImportPlan', () => {
  const parsed = parseWorkbook(
    workbook(
      [
        [AUG_2, 'Hrana', 'Hleb', 80, 'Potrebno'],
        [AUG_2, 'Grickalice', 'Čips', 145.5, ''],
        [AUG_31, 'Grickalice', 'Smoki', 100, 'Bespotrebno'],
        [AUG_31, 'Grickalice', 'Kokice', 0.5, 'Bespotrebno'],
        [AUG_31, TRANSFER, '', 1000, ''],
        [SEP_30, 'Hrana', 'Voda', 69.99, ''],
      ],
      {
        year: 2026,
        months: Array.from({ length: 12 }, (_, index): Row =>
          index === 7 ? ['Avgust', { v: 3000, f: 'SUM(1000.1, 1999.9)' }, 0, 500] : ['', null, 0, null],
        ),
      },
    ),
  )

  it('lists Excel categories in order of first use', () => {
    expect(excelCategories(parsed)).toEqual([
      { name: 'Hrana', count: 2 },
      { name: 'Grickalice', count: 3 },
    ])
  })

  it('resolves categories and fills necessity from the category default', () => {
    const plan = buildImportPlan(
      parsed,
      { Hrana: { kind: 'existing', categoryId: 'food' }, Grickalice: { kind: 'new' } },
      categories,
      texts,
    )
    expect(plan.categories).toEqual([
      { key: 'Grickalice', name: 'Grickalice', emoji: '📦', color: '#9e9e9e', default_necessity: 'unneeded' },
    ])
    expect(plan.expenses.map((e) => [e.category_id, e.category_key, e.necessity])).toEqual([
      ['food', null, 'needed'],
      [null, 'Grickalice', 'unneeded'],
      [null, 'Grickalice', 'unneeded'],
      [null, 'Grickalice', 'unneeded'],
      ['food', null, 'needed'],
    ])
    expect(plan.incomes).toEqual([
      { date: '2026-08-01', amount: 1000.1, source: 'Prihod (uvoz)' },
      { date: '2026-08-01', amount: 1999.9, source: 'Prihod (uvoz)' },
    ])
    expect(plan.savings).toEqual([{ date: '2026-08-01', amount: 500, note: 'Štednja (uvoz)' }])
  })

  it('summarises every month exactly', () => {
    const plan = buildImportPlan(parsed, { Grickalice: { kind: 'existing', categoryId: 'snacks' } }, categories, texts)
    expect(plan.categories).toEqual([{ key: 'Hrana', name: 'Hrana', emoji: '📦', color: '#9e9e9e', default_necessity: 'needed' }])
    expect(plan.months).toEqual([
      { month: '2026-08-01', expenseCount: 4, spent: 326, incomeCount: 2, income: 3000, saved: 500, carryIn: null },
      { month: '2026-09-01', expenseCount: 1, spent: 69.99, incomeCount: 0, income: 0, saved: 0, carryIn: 1000 },
    ])
    expect(plan.total).toEqual({ expenseCount: 5, spent: 395.99, incomeCount: 2, income: 3000, saved: 500 })
  })
})
