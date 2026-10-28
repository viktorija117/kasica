import type { Category } from '../data/categories'
import {
  applyOrder,
  categoryToForm,
  moveId,
  newCategoryForm,
  nextSort,
  validateCategoryForm,
  type CategoryFormState,
} from './categoryForm'

function category(patch: Partial<Category>): Category {
  return {
    id: 'cat-1',
    household_id: 'hh-1',
    name: 'Hrana',
    emoji: '🛒',
    color: '#43a047',
    sort: 1,
    monthly_limit: null,
    default_necessity: 'needed',
    archived: false,
    import_batch: null,
    created_at: '2026-10-27T10:00:00Z',
    ...patch,
  }
}

const form = (patch: Partial<CategoryFormState>): CategoryFormState => ({
  name: 'Brza hrana',
  emoji: '🍟',
  color: '#FB8C00',
  limitText: '',
  necessity: 'unneeded',
  ...patch,
})

describe('category form', () => {
  it('turns a filled form into a category without a limit', () => {
    expect(validateCategoryForm(form({ name: '  Brza   hrana ' }), ['Hrana'])).toEqual({
      ok: true,
      input: {
        name: 'Brza hrana',
        emoji: '🍟',
        color: '#fb8c00',
        monthly_limit: null,
        default_necessity: 'unneeded',
      },
    })
  })

  it('reads the limit in both number styles', () => {
    const result = validateCategoryForm(form({ limitText: '15.000' }), [])
    expect(result.ok && result.input.monthly_limit).toBe(15000)
    const decimals = validateCategoryForm(form({ limitText: '1234,5' }), [])
    expect(decimals.ok && decimals.input.monthly_limit).toBe(1234.5)
  })

  it('rejects an empty name, a taken name, no emoji, a bad colour and a bad limit', () => {
    expect(validateCategoryForm(form({ name: '  ' }), [])).toEqual({ ok: false, errors: ['name'] })
    expect(validateCategoryForm(form({ name: 'hrana' }), ['Hrana'])).toEqual({ ok: false, errors: ['duplicate'] })
    expect(validateCategoryForm(form({ name: 'x'.repeat(61) }), [])).toEqual({ ok: false, errors: ['name'] })
    expect(validateCategoryForm(form({ emoji: ' ', color: 'red', limitText: '0' }), [])).toEqual({
      ok: false,
      errors: ['emoji', 'color', 'limit'],
    })
    expect(validateCategoryForm(form({ limitText: 'abc' }), [])).toEqual({ ok: false, errors: ['limit'] })
  })

  it('fills the editor from a category and back without changes', () => {
    const fast = category({ name: 'Brza hrana', emoji: '🍟', color: '#fb8c00', monthly_limit: 15000, default_necessity: 'unneeded' })
    const state = categoryToForm(fast)
    expect(state.limitText).toBe('15000')
    expect(validateCategoryForm(state, [])).toEqual({
      ok: true,
      input: { name: 'Brza hrana', emoji: '🍟', color: '#fb8c00', monthly_limit: 15000, default_necessity: 'unneeded' },
    })
  })

  it('gives a new category a colour nobody uses yet', () => {
    expect(newCategoryForm([{ color: '#43A047' }, { color: '#fb8c00' }]).color).toBe('#546e7a')
    expect(newCategoryForm([]).color).toBe('#43a047')
  })
})

describe('category order', () => {
  it('puts a new category last', () => {
    expect(nextSort([{ sort: 3 }, { sort: 16 }, { sort: 1 }])).toBe(17)
    expect(nextSort([])).toBe(1)
  })

  it('moves an id one place up or down and stops at the ends', () => {
    expect(moveId(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveId(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
  })

  it('applies a new order and keeps the others after it', () => {
    const list = [category({ id: 'a', sort: 1 }), category({ id: 'b', sort: 2 }), category({ id: 'z', sort: 9, archived: true })]
    expect(applyOrder(list, ['b', 'a']).map((c) => [c.id, c.sort])).toEqual([
      ['b', 1],
      ['a', 2],
      ['z', 9],
    ])
  })
})
