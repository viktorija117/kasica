import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

type Props = {
  open: boolean
  title: string
  text: string
  confirmLabel: string
  cancelLabel: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** In-app confirmation for destructive actions (never `window.confirm`). */
export function ConfirmSheet({ open, title, text, confirmLabel, cancelLabel, loading, onConfirm, onClose }: Props) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-text-muted">{text}</p>
      <div className="flex flex-col gap-2">
        <Button onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </BottomSheet>
  )
}
