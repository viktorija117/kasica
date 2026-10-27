import { useState } from 'react'
import type { ImportBatch } from '../data/imports'
import { useImportBatches, useUndoImport } from '../hooks/useImport'
import { useToast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import { timestampLabel } from '../lib/dates'
import { Button } from './Button'
import { ConfirmSheet } from './ConfirmSheet'
import { QueryStatus } from './QueryStatus'

/** Earlier imports, each with "Poništi uvoz". */
export function ImportHistory() {
  const batches = useImportBatches()
  const undo = useUndoImport()
  const showToast = useToast()
  const [confirming, setConfirming] = useState<ImportBatch | null>(null)

  if (!batches.data) return <QueryStatus error={batches.error} />
  if (batches.data.length === 0) return <p className="text-sm text-text-muted">{sr.import.historyEmpty}</p>

  const onConfirm = () => {
    if (!confirming) return
    undo.mutate(confirming.id, {
      onSuccess: () => showToast({ message: sr.import.undone }),
      onError: () => showToast({ message: sr.import.undoFailed, tone: 'error' }),
      onSettled: () => setConfirming(null),
    })
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {batches.data.map((batch) => (
          <li key={batch.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{batch.file_name}</p>
              <p className="text-xs text-text-muted">{timestampLabel(batch.created_at)}</p>
            </div>
            <Button variant="secondary" className="h-10 shrink-0 px-3 text-sm" onClick={() => setConfirming(batch)}>
              {sr.import.undo}
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmSheet
        open={confirming !== null}
        title={sr.import.undoTitle}
        text={confirming ? sr.import.undoText(confirming.file_name) : ''}
        confirmLabel={sr.import.undo}
        cancelLabel={sr.import.undoCancel}
        loading={undo.isPending}
        onConfirm={onConfirm}
        onClose={() => setConfirming(null)}
      />
    </>
  )
}
