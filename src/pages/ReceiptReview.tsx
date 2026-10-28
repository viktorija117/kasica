import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronLeftIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { ReceiptLoader } from '../components/ReceiptLoader'
import { ReceiptScanner } from '../components/ReceiptScanner'
import { useExpenseSheet } from '../hooks/useExpenseSheet'
import { sr } from '../i18n/sr'

/** Scan a fiscal receipt's QR code (or paste its link), then review and save its items. */
export function ReceiptReview() {
  const [url, setUrl] = useState<string | null>(null)
  const navigate = useNavigate()
  const openExpenseSheet = useExpenseSheet()

  const enterManually = () => {
    navigate('/')
    openExpenseSheet({ mode: 'add' })
  }

  return (
    <>
      <Link
        to="/"
        className="mb-2 -ml-2 inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ChevronLeftIcon className="size-4" />
        {sr.receipt.back}
      </Link>
      <PageTitle>{sr.receipt.title}</PageTitle>

      {url ? (
        <ReceiptLoader key={url} url={url} onScanAgain={() => setUrl(null)} onManual={enterManually} />
      ) : (
        <ReceiptScanner onUrl={setUrl} onManual={enterManually} />
      )}
    </>
  )
}
