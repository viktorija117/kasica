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

/** Words of a description, without sizes and amounts: "Hleb beli 500g" → ["hleb", "beli"]. */
function words(text: string): string[] {
  return searchKey(text)
    .split(/[^\p{L}\d]+/u)
    .filter((word) => word.length >= 2 && !/\d/.test(word))
}

/**
 * The history entry most like a receipt item's name, so its category and necessity can be
 * suggested: the same description, else the one sharing the most leading words with it
 * ("Hleb" for "Hleb beli 500g"), the most recent winning a tie. Nothing when not even the
 * first word (3 letters or more) is the same.
 */
export function findSimilarSuggestion<T extends Suggestion>(
  suggestions: readonly T[],
  name: string,
): T | undefined {
  const exact = findExactSuggestion(suggestions, name)
  if (exact) return exact

  const itemWords = words(name)
  if (itemWords.length === 0 || itemWords[0].length < 3) return undefined

  let best: { suggestion: T; shared: number } | undefined
  for (const suggestion of suggestions) {
    const known = words(suggestion.description)
    let shared = 0
    while (shared < Math.min(known.length, itemWords.length) && known[shared] === itemWords[shared]) shared++
    if (shared === 0) continue
    if (
      !best ||
      shared > best.shared ||
      (shared === best.shared && suggestion.last_date > best.suggestion.last_date)
    ) {
      best = { suggestion, shared }
    }
  }
  return best?.suggestion
}
