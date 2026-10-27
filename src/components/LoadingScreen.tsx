import { sr } from '../i18n/sr'

export function LoadingScreen() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <span aria-hidden="true" className="animate-pulse text-4xl">
          🐷
        </span>
        <span className="text-sm">{sr.loading}</span>
      </div>
    </div>
  )
}
