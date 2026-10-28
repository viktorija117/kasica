// State and validation of the category editor, and the order of categories.
import type { Category, CategoryInput } from '../data/categories'
import type { Necessity } from '../data/expenses'
import { amountToText, MAX_AMOUNT, parseAmount } from './money'

/** Colours offered in the editor (the ones the starting categories use). */
export const CATEGORY_COLORS = [
  '#43a047',
  '#fb8c00',
  '#546e7a',
  '#d81b60',
  '#3949ab',
  '#e53935',
  '#00acc1',
  '#8d6e63',
  '#8e24aa',
  '#039be5',
  '#5e35b1',
  '#00897b',
  '#9e9d24',
  '#757575',
] as const

/** Emojis offered in the editor; any other can be typed. */
export const CATEGORY_EMOJIS = [
  '🛒', '🍟', '🧾', '🎉', '🚗', '💊', '🧴', '🏠', '👕', '👟', '✈️', '🎁',
  '📺', '📱', '📄', '📦', '🐶', '👶', '🏋️', '☕', '🍺', '⛽', '💇', '📚',
] as const

export type CategoryFormState = {
  name: string
  emoji: string
  color: string
  limitText: string
  necessity: Necessity
}

export type CategoryFormError = 'name' | 'duplicate' | 'emoji' | 'color' | 'limit'

export type CategoryFormResult =
  | { ok: true; input: CategoryInput }
  | { ok: false; errors: CategoryFormError[] }

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/** A new category gets the first offered colour no other category uses yet. */
export function newCategoryForm(existing: readonly Pick<Category, 'color'>[]): CategoryFormState {
  const used = new Set(existing.map((category) => category.color.toLowerCase()))
  const color = CATEGORY_COLORS.find((candidate) => !used.has(candidate)) ?? CATEGORY_COLORS[0]
  return { name: '', emoji: '📦', color, limitText: '', necessity: 'needed' }
}

export function categoryToForm(category: Category): CategoryFormState {
  return {
    name: category.name,
    emoji: category.emoji,
    color: category.color,
    limitText: category.monthly_limit === null ? '' : amountToText(category.monthly_limit),
    necessity: category.default_necessity,
  }
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Checks the editor. `otherNames` are the names of the household's other categories: two
 * categories with the same name could not be told apart in the picker.
 */
export function validateCategoryForm(
  state: CategoryFormState,
  otherNames: readonly string[],
): CategoryFormResult {
  const errors: CategoryFormError[] = []
  const name = cleanName(state.name)
  if (name === '' || name.length > 60) errors.push('name')
  else if (otherNames.some((other) => cleanName(other).toLocaleLowerCase('sr') === name.toLocaleLowerCase('sr'))) {
    errors.push('duplicate')
  }

  const emoji = state.emoji.trim()
  if (emoji === '' || emoji.length > 16) errors.push('emoji')
  if (!COLOR_PATTERN.test(state.color)) errors.push('color')

  let limit: number | null = null
  if (state.limitText.trim() !== '') {
    limit = parseAmount(state.limitText)
    if (limit === null || limit <= 0 || limit > MAX_AMOUNT) errors.push('limit')
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    input: {
      name,
      emoji,
      color: state.color.toLowerCase(),
      monthly_limit: limit,
      default_necessity: state.necessity,
    },
  }
}

/** Sort value that puts a new category after all others. */
export function nextSort(categories: readonly Pick<Category, 'sort'>[]): number {
  return categories.reduce((max, category) => Math.max(max, category.sort), 0) + 1
}

/** `ids` with `id` moved one place up (-1) or down (1); unchanged at either end. */
export function moveId(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const from = ids.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= ids.length) return [...ids]
  const next = [...ids]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/**
 * `categories` re-sorted so the ones in `ids` come first, in that order and with sort 1, 2, …,
 * followed by the rest (archived) in their old order. Mirrors `reorder_categories` in the DB.
 */
export function applyOrder<C extends Pick<Category, 'id' | 'sort'>>(categories: readonly C[], ids: readonly string[]): C[] {
  const position = new Map(ids.map((id, index) => [id, index + 1]))
  return categories
    .map((category) => {
      const sort = position.get(category.id)
      return sort === undefined ? category : { ...category, sort }
    })
    .sort((a, b) => a.sort - b.sort)
}
