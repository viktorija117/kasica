import { useEffect, useRef, useState, type FormEvent } from 'react'
import { warmUpFiscalReceipt } from '../data/receipts'
import { useQrScanner, type CameraStatus } from '../hooks/useQrScanner'
import { sr } from '../i18n/sr'
import { normalizeReceiptUrl } from '../lib/receipt'
import { Button } from './Button'
import { FormMessage } from './FormMessage'
import { TextField } from './TextField'

type Props = {
  onUrl: (url: string) => void
  onManual: () => void
}

const cameraText: Record<CameraStatus, string> = {
  starting: sr.receipt.cameraStarting,
  scanning: sr.receipt.scanHint,
  denied: sr.receipt.cameraDenied,
  unavailable: sr.receipt.cameraUnavailable,
}

/** Camera view that reads the receipt's QR code, plus a field for pasting the link (laptop). */
export function ReceiptScanner({ onUrl, onManual }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [wrongCode, setWrongCode] = useState(false)
  const [pasted, setPasted] = useState('')
  const [pasteError, setPasteError] = useState(false)

  useEffect(warmUpFiscalReceipt, [])

  const status = useQrScanner(videoRef, (text) => {
    const url = normalizeReceiptUrl(text)
    if (url) onUrl(url)
    else setWrongCode(true)
  })
  const cameraOff = status === 'denied' || status === 'unavailable'

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const url = normalizeReceiptUrl(pasted)
    if (url) onUrl(url)
    else setPasteError(true)
  }

  return (
    <div className="flex flex-col gap-5">
      {!cameraOff && (
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-black">
          <video
            ref={videoRef}
            aria-label={sr.receipt.cameraView}
            muted
            playsInline
            className="size-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
        </div>
      )}
      <p role="status" className="text-sm text-text-muted">
        {wrongCode && !cameraOff ? sr.receipt.notReceiptQr : cameraText[status]}
      </p>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-2">
        <TextField
          label={sr.receipt.pasteLabel}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={sr.receipt.pastePlaceholder}
          value={pasted}
          onChange={(event) => {
            setPasted(event.target.value)
            setPasteError(false)
          }}
        />
        {pasteError && <FormMessage tone="error">{sr.receipt.pasteInvalid}</FormMessage>}
        <Button type="submit" variant={cameraOff ? 'primary' : 'secondary'} disabled={pasted.trim() === ''}>
          {sr.receipt.pasteSubmit}
        </Button>
      </form>

      <button
        type="button"
        onClick={onManual}
        className="self-center text-sm font-medium text-primary hover:underline"
      >
        {sr.receipt.manual}
      </button>
    </div>
  )
}
