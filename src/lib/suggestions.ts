import type { ExpenseSuggestion } from '../data/expenses'
import { searchKey } from './text'

type Suggestion = Pick<ExpenseSuggestion, 'description' | 'uses' | 'last_date'>

/** The history entry with exactly this description (ignoring case and diacritics), if any. */
export function findExactSuggestion<T extends Suggestion>(
  suggestions: readonly T[],
  typed: string,
): T | undefined {
  const query = searchKey(typed)
  return query ? suggestions.find((suggestion) => searchKey(suggestion.description) === query) : undefined
}

/**
 * Descriptions from the household's history that match what is being typed.
 * Descriptions that start with the text come first, then ones where a later word starts
 * with it, then any other match; within each group the most used, then most recent, win.
 * Nothing is suggested for an empty field or when the text already matches exactly.
 */
export function matchSuggestions<T extends Suggestion>(
  suggestions: readonly T[],
  typed: string,
  limit = 5,
): T[] {
  const query = searchKey(typed)
  if (!query) return []

  const ranked: { suggestion: T; rank: number }[] = []
  for (const suggestion of suggestions) {
    const key = searchKey(suggestion.description)
    if (key === query) return []
    const rank = key.startsWith(query) ? 0 : key.includes(` ${query}`) ? 1 : key.includes(query) ? 2 : -1
    if (rank >= 0) ranked.push({ suggestion, rank })
  }

  return ranked
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.suggestion.uses - a.suggestion.uses ||
        b.suggestion.last_date.localeCompare(a.suggestion.last_date),
    )
    .slice(0, limit)
    .map(({ suggestion }) => suggestion)
}
