import { sr } from '../i18n/sr'
import { errorMessage } from '../lib/errors'

/** Placeholder text while a section's query is loading or after it failed. */
export function QueryStatus({ error }: { error: unknown }) {
  return (
    <p role={error ? 'alert' : 'status'} className="text-sm text-text-muted">
      {error ? errorMessage(error) : sr.loading}
    </p>
  )
}
