import {
  balanceChain,
  compareWithPrevious,
  groupByDay,
  monthBalance,
  monthSummary,
  monthTotalsOf,
  sumAmounts,
  sumByCategory,
  sumByDay,
  withMonthTotals,
  type CarrySetting,
  type MonthTotals,
} from './budget'

function totals(month: string, income: number, spent: number, saved = 0, entries = 1): MonthTotals {
  return { month, income, spent, saved, entries }
}

function setting(month: string, patch: Partial<CarrySetting>): CarrySetting {
  return { month, carry_enabled: true, carry_override: null, ...patch }
}

function expense(date: string, amount: number, necessity: 'needed' | 'unneeded' = 'needed') {
  return { date, amount, necessity, category_id: 'cat-1' }
}

describe('sumAmounts', () => {
  it('is 0 for no items', () => {
    expect(sumAmounts([])).toBe(0)
  })

  it('adds decimals exactly', () => {
    expect(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3)
    expect(sumAmounts([{ amount: 69.99 }, { amount: 129.99 }, { amount: 0.02 }])).toBe(200)
  })

  it('handles large household totals', () => {
    const items = Array.from({ length: 200 }, () => ({ amount: 1234.56 }))
    expect(sumAmounts(items)).toBe(246912)
  })
})

describe('groupByDay', () => {
  const rows = [
    { id: 'a', date: '2026-10-25', amount: 100 },
    { id: 'b', date: '2026-10-27', amount: 69.99 },
    { id: 'c', date: '2026-10-25', amount: 50.5 },
    { id: 'd', date: '2026-10-27', amount: 0.01 },
    { id: 'e', date: '2026-10-01', amount: 7000 },
  ]

  it('orders days newest first with a total per day', () => {
    expect(groupByDay(rows).map(({ date, total }) => [date, total])).toEqual([
      ['2026-10-27', 70],
      ['2026-10-25', 150.5],
      ['2026-10-01', 7000],
    ])
  })

  it('keeps the input order within a day', () => {
    const [today, earlier] = groupByDay(rows)
    expect(today.items.map((row) => row.id)).toEqual(['b', 'd'])
    expect(earlier.items.map((row) => row.id)).toEqual(['a', 'c'])
  })

  it('returns nothing for no rows', () => {
    expect(groupByDay([])).toEqual([])
  })

  it('day totals add up to the month total', () => {
    const dayTotals = groupByDay(rows).map(({ total }) => ({ amount: total }))
    expect(sumAmounts(dayTotals)).toBe(sumAmounts(rows))
  })
})

