import { groupByDay, sumAmounts } from './budget'

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
