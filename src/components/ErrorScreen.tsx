import { sr } from '../i18n/sr'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'

type Props = {
  error: unknown
  onRetry: () => void
}

export function ErrorScreen({ error, onRetry }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span aria-hidden="true" className="text-4xl">
          😕
        </span>
        <p role="alert">{errorMessage(error)}</p>
        <Button onClick={onRetry}>{sr.errors.retry}</Button>
      </div>
    </div>
  )
}
