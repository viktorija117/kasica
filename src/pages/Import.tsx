import { useState } from 'react'
import { Link } from 'react-router'
import { FormMessage } from '../components/FormMessage'
import { ImportFilePicker } from '../components/ImportFilePicker'
import { ImportHistory } from '../components/ImportHistory'
import { ImportReview } from '../components/ImportReview'
import { ChevronLeftIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { QueryStatus } from '../components/QueryStatus'
import { SettingsSection } from '../components/SettingsSection'
import { useCategories } from '../hooks/useHousehold'
import { sr } from '../i18n/sr'
import {
  ImportFileError,
  readWorkbookFile,
  type ImportFileErrorReason,
  type ParsedWorkbook,
} from '../lib/excelImport'

type FileState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'error'; reason: ImportFileErrorReason }
  | { status: 'ready'; id: number; fileName: string; parsed: ParsedWorkbook }

export function Import() {
  const [file, setFile] = useState<FileState>({ status: 'idle' })
  const categories = useCategories()

  const onPick = async (picked: File) => {
    setFile({ status: 'reading' })
    try {
      const parsed = await readWorkbookFile(picked)
      setFile({ status: 'ready', id: Date.now(), fileName: picked.name, parsed })
    } catch (error) {
      setFile({ status: 'error', reason: error instanceof ImportFileError ? error.reason : 'unreadableFile' })
    }
  }

  return (
    <>
      <Link
        to="/podesavanja"
        className="mb-2 -ml-2 inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-medium text-text-muted hover:text-text"
      >
        <ChevronLeftIcon className="size-4" />
        {sr.import.back}
      </Link>
      <PageTitle>{sr.import.title}</PageTitle>

      {file.status === 'ready' ? (
        categories.data ? (
          <ImportReview
            key={file.id}
            fileName={file.fileName}
            parsed={file.parsed}
            categories={categories.data}
            onDone={() => setFile({ status: 'idle' })}
          />
        ) : (
          <QueryStatus error={categories.error} />
        )
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          <p className="text-sm text-text-muted">{sr.import.intro}</p>
          {file.status === 'error' && <FormMessage tone="error">{sr.import.fileErrors[file.reason]}</FormMessage>}
          <ImportFilePicker
            label={file.status === 'reading' ? sr.import.reading : sr.import.pickFile}
            disabled={file.status === 'reading'}
            onPick={(picked) => void onPick(picked)}
          />
        </div>
      )}

      <SettingsSection title={sr.import.historyTitle}>
        <ImportHistory />
      </SettingsSection>
    </>
  )
}
