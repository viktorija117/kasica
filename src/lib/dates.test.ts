import {
  currentMonthKey,
  monthKeyFromParam,
  monthKeyToParam,
  monthLabel,
  shiftMonth,
  toMonthKey,
} from './dates'

describe('month keys', () => {
  it('uses the local calendar day, not UTC', () => {
    // 31 Oct 23:30 local time is still October.
    expect(toMonthKey(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-01')
    expect(currentMonthKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01')
    expect(shiftMonth('2026-10-01', 0)).toBe('2026-10-01')
  })

  it('formats Serbian month names', () => {
    expect(monthLabel('2026-10-01')).toBe('Oktobar 2026')
    expect(monthLabel('2027-01-01')).toBe('Januar 2027')
  })

  it('round-trips through the URL param', () => {
    expect(monthKeyToParam('2026-10-01')).toBe('2026-10')
    expect(monthKeyFromParam('2026-10')).toBe('2026-10-01')
  })

  it.each([null, '', '2026', '2026-13', '2026-00', '26-10', '2026-10-01', 'abc'])(
    'rejects invalid param %s',
    (param) => {
      expect(monthKeyFromParam(param)).toBeNull()
    },
  )
})
