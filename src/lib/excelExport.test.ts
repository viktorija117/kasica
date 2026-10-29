import * as xlsx from 'xlsx'
import { describe, expect, it } from 'vitest'
import { yearOverview } from './budget'
import { dateKeyToExcelSerial, exportSheets, toWorkbook, type ExportInput } from './excelExport'

const categories = [
  { id: 'cat-1', name: 'Hrana' },
  { id: 'cat-2', name: 'Stara kategorija' },
]
const members = [
  { user_id: 'user-me', display_name: 'Ja' },
  { user_id: 'user-partner', display_name: 'Partner' },
]

function input(): ExportInput {
  const expenses = [
    { date: '2026-09-10', category_id: 'cat-1', description: 'Maxi', amount: 1234.5, necessity: 'needed' as const, paid_by: 'user-partner', created_by: 'user-me', note: null },
    { date: '2026-10-02', category_id: 'cat-2', description: '', amount: 500, necessity: 'unneeded' as const, paid_by: null, created_by: 'user-me', note: 'keš' },
  ]
  const overview = yearOverview({
    year: 2026,
    totals: [
      { month: '2026-09-01', income: 100000, spent: 1234.5, saved: 10000, entries: 3 },
      { month: '2026-10-01', income: 0, spent: 500, saved: -2000, entries: 2 },
    ],
    settings: [],
    categoryTotals: [
      { month: '2026-09-01', category_id: 'cat-1', spent: 1234.5, unneeded: 0 },
      { month: '2026-10-01', category_id: 'cat-2', spent: 500, unneeded: 500 },
    ],
    categories,
    today: '2026-10-28',
  })
  return {
    expenses,
    incomes: [{ date: '2026-09-01', source: 'Plata', amount: 100000, received_by: 'user-me', note: null }],
    savings: [
      { date: '2026-09-20', amount: 10000, note: null },
      { date: '2026-10-15', amount: -2000, note: 'podigli' },
    ],
    overview,
    categories,
    members,
  }
}

describe('exportSheets', () => {
  it('makes the four sheets in order', () => {
    expect(exportSheets(input()).map((sheet) => sheet.name)).toEqual([
      'Troškovi',
      'Prihodi',
      'Štednja',
      'Pregled po mesecima',
    ])
  })

  it('writes expenses with category, necessity and member names', () => {
    const [expenses] = exportSheets(input())
    expect(expenses.rows[0][0]).toBe('Datum')
    expect(expenses.rows.slice(1)).toEqual([
      [{ date: '2026-09-10' }, 'Hrana', 'Maxi', { amount: 1234.5 }, 'Potrebno', 'Partner', 'Ja', null],
      [{ date: '2026-10-02' }, 'Stara kategorija', null, { amount: 500 }, 'Bespotrebno', null, 'Ja', 'keš'],
    ])
  })

  it('keeps withdrawals negative in Štednja', () => {
    const [, , savings] = exportSheets(input())
    expect(savings.rows.slice(1).map((row) => row[1])).toEqual([{ amount: 10000 }, { amount: -2000 }])
  })

  it('shows every month with data, the carry chain and a UKUPNO row', () => {
    const months = exportSheets(input())[3]
    expect(months.rows[0]).toEqual([
      'Mesec', 'Preneto', 'Prihodi', 'Početno stanje', 'Potrošeno', 'Ušteđeno', 'Preostalo', 'Hrana', 'Stara kategorija',
    ])
    expect(months.rows.slice(1).map((row) => row[0])).toEqual(['Septembar 2026', 'Oktobar 2026', 'UKUPNO'])
    // September's remaining is carried into October.
    expect(months.rows[1].slice(1)).toEqual([
      { amount: 0 }, { amount: 100000 }, { amount: 100000 }, { amount: 1234.5 }, { amount: 10000 }, { amount: 88765.5 },
      { amount: 1234.5 }, { amount: 0 },
    ])
    expect(months.rows[2].slice(1, 7)).toEqual([
      { amount: 88765.5 }, { amount: 0 }, { amount: 88765.5 }, { amount: 500 }, { amount: -2000 }, { amount: 90265.5 },
    ])
    expect(months.rows[3].slice(1)).toEqual([
      { amount: 0 }, { amount: 100000 }, { amount: 100000 }, { amount: 1734.5 }, { amount: 8000 }, { amount: 90265.5 },
      { amount: 1234.5 }, { amount: 500 },
    ])
  })
})

describe('toWorkbook', () => {
  it('writes real dates and numbers that survive a save and reopen', () => {
    const workbook = toWorkbook(xlsx, exportSheets(input()))
    const reopened = xlsx.read(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array', cellNF: true })

    expect(reopened.SheetNames).toEqual(['Troškovi', 'Prihodi', 'Štednja', 'Pregled po mesecima'])
    const expenses = reopened.Sheets['Troškovi']
    expect(expenses.A2).toMatchObject({ t: 'n', v: dateKeyToExcelSerial('2026-09-10'), z: 'dd.mm.yyyy' })
    expect(expenses.D2).toMatchObject({ t: 'n', v: 1234.5, z: '#,##0.00' })
    expect(expenses.D3).toMatchObject({ t: 'n', v: 500, z: '#,##0' })
    expect(expenses.H2).toBeUndefined()
    expect(expenses['!ref']).toBe('A1:H3')
  })
})

describe('dateKeyToExcelSerial', () => {
  it('counts days the way Excel does', () => {
    expect(dateKeyToExcelSerial('2026-08-02')).toBe(46236)
    expect(dateKeyToExcelSerial('1900-03-01')).toBe(61)
  })
})
