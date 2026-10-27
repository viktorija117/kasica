import type { Income } from '../data/incomes'
import type { Saving } from '../data/savings'
import {
  incomeToForm,
  newIncomeForm,
  newSavingForm,
  parseCarryOverride,
  savingToForm,
  validateIncomeForm,
  validateSavingForm,
} from './entryForms'

describe('income form', () => {
  it('turns a filled form into the row to save', () => {
    const state = { ...newIncomeForm('2026-10-01', 'user-me'), amountText: '70.000', source: '  Plata  ', note: ' ' }
    expect(validateIncomeForm(state)).toEqual({
      ok: true,
      input: { amount: 70000, source: 'Plata', date: '2026-10-01', received_by: 'user-me', note: null },
    })
  })

  it('needs an amount above zero and a source', () => {
    const result = validateIncomeForm({ ...newIncomeForm('2026-10-01', null), amountText: '0' })
    expect(result).toEqual({ ok: false, errors: ['amount', 'source'] })
  })

  it('round-trips an existing income', () => {
    const income = {
      id: 'inc-1',
      amount: 32970.5,
      source: 'Honorar',
      date: '2026-10-05',
      received_by: null,
      note: 'oktobar',
    } as Income
    expect(incomeToForm(income)).toMatchObject({ amountText: '32970,5', source: 'Honorar', note: 'oktobar' })
    expect(validateIncomeForm(incomeToForm(income))).toMatchObject({ ok: true, input: { amount: 32970.5 } })
  })
})

describe('savings form', () => {
  it('stores a deposit as a positive amount', () => {
    const state = { ...newSavingForm('2026-10-27'), amountText: '10000' }
    expect(validateSavingForm(state)).toEqual({
      ok: true,
      input: { amount: 10000, date: '2026-10-27', note: null },
    })
  })

  it('stores a withdrawal as a negative amount', () => {
    const state = { ...newSavingForm('2026-10-27'), kind: 'withdrawal' as const, amountText: '2.500,50' }
    expect(validateSavingForm(state)).toMatchObject({ ok: true, input: { amount: -2500.5 } })
  })

  it('shows a withdrawal as a positive amount with the withdrawal switch on', () => {
    const saving = { id: 's-1', amount: -3000, date: '2026-10-02', note: null } as Saving
    expect(savingToForm(saving)).toEqual({ kind: 'withdrawal', amountText: '3000', date: '2026-10-02', note: '' })
  })

  it('rejects a missing amount', () => {
    expect(validateSavingForm(newSavingForm('2026-10-27'))).toEqual({ ok: false, errors: ['amount'] })
  })
})

describe('parseCarryOverride', () => {
  it('accepts zero and positive amounts', () => {
    expect(parseCarryOverride('0')).toBe(0)
    expect(parseCarryOverride('10.396')).toBe(10396)
    expect(parseCarryOverride('36132,5')).toBe(36132.5)
  })

  it('rejects empty and invalid input', () => {
    expect(parseCarryOverride('')).toBeNull()
    expect(parseCarryOverride('abc')).toBeNull()
    expect(parseCarryOverride('-5')).toBeNull()
  })
})
