import type { Category } from '../data/categories'
import type { ExpenseInput, ExpenseSuggestion, Necessity } from '../data/expenses'
import { sumAmounts } from './budget'
import type { DateKey } from './dates'
import { amountToText, MAX_AMOUNT, parseAmount } from './money'
import type { ParsedReceipt } from './receipt'
import { findSimilarSuggestion } from './suggestions'

/**
 * Where a line's category or necessity came from. 'receipt' follows the category of the whole
 * receipt; 'suggested' (a similar past expense, or the line's own category for its necessity)
 * does not; 'manual' is never replaced.
 */
export type ChoiceSource = 'suggested' | 'receipt' | 'manual'

export type ReviewLine = {
  key: string
  name: string
  amountText: string
  categoryId: string | null
  categorySource: ChoiceSource
  necessity: Necessity
  necessitySource: ChoiceSource
  /** Left out of the save ("Izbaci"); can be brought back. */
  removed: boolean
  /** Ticked for merging. */
  marked: boolean
  /** Quantity and unit price as printed on the receipt; null for a merged line. */
  printed: { quantity: number; unitPrice: number } | null
  /** The receipt lines a merged line was made of, so it can be split again. Empty otherwise. */
  parts: ReviewLine[]
}

export type ReceiptReviewState = {
  store: string
  date: DateKey
  paidBy: string | null
  /** Category for the whole receipt, used by every line that has no better suggestion. */
  categoryId: string | null
  lines: ReviewLine[]
}

type CategoryChoice = Pick<Category, 'id' | 'default_necessity'>
type Suggestion = Pick<ExpenseSuggestion, 'description' | 'category_id' | 'necessity' | 'uses' | 'last_date'>

export type ReceiptReviewAction =
  | { type: 'store'; value: string }
  | { type: 'date'; value: DateKey }
  | { type: 'paidBy'; value: string | null }
  | { type: 'receiptCategory'; category: CategoryChoice }
  | { type: 'lineName'; key: string; value: string }
  | { type: 'lineAmount'; key: string; value: string }
  | { type: 'lineCategory'; key: string; category: CategoryChoice }
  | { type: 'lineNecessity'; key: string; value: Necessity }
  | { type: 'toggleRemoved'; key: string }
  | { type: 'toggleMarked'; key: string }
  | { type: 'mergeMarked' }
  | { type: 'split'; key: string }

/**
 * The review screen's starting point. Each item gets the category and necessity of the latest
 * expense with a similar description; the rest wait for the category of the whole receipt.
 */
export function newReceiptReview(
  receipt: ParsedReceipt,
  options: {
    today: DateKey
    paidBy: string | null
    suggestions: readonly Suggestion[]
    /** Categories that can still be picked; suggestions pointing elsewhere are ignored. */
    activeCategoryIds: ReadonlySet<string>
  },
): ReceiptReviewState {
  const usable = options.suggestions.filter((suggestion) => options.activeCategoryIds.has(suggestion.category_id))
  return {
    store: receipt.store,
    date: receipt.date ?? options.today,
    paidBy: options.paidBy,
    categoryId: null,
    lines: receipt.items.map((item, index) => {
      const known = findSimilarSuggestion(usable, item.name)
      return {
        key: `item-${index}`,
        name: item.name,
        amountText: amountToText(item.total),
        categoryId: known?.category_id ?? null,
        categorySource: known ? 'suggested' : 'receipt',
        necessity: known?.necessity ?? 'needed',
        necessitySource: known ? 'suggested' : 'receipt',
        removed: false,
        marked: false,
        printed: { quantity: item.quantity, unitPrice: item.unitPrice },
        parts: [],
      }
    }),
  }
}

function lineAmount(line: ReviewLine): number | null {
  const amount = parseAmount(line.amountText)
  return amount !== null && amount > 0 && amount <= MAX_AMOUNT ? amount : null
}

function mergeLines(lines: ReviewLine[]): ReviewLine {
  const [first] = lines
  const parts = lines.flatMap((line) => (line.parts.length > 0 ? line.parts : [line]))
  return {
    ...first,
    key: parts.map((part) => part.key).join('+'),
    amountText: amountToText(sumAmounts(lines.map((line) => ({ amount: lineAmount(line) ?? 0 })))),
    marked: false,
    printed: null,
    parts: parts.map((part) => ({ ...part, marked: false })),
  }
}

