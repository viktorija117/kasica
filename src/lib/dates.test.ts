import {
  currentMonthKey,
  dayLabel,
  dayOfMonth,
  daysInMonth,
  defaultDateFor,
  endOfMonthKey,
  monthKeyFromParam,
  monthOfDate,
  todayKey,
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

describe('day keys', () => {
  it('uses the local calendar day, not UTC', () => {
    expect(todayKey(new Date(2026, 9, 27, 23, 59))).toBe('2026-10-27')
    expect(todayKey(new Date(2026, 9, 28, 0, 1))).toBe('2026-10-28')
  })

  it('finds the month of a day and the last day of a month', () => {
    expect(monthOfDate('2026-10-27')).toBe('2026-10-01')
    expect(endOfMonthKey('2026-10-01')).toBe('2026-10-31')
    expect(endOfMonthKey('2026-02-01')).toBe('2026-02-28')
    expect(endOfMonthKey('2028-02-01')).toBe('2028-02-29')
  })

  it('counts the days of a month, leap years included', () => {
    expect(daysInMonth('2026-10-01')).toBe(31)
    expect(daysInMonth('2026-09-01')).toBe(30)
    expect(daysInMonth('2026-02-01')).toBe(28)
    expect(daysInMonth('2028-02-01')).toBe(29)
    expect(dayOfMonth('2026-10-07')).toBe(7)
  })

  it('starts new entries today, or on the 1st of another month being viewed', () => {
    const now = new Date(2026, 9, 27, 10, 0)
    expect(defaultDateFor('2026-10-01', now)).toBe('2026-10-27')
    expect(defaultDateFor('2026-09-01', now)).toBe('2026-09-01')
  })

  it('labels days in Serbian', () => {
    const now = new Date(2026, 9, 27, 10, 0)
    expect(dayLabel('2026-10-27', now)).toBe('Danas')
    expect(dayLabel('2026-10-26', now)).toBe('Juče')
    expect(dayLabel('2026-10-25', now)).toBe('Nedelja, 25. oktobar')
    expect(dayLabel('2025-12-31', now)).toBe('Sreda, 31. decembar 2025.')
  })
})