describe('carry-over chain', () => {
  it('has no carry in the first month with data', () => {
    const balance = monthBalance([totals('2026-08-01', 300000, 190000, 75000)], [], '2026-08-01')
    expect(balance).toMatchObject({
      carryIn: 0,
      autoCarry: 0,
      income: 300000,
      opening: 300000,
      spent: 190000,
      saved: 75000,
      remaining: 35000,
      hasData: true,
    })
  })

  it('carries the remaining through several months automatically', () => {
    const rows = [
      totals('2026-08-01', 100000, 60000, 10000), // remaining 30.000
      totals('2026-09-01', 50000, 70000), // opening 80.000, remaining 10.000
      totals('2026-10-01', 40000, 20000.5), // opening 50.000, remaining 29.999,50
    ]
    const chain = balanceChain(rows, [], '2026-10-01')
    expect(chain.map((month) => [month.month, month.carryIn, month.opening, month.remaining])).toEqual([
      ['2026-08-01', 0, 100000, 30000],
      ['2026-09-01', 30000, 80000, 10000],
      ['2026-10-01', 10000, 50000, 29999.5],
    ])
  })

  it('uses the carry set by hand and continues the chain from it', () => {
    const rows = [totals('2026-08-01', 302817, 190521, 75200), totals('2026-09-01', 222460, 196724, 36132)]
    const settings = [setting('2026-09-01', { carry_override: 10396 })]
    const [, september, october] = balanceChain(rows, settings, '2026-10-01')
    expect(september).toMatchObject({
      autoCarry: 37096,
      carryIn: 10396,
      carryOverridden: true,
      opening: 232856,
      remaining: 0,
    })
    expect(october).toMatchObject({ carryIn: 0, opening: 0 })
  })

  it('carries nothing when carry is disabled, but still knows the automatic value', () => {
    const rows = [totals('2026-09-01', 50000, 30000), totals('2026-10-01', 40000, 10000)]
    const balance = monthBalance(rows, [setting('2026-10-01', { carry_enabled: false })], '2026-10-01')
    expect(balance).toMatchObject({ carryEnabled: false, autoCarry: 20000, carryIn: 0, opening: 40000 })
  })

  it('a carry set by hand wins even when carry is disabled', () => {
    const rows = [totals('2026-09-01', 50000, 30000), totals('2026-10-01', 40000, 10000)]
    const settings = [setting('2026-10-01', { carry_enabled: false, carry_override: 5000 })]
    expect(monthBalance(rows, settings, '2026-10-01')).toMatchObject({ carryIn: 5000, opening: 45000 })
  })

  it('a carry set by hand counts as data, even in a month with no entries', () => {
    const settings = [setting('2026-08-01', { carry_override: 12000 })]
    const [august, september] = balanceChain([], settings, '2026-09-01')
    expect(august).toMatchObject({ hasData: true, opening: 12000, remaining: 12000 })
    expect(september).toMatchObject({ carryIn: 12000 })
  })

  it('a month without any data breaks the chain', () => {
    const rows = [totals('2026-07-01', 50000, 20000), totals('2026-09-01', 10000, 5000)]
    const [july, august, september, october] = balanceChain(rows, [], '2026-10-01')
    expect(july.remaining).toBe(30000)
    expect(august).toMatchObject({ hasData: false, carryIn: 30000, opening: 30000, remaining: 30000 })
    expect(september).toMatchObject({ autoCarry: 0, carryIn: 0, opening: 10000 })
    expect(october).toMatchObject({ carryIn: 5000 })
  })

  it('an empty month with no history is all zeros', () => {
    expect(monthBalance([], [], '2026-10-01')).toEqual({
      month: '2026-10-01',
      autoCarry: 0,
      carryIn: 0,
      carryEnabled: true,
      carryOverridden: false,
      income: 0,
      opening: 0,
      spent: 0,
      saved: 0,
      remaining: 0,
      hasData: false,
    })
  })

  it('ignores months after the one asked for', () => {
    const rows = [totals('2026-10-01', 1000, 0), totals('2026-11-01', 99999, 0)]
    expect(balanceChain(rows, [], '2026-10-01').map((month) => month.month)).toEqual(['2026-10-01'])
  })

  it('carries a negative remaining (overspent month) into the next one', () => {
    const rows = [totals('2026-09-01', 10000, 12500)]
    expect(monthBalance(rows, [], '2026-10-01')).toMatchObject({ carryIn: -2500, opening: -2500 })
  })

  it('a withdrawal from savings adds to the remaining', () => {
    const balance = monthBalance([totals('2026-10-01', 10000, 5000, -3000)], [], '2026-10-01')
    expect(balance).toMatchObject({ saved: -3000, remaining: 8000 })
  })

  it('a deposit and a withdrawal that cancel out still count as data', () => {
    const rows = [totals('2026-09-01', 0, 0, 0, 2)]
    const settings = [setting('2026-09-01', { carry_override: 7000 })]
    expect(monthBalance(rows, settings, '2026-10-01')).toMatchObject({ carryIn: 7000 })
  })

  it('works across the end of the year', () => {
    const rows = [totals('2026-12-01', 1000, 400)]
    expect(monthBalance(rows, [], '2027-01-01')).toMatchObject({ carryIn: 600 })
  })

  it('sums decimals exactly', () => {
    const balance = monthBalance([totals('2026-10-01', 0.3, 0.1, 0.1)], [], '2026-10-01')
    expect(balance.remaining).toBe(0.1)
  })
})

describe('monthTotalsOf / withMonthTotals', () => {
  it('sums the lists of a month and replaces that month only', () => {
    const live = monthTotalsOf('2026-10-01', {
      incomes: [{ amount: 1000 }],
      expenses: [{ amount: 69.99 }, { amount: 0.01 }],
      savings: [],
    })
    expect(live).toEqual({ month: '2026-10-01', income: 1000, spent: 70, saved: 0, entries: 3 })
    const rows = withMonthTotals([totals('2026-09-01', 5, 0), totals('2026-10-01', 1, 1)], live)
    expect(rows).toEqual([totals('2026-09-01', 5, 0), live])
  })

  it('an emptied month has no data', () => {
    const live = monthTotalsOf('2026-10-01', { incomes: [], expenses: [], savings: [] })
    expect(monthBalance([live], [], '2026-10-01').hasData).toBe(false)
  })
})

