import {
  savingsBalance,
  balanceChain,
  categoryBreakdown,
  compareWithPrevious,
  foldDiscounts,
  limitStatus,
  groupByDay,
  monthBalance,
  monthSummary,
  monthTotalsOf,
  receiptBalance,
  sameAmount,
  splitByNecessity,
  sumAmounts,
  sumByCategory,
  sumByDay,
  sumByMonth,
  sumByPayer,
  topCategory,
  withMonthTotals,
  yearChartData,
  yearOverview,
  type CarrySetting,
  type CategoryMonthTotals,
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

describe('savingsBalance', () => {
  const totals = [
    { month: '2026-08-01', income: 0, spent: 0, saved: 10000.1, entries: 1 },
    { month: '2026-09-01', income: 0, spent: 0, saved: -2500.2, entries: 1 },
    { month: '2026-10-01', income: 0, spent: 0, saved: 15000, entries: 2 },
  ]

  it('adds the opening balance and every saving up to the month', () => {
    expect(savingsBalance(50000, totals, '2026-10-01')).toEqual({ total: 72499.9, month: 15000 })
  })

  it('ignores later months, and a withdrawal shows as a negative month', () => {
    expect(savingsBalance(0, totals, '2026-09-01')).toEqual({ total: 7499.9, month: -2500.2 })
  })

  it('is just the opening balance before any saving, and 0 for a month without one', () => {
    expect(savingsBalance(1234.5, totals, '2026-07-01')).toEqual({ total: 1234.5, month: 0 })
    expect(savingsBalance(0, totals, '2026-11-01')).toEqual({ total: 22499.9, month: 0 })
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

describe('sumByMonth', () => {
  it('counts and sums entries per month, oldest first', () => {
    const rows = [expense('2026-09-30', 0.1), expense('2026-08-01', 5), expense('2026-09-01', 0.2)]
    expect(sumByMonth(rows)).toEqual([
      { month: '2026-08-01', count: 1, total: 5 },
      { month: '2026-09-01', count: 2, total: 0.3 },
    ])
  })

  it('returns nothing for no entries', () => {
    expect(sumByMonth([])).toEqual([])
  })
})

describe('sameAmount', () => {
  it('compares to the para', () => {
    expect(sameAmount(0.1 + 0.2, 0.3)).toBe(true)
    expect(sameAmount(10396, 10396.01)).toBe(false)
  })
})

describe('limitStatus', () => {
  it('is none without a limit', () => {
    expect(limitStatus(5000, null)).toBe('none')
  })

  it('warns from 80% and is over only above 100%', () => {
    expect(limitStatus(11999.99, 15000)).toBe('ok')
    expect(limitStatus(12000, 15000)).toBe('warning')
    expect(limitStatus(15000, 15000)).toBe('warning')
    expect(limitStatus(15000.01, 15000)).toBe('over')
  })
})

describe('categoryBreakdown', () => {
  const categories = [
    { id: 'food', monthly_limit: null, archived: false },
    { id: 'fast', monthly_limit: 15000, archived: false },
    { id: 'old', monthly_limit: null, archived: true },
    { id: 'trips', monthly_limit: 50000, archived: false },
    { id: 'gone', monthly_limit: 1000, archived: true },
  ]
  const rows = [
    { amount: 69.99, category_id: 'food' },
    { amount: 12500.01, category_id: 'fast' },
    { amount: 1200.5, category_id: 'old' },
    { amount: 0.01, category_id: 'missing' },
    { amount: 3000, category_id: 'food' },
  ]

  it('adds up exactly to the spending of the month, archived and unknown categories included', () => {
    const breakdown = categoryBreakdown(rows, categories)
    expect(sumAmounts(breakdown.map((row) => ({ amount: row.total })))).toBe(sumAmounts(rows))
    expect(breakdown.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 10)
  })

  it('shows spending against the limit with its status', () => {
    const [fast] = categoryBreakdown(rows, categories)
    expect(fast).toMatchObject({ categoryId: 'fast', total: 12500.01, limit: 15000, status: 'warning' })
    expect(fast.limitUsed).toBeCloseTo(0.8333, 4)
  })

  it('keeps archived categories that have spending and unknown ones without a category', () => {
    const breakdown = categoryBreakdown(rows, categories)
    expect(breakdown.find((row) => row.categoryId === 'old')?.category?.archived).toBe(true)
    expect(breakdown.find((row) => row.categoryId === 'missing')?.category).toBeUndefined()
  })

  it('lists active categories with a limit but no spending last, archived ones not at all', () => {
    const breakdown = categoryBreakdown(rows, categories)
    expect(breakdown.map((row) => row.categoryId)).toEqual(['fast', 'food', 'old', 'missing', 'trips'])
    expect(breakdown.at(-1)).toMatchObject({ total: 0, share: 0, limitUsed: 0, status: 'ok' })
  })

  it('is empty for an empty month without limits', () => {
    expect(categoryBreakdown([], [{ id: 'food', monthly_limit: null, archived: false }])).toEqual([])
  })
})

describe('topCategory', () => {
  it('is the biggest category', () => {
    expect(topCategory(sumByCategory([{ amount: 5, category_id: 'a' }, { amount: 9, category_id: 'b' }]))).toMatchObject({
      categoryId: 'b',
      total: 9,
    })
  })

  it('is null when nothing was spent', () => {
    expect(topCategory([])).toBeNull()
    expect(
      topCategory(categoryBreakdown([], [{ id: 'a', monthly_limit: 100, archived: false }])),
    ).toBeNull()
  })
})

describe('splitByNecessity', () => {
  it('splits spending into needed and unneeded', () => {
    const split = splitByNecessity([
      expense('2026-10-01', 600.1),
      expense('2026-10-02', 199.95, 'unneeded'),
      expense('2026-10-03', 199.95, 'unneeded'),
    ])
    expect(split).toEqual({ needed: 600.1, unneeded: 399.9, neededShare: 0.6001, unneededShare: 0.3999 })
  })

  it('is all zeros without expenses', () => {
    expect(splitByNecessity([])).toEqual({ needed: 0, unneeded: 0, neededShare: 0, unneededShare: 0 })
  })
})

describe('sumByPayer', () => {
  it('lists members in order, then former members, then expenses without a payer', () => {
    const rows = [
      { amount: 100.5, paid_by: 'partner' },
      { amount: 50, paid_by: null },
      { amount: 49.5, paid_by: 'former' },
      { amount: 300, paid_by: 'partner' },
    ]
    const payers = sumByPayer(rows, ['me', 'partner'])
    expect(payers.map(({ payerId, total }) => [payerId, total])).toEqual([
      ['me', 0],
      ['partner', 400.5],
      ['former', 49.5],
      [null, 50],
    ])
    expect(sumAmounts(payers.map((row) => ({ amount: row.total })))).toBe(sumAmounts(rows))
    expect(payers[1].share).toBeCloseTo(0.801, 10)
  })

  it('shows members with 0 for an empty month', () => {
    expect(sumByPayer([], ['me'])).toEqual([{ payerId: 'me', total: 0, share: 0 }])
  })
})

describe('yearOverview', () => {
  const categories = [
    { id: 'hrana', archived: false },
    { id: 'higijena', archived: true },
    { id: 'brza', archived: false },
  ]

  function cat(month: string, category_id: string, spent: number, unneeded = 0): CategoryMonthTotals {
    return { month, category_id, spent, unneeded }
  }

  // Dec 2025: 10.000 left. 2026: Jan, Feb and Oct have entries, today is 27 Oct 2026.
  const input = {
    year: 2026,
    today: '2026-10-27',
    categories,
    settings: [] as CarrySetting[],
    totals: [
      totals('2025-12-01', 50000, 40000),
      totals('2026-01-01', 100000, 60000.5, 10000),
      totals('2026-02-01', 100000, 80000, -5000),
      totals('2026-10-01', 90000, 30000),
    ],
    categoryTotals: [
      cat('2025-12-01', 'hrana', 40000),
      cat('2026-01-01', 'hrana', 50000.25),
      cat('2026-01-01', 'higijena', 10000.25, 10000.25),
      cat('2026-02-01', 'brza', 30000, 30000),
      cat('2026-02-01', 'hrana', 50000),
      cat('2026-10-01', 'higijena', 30000),
    ],
  }

  it('gives all 12 months with the same carry chain as Home', () => {
    const overview = yearOverview(input)
    expect(overview.months.map((m) => m.month)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-01`),
    )
    const [jan, feb, mar] = overview.months
    expect(jan.balance).toEqual(monthBalance(input.totals, [], '2026-01-01'))
    expect(jan.balance.carryIn).toBe(10000)
    expect(jan.balance.remaining).toBe(39999.5)
    expect(feb.balance.remaining).toBe(39999.5 + 100000 - 80000 + 5000)
    // March has no entries but carries February's remaining, so it is shown.
    expect(mar.shown).toBe(true)
    expect(mar.balance.opening).toBe(feb.balance.remaining)
    expect(overview.months[9].balance).toEqual(monthBalance(input.totals, [], '2026-10-01'))
  })

  it('hides future months without entries', () => {
    const overview = yearOverview(input)
    expect(overview.months[9].shown).toBe(true)
    expect(overview.months[10].shown).toBe(false)
    expect(overview.months[11].shown).toBe(false)
  })

  it('hides months before the first data and keeps them at zero', () => {
    const overview = yearOverview({ ...input, year: 2025 })
    expect(overview.months[0].shown).toBe(false)
    expect(overview.months[0].balance.opening).toBe(0)
    expect(overview.months[11].shown).toBe(true)
    expect(overview.total.remaining).toBe(10000)
  })

  it('has a column for every category with spending, archived included, in category order', () => {
    const overview = yearOverview(input)
    expect(overview.categories.map((c) => c.categoryId)).toEqual(['hrana', 'higijena', 'brza'])
    expect(overview.categories[1].category).toBe(categories[1])
    expect(overview.categories.map((c) => c.total)).toEqual([100000.25, 40000.25, 30000])
  })

  it('cells of a month add up to its spending and the columns to the year total', () => {
    const overview = yearOverview(input)
    for (const month of overview.months) {
      expect(sumAmounts(month.cells.map((cell) => ({ amount: cell.total })))).toBe(month.balance.spent)
    }
    expect(sumAmounts(overview.categories.map((c) => ({ amount: c.total })))).toBe(overview.total.spent)
  })

  it('colours each cell against the biggest month of its category', () => {
    const [jan, , , , , , , , , oct] = yearOverview(input).months
    expect(jan.cells[1].intensity).toBeCloseTo(10000.25 / 30000)
    expect(oct.cells[1].intensity).toBe(1)
    expect(oct.cells[0]).toEqual({ categoryId: 'hrana', total: 0, intensity: 0 })
  })

  it('finds the top category of each month', () => {
    const overview = yearOverview(input)
    expect(overview.months[1].top?.categoryId).toBe('hrana')
    expect(overview.months[2].top).toBeNull()
  })

  it('sums the year: totals, average over months with spending, top month and category, unneeded', () => {
    const overview = yearOverview(input)
    expect(overview.total).toEqual({
      opening: 10000 + 290000,
      income: 290000,
      spent: 170000.5,
      saved: 5000,
      remaining: overview.months[9].balance.remaining,
    })
    // Only Jan, Feb and Oct have expenses.
    expect(overview.avgMonthlySpent).toBe(56666.83)
    expect(overview.monthsWithSpending).toBe(3)
    expect(overview.topMonth).toEqual({ month: '2026-02-01', spent: 80000 })
    expect(overview.topCategory?.categoryId).toBe('hrana')
    expect(overview.unneeded).toBe(40000.25)
    expect(overview.unneededPct).toBeCloseTo(40000.25 / 170000.5)
  })

  it('a carry set by hand mid-year wins, like on Home', () => {
    const settings = [setting('2026-02-01', { carry_override: 1000 })]
    const overview = yearOverview({ ...input, settings })
    expect(overview.months[1].balance.carryIn).toBe(1000)
    expect(overview.months[1].balance).toEqual(monthBalance(input.totals, settings, '2026-02-01'))
  })

  it('is empty for a year without data', () => {
    const overview = yearOverview({ ...input, year: 2030 })
    expect(overview.months.every((m) => !m.shown)).toBe(true)
    expect(overview.hasData).toBe(false)
    expect(overview.categories).toEqual([])
    expect(overview.avgMonthlySpent).toBeNull()
    expect(overview.topMonth).toBeNull()
    expect(overview.topCategory).toBeNull()
    expect(overview.unneededPct).toBe(0)
  })

  it('gives the chart income, spending and savings per month', () => {
    const points = yearChartData(yearOverview(input))
    expect(points).toHaveLength(12)
    expect(points[1]).toEqual({ month: '2026-02-01', income: 100000, spent: 80000, saved: -5000 })
  })
})

describe('foldDiscounts', () => {
  const line = (name: string, total: number) => ({ name, total })

  it('takes a discount off the item above it', () => {
    expect(foldDiscounts([line('Milka', 219.99), line('Popust', -20), line('Hleb', 89.99)])).toEqual([
      line('Milka', 199.99),
      line('Hleb', 89.99),
    ])
  })

  it('takes a discount at the top off the first item below it', () => {
    expect(foldDiscounts([line('Popust', -0.1), line('Voda', 0.3)])).toEqual([line('Voda', 0.2)])
  })

  it('keeps the sum and drops lines that end at zero', () => {
    const lines = [line('Kesa', 5), line('Kesa gratis', -5), line('Banane', 87.03), line('Uzorak', 0)]
    const folded = foldDiscounts(lines)
    expect(folded).toEqual([line('Banane', 87.03)])
    expect(sumAmounts(folded.map(({ total }) => ({ amount: total })))).toBe(87.03)
  })
})

describe('receiptBalance', () => {
  it('compares the chosen items with the receipt total', () => {
    expect(receiptBalance([{ amount: 0.1 }, { amount: 0.2 }], 0.3)).toEqual({ selected: 0.3, difference: 0 })
    expect(receiptBalance([{ amount: 179.98 }], 1716.99)).toEqual({ selected: 179.98, difference: -1537.01 })
    expect(receiptBalance([], null)).toEqual({ selected: 0, difference: null })
  })
})