function updateLine(state: ReceiptReviewState, key: string, update: (line: ReviewLine) => ReviewLine) {
  return { ...state, lines: state.lines.map((line) => (line.key === key ? update(line) : line)) }
}

export function receiptReviewReducer(
  state: ReceiptReviewState,
  action: ReceiptReviewAction,
): ReceiptReviewState {
  switch (action.type) {
    case 'store':
      return { ...state, store: action.value }
    case 'date':
      return { ...state, date: action.value }
    case 'paidBy':
      return { ...state, paidBy: action.value }
    case 'receiptCategory': {
      const { id, default_necessity } = action.category
      return {
        ...state,
        categoryId: id,
        lines: state.lines.map((line) => ({
          ...line,
          categoryId: line.categorySource === 'receipt' ? id : line.categoryId,
          necessity: line.necessitySource === 'receipt' ? default_necessity : line.necessity,
        })),
      }
    }
    case 'lineName':
      return updateLine(state, action.key, (line) => ({ ...line, name: action.value }))
    case 'lineAmount':
      return updateLine(state, action.key, (line) => ({ ...line, amountText: action.value }))
    case 'lineCategory':
      return updateLine(state, action.key, (line) => ({
        ...line,
        categoryId: action.category.id,
        categorySource: 'manual',
        ...(line.necessitySource === 'manual'
          ? {}
          : { necessity: action.category.default_necessity, necessitySource: 'suggested' as const }),
      }))
    case 'lineNecessity':
      return updateLine(state, action.key, (line) => ({
        ...line,
        necessity: action.value,
        necessitySource: 'manual',
      }))
    case 'toggleRemoved':
      return updateLine(state, action.key, (line) => ({ ...line, removed: !line.removed, marked: false }))
    case 'toggleMarked':
      return updateLine(state, action.key, (line) => ({ ...line, marked: !line.marked }))
    case 'mergeMarked': {
      const marked = state.lines.filter((line) => line.marked && !line.removed)
      if (marked.length < 2) return state
      const merged = mergeLines(marked)
      const lines: ReviewLine[] = []
      for (const line of state.lines) {
        if (line === marked[0]) lines.push(merged)
        else if (!marked.includes(line)) lines.push(line)
      }
      return { ...state, lines }
    }
    case 'split':
      return {
        ...state,
        lines: state.lines.flatMap((line) =>
          line.key === action.key && line.parts.length > 0 ? line.parts : [line],
        ),
      }
  }
}

/** Lines that will be saved. */
export function keptLines(state: ReceiptReviewState): ReviewLine[] {
  return state.lines.filter((line) => !line.removed)
}

/** Amounts of the kept lines, for the sum at the bottom (unreadable amounts count as 0). */
export function keptAmounts(state: ReceiptReviewState): { amount: number }[] {
  return keptLines(state).map((line) => ({ amount: lineAmount(line) ?? 0 }))
}

export function markedCount(state: ReceiptReviewState): number {
  return state.lines.filter((line) => line.marked && !line.removed).length
}

export type ReviewLineError = 'amount' | 'category'

export type ReceiptReviewResult =
  | { ok: true; expenses: ExpenseInput[] }
  | {
      ok: false
      date: boolean
      /** Nothing left to save. */
      empty: boolean
      lines: Record<string, ReviewLineError[]>
    }

/** Checks the review and turns every kept line into an expense of the receipt's date. */
export function validateReceiptReview(state: ReceiptReviewState): ReceiptReviewResult {
  const date = !/^\d{4}-\d{2}-\d{2}$/.test(state.date)
  const kept = keptLines(state)
  const lines: Record<string, ReviewLineError[]> = {}
  const expenses: ExpenseInput[] = []

  for (const line of kept) {
    const amount = lineAmount(line)
    const errors: ReviewLineError[] = []
    if (amount === null) errors.push('amount')
    if (!line.categoryId) errors.push('category')
    if (errors.length > 0 || amount === null || !line.categoryId) {
      lines[line.key] = errors
      continue
    }
    expenses.push({
      date: state.date,
      category_id: line.categoryId,
      description: line.name.trim().replace(/\s+/g, ' ').slice(0, 200),
      amount,
      necessity: line.necessity,
      paid_by: state.paidBy,
      note: null,
    })
  }

  const empty = kept.length === 0
  if (date || empty || Object.keys(lines).length > 0) return { ok: false, date, empty, lines }
  return { ok: true, expenses }
}