describe('monthSummary', () => {
  const balanceFor = (month: string, income: number, spent: number) =>
    monthBalance([totals(month, income, spent)], [], month)

  it('current month: averages over the days so far and splits the rest over the days left', () => {
    const expenses = [
      expense('2026-10-01', 20000),
      expense('2026-10-27', 1500, 'unneeded'),
      expense('2026-10-27', 1500),
    ]
    const summary = monthSummary(balanceFor('2026-10-01', 100000, 23000), expenses, '2026-10-27')
    expect(summary).toMatchObject({
      phase: 'current',
      daysInMonth: 31,
      daysElapsed: 27,
      // 27, 28, 29, 30, 31
      daysLeft: 5,
      usedPct: 0.23,
      avgPerDay: 851.85,
      dailyAllowance: 15400,
      unneeded: 1500,
      unneededPct: 1500 / 23000,
      spentToday: 3000,
      purchases: 3,
    })
  })

  it('current month on its last day leaves one day', () => {
    const summary = monthSummary(balanceFor('2026-10-01', 1000, 0), [], '2026-10-31')
    expect(summary).toMatchObject({ daysElapsed: 31, daysLeft: 1, dailyAllowance: 1000 })
  })

  it('past month: averages over every day of the month and has no allowance', () => {
    const summary = monthSummary(balanceFor('2026-09-01', 100000, 60000), [expense('2026-09-10', 60000)], '2026-10-27')
    expect(summary).toMatchObject({
      phase: 'past',
      daysInMonth: 30,
      daysElapsed: 30,
      daysLeft: null,
      avgPerDay: 2000,
      dailyAllowance: null,
      spentToday: null,
    })
  })

  it('leap year February has 29 days', () => {
    const summary = monthSummary(balanceFor('2028-02-01', 0, 2900), [expense('2028-02-29', 2900)], '2028-03-05')
    expect(summary).toMatchObject({ daysInMonth: 29, avgPerDay: 100 })
    const regular = monthSummary(balanceFor('2027-02-01', 0, 2800), [expense('2027-02-28', 2800)], '2027-03-05')
    expect(regular).toMatchObject({ daysInMonth: 28, avgPerDay: 100 })
  })

  it('leap day as today in the current month', () => {
    const summary = monthSummary(balanceFor('2028-02-01', 2900, 0), [], '2028-02-29')
    expect(summary).toMatchObject({ daysElapsed: 29, daysLeft: 1, dailyAllowance: 2900 })
  })

  it('empty month: every ratio is 0, never NaN', () => {
    const summary = monthSummary(monthBalance([], [], '2026-10-01'), [], '2026-10-27')
    expect(summary).toMatchObject({
      usedPct: 0,
      avgPerDay: 0,
      dailyAllowance: 0,
      unneededPct: 0,
      spentToday: 0,
      purchases: 0,
    })
  })

  it('future month has no days elapsed yet', () => {
    const summary = monthSummary(balanceFor('2026-11-01', 1000, 0), [], '2026-10-27')
    expect(summary).toMatchObject({ phase: 'future', daysElapsed: 0, avgPerDay: 0, dailyAllowance: null })
  })

  it('overspent: used more than 100% and a negative allowance', () => {
    const summary = monthSummary(balanceFor('2026-10-01', 1000, 1500), [expense('2026-10-02', 1500)], '2026-10-27')
    expect(summary.usedPct).toBe(1.5)
    expect(summary.dailyAllowance).toBe(-100)
  })
})

describe('compareWithPrevious', () => {
  const october = [expense('2026-10-05', 1000), expense('2026-10-27', 500), expense('2026-10-30', 9999)]
  const september = [expense('2026-09-03', 2000), expense('2026-09-27', 100), expense('2026-09-28', 5000)]

  it('current month compares only the same days of the previous month', () => {
    expect(compareWithPrevious('2026-10-01', october, september, '2026-10-27')).toEqual({
      current: 1500,
      previous: 2100,
      diff: -600,
      diffPct: -600 / 2100,
      throughDay: 27,
    })
  })

  it('past month compares whole months', () => {
    expect(compareWithPrevious('2026-10-01', october, september, '2026-11-02')).toMatchObject({
      current: 11499,
      previous: 7100,
      diff: 4399,
      throughDay: null,
    })
  })

  it('on the 31st the shorter previous month is compared in full', () => {
    const result = compareWithPrevious('2026-10-01', october, september, '2026-10-31')
    expect(result).toMatchObject({ current: 11499, previous: 7100 })
  })

  it('has no percentage when the previous month spent nothing', () => {
    expect(compareWithPrevious('2026-10-01', october, [], '2026-10-27')).toMatchObject({
      previous: 0,
      diff: 1500,
      diffPct: null,
    })
  })
})

describe('sumByCategory', () => {
  it('sums per category, biggest first, and adds up to the total', () => {
    const rows = [
      { category_id: 'food', amount: 100.5 },
      { category_id: 'bills', amount: 5000 },
      { category_id: 'food', amount: 0.5 },
      { category_id: 'fun', amount: 101 },
    ]
    const result = sumByCategory(rows)
    expect(result.map(({ categoryId, total }) => [categoryId, total])).toEqual([
      ['bills', 5000],
      ['food', 101],
      ['fun', 101],
    ])
    expect(sumAmounts(result.map(({ total }) => ({ amount: total })))).toBe(sumAmounts(rows))
    expect(result.reduce((all, row) => all + row.share, 0)).toBeCloseTo(1)
  })

  it('returns nothing for no expenses', () => {
    expect(sumByCategory([])).toEqual([])
  })
})

describe('sumByDay', () => {
  it('has every day of the month with 0 for days without spending', () => {
    const days = sumByDay([expense('2026-02-03', 10), expense('2026-02-03', 0.5), expense('2026-03-01', 7)], '2026-02-01')
    expect(days).toHaveLength(28)
    expect(days[0]).toEqual({ date: '2026-02-01', total: 0 })
    expect(days[2]).toEqual({ date: '2026-02-03', total: 10.5 })
    expect(days[27]).toEqual({ date: '2026-02-28', total: 0 })
  })
})
