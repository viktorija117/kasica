import type { MatcherFunction } from '@testing-library/react'

/**
 * Finds an `<Amount>` by its full text, e.g. `amountText('1.234 RSD')`: the number and the
 * currency are separate elements, so a plain text match does not see them together.
 */
export function amountText(text: string): MatcherFunction {
  return (_, element) =>
    !!element?.classList.contains('amount') && element.textContent?.replace(/\s+/g, ' ') === text
}
