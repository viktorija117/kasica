import { useSession } from '../hooks/useAuth'
import { useSuggestions } from '../hooks/useExpenses'
import { useCategories, useMembers } from '../hooks/useHousehold'
import { useFiscalReceipt, useSavedReceipt } from '../hooks/useReceipts'
import { sr } from '../i18n/sr'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'
import { FormMessage } from './FormMessage'
import { QueryStatus } from './QueryStatus'
import { ReceiptReviewForm } from './ReceiptReviewForm'

type Props = {
  url: string
  onScanAgain: () => void
  onManual: () => void
}

/** Fetches the scanned receipt and everything the review needs, then shows the review. */
export function ReceiptLoader({ url, onScanAgain, onManual }: Props) {
  const userId = useSession().user.id
  const receipt = useFiscalReceipt(url)
  const saved = useSavedReceipt(url)
  const categories = useCategories()
  const members = useMembers()
  const suggestions = useSuggestions()

  if (receipt.error) {
    return (
      <div className="flex flex-col gap-3">
        <FormMessage tone="error">{errorMessage(receipt.error)}</FormMessage>
        <Button onClick={onScanAgain}>{sr.receipt.scanAgain}</Button>
        <Button variant="secondary" onClick={onManual}>
          {sr.receipt.manual}
        </Button>
      </div>
    )
  }
  if (!receipt.data) {
    return (
      <p role="status" className="text-sm text-text-muted">
        {sr.receipt.loading}
      </p>
    )
  }
  // Suggestions only improve the starting categories, so a failed request does not block.
  if (!categories.data || !members.data || saved.isPending || suggestions.isPending) {
    return <QueryStatus error={categories.error ?? members.error} />
  }

  return (
    <ReceiptReviewForm
      url={url}
      receipt={receipt.data}
      saved={saved.data ?? null}
      categories={categories.data}
      members={members.data}
      suggestions={suggestions.data ?? []}
      currentUserId={userId}
      onScanAgain={onScanAgain}
    />
  )
}
