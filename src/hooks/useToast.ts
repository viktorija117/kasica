import { createContext, useContext } from 'react'

export type Toast = {
  message: string
  /** Button shown next to the message, e.g. "Poništi". */
  action?: { label: string; onClick: () => void }
  /**
   * Runs once when the toast goes away without its action being used: after the timeout,
   * when it is dismissed, replaced by another toast, or the app is hidden or closed.
   */
  onExpire?: () => void
  tone?: 'info' | 'error'
}

export type ShowToast = (toast: Toast) => void

export const ToastContext = createContext<ShowToast>(() => {
  throw new Error('useToast used outside of ToastProvider')
})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
