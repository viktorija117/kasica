import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import { CloseIcon } from './icons'

export const TOAST_DURATION_MS = 5000

type Shown = Toast & { key: number }

/** Shows one toast at a time above the bottom navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null)
  // The live toast, read by event handlers and the unmount cleanup.
  const current = useRef<Shown | null>(null)
  const nextKey = useRef(0)

  const close = useCallback((runExpire: boolean) => {
    const closing = current.current
    current.current = null
    setToast(null)
    if (runExpire) closing?.onExpire?.()
  }, [])

  const show = useCallback(
    (next: Toast) => {
      close(true)
      nextKey.current += 1
      const shown = { ...next, key: nextKey.current }
      current.current = shown
      setToast(shown)
    },
    [close],
  )

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => close(true), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast, close])

  // Pending work (like a delete waiting for "Poništi") must not be lost when the user
  // leaves the app, so it is finished as soon as the page is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') close(true)
    }
    const onPageHide = () => close(true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      current.current?.onExpire?.()
      current.current = null
    }
  }, [close])

  const onAction = () => {
    const action = current.current?.action
    close(false)
    action?.onClick()
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.key}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md animate-fade-in items-center gap-2 rounded-2xl py-2 pr-2 pl-4 shadow-lg ${
              toast.tone === 'error' ? 'bg-danger text-on-primary' : 'bg-text text-bg'
            }`}
          >
            <span className="min-w-0 flex-1 text-sm">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={onAction}
                className="h-10 rounded-xl px-3 text-sm font-bold uppercase tracking-wide text-primary-soft transition hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => close(true)}
              aria-label={sr.toast.dismiss}
              className="grid size-10 shrink-0 place-items-center rounded-xl opacity-70 transition hover:bg-white/10 hover:opacity-100"
            >
              <CloseIcon width="18" height="18" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
