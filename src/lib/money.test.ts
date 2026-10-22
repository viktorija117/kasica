import { formatAmount, formatRSD, parseAmount } from './money'

const NBSP = '\u00a0'

describe('formatRSD', () => {
  it.each([
    [1234, `1.234${NBSP}RSD`],
    [0, `0${NBSP}RSD`],
    [999, `999${NBSP}RSD`],
    [1000000, `1.000.000${NBSP}RSD`],
    [69.99, `69,99${NBSP}RSD`],
    [1234.5, `1.234,50${NBSP}RSD`],
    [-500, `-500${NBSP}RSD`],
  ])('%s → %s', (amount, expected) => {
    expect(formatRSD(amount)).toBe(expected)
  })

  it('hides decimals that round to zero', () => {
    expect(formatAmount(10.001)).toBe('10')
    expect(formatAmount(0.1 + 0.2)).toBe('0,30')
  })

  it('never shows negative zero', () => {
    expect(formatAmount(-0)).toBe('0')
    expect(formatAmount(-0.001)).toBe('0')
  })
})

describe('parseAmount', () => {
  it.each([
    ['1.234,50', 1234.5],
    ['1234.5', 1234.5],
    ['1234', 1234],
    ['1234,5', 1234.5],
    ['69,99', 69.99],
    ['69.99', 69.99],
    ['1.234', 1234],
    ['12.345', 12345],
    ['1.234.567', 1234567],
    ['1.234.567,89', 1234567.89],
    ['1,234.50', 1234.5],
    ['1,234,567', 1234567],
    ['1 234', 1234],
    ['1 234,50 RSD', 1234.5],
    ['  250  ', 250],
    ['0,5', 0.5],
    [',5', 0.5],
    ['12,', 12],
    ['1.5', 1.5],
    ['-300', -300],
    ['0', 0],
  ])('"%s" → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '12a', '1,2,3', '1.23.4', '1,234,5', '1.234,567', '1,999', '12,345', '0.500', '.', ',', 'RSD', '--5', '1e5'])(
    '"%s" → null',
    (input) => {
      expect(parseAmount(input)).toBeNull()
    },
  )
})
