import { useEffect, useState } from 'react'
import { sr } from '../i18n/sr'
import { Button } from './Button'

type CopyState = 'idle' | 'copied' | 'failed'

const COPIED_RESET_MS = 2000

export function InviteCode({ code }: { code: string }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">{sr.settings.inviteHint}</p>
      <div className="flex items-center gap-3">
        <code className="flex-1 rounded-2xl bg-surface-muted px-4 py-3 text-center font-mono text-xl font-semibold tracking-[0.25em] select-all">
          {code}
        </code>
        <Button variant="secondary" onClick={() => void copy()} aria-live="polite">
          {state === 'copied' ? `✓ ${sr.settings.copied}` : sr.settings.copy}
        </Button>
      </div>
      {state === 'failed' && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {sr.settings.copyFailed}
        </p>
      )}
    </div>
  )
}
