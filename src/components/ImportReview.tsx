import { useMemo, useState } from 'react'
import type { Category } from '../data/categories'
import { useImportBatches, useRunImport } from '../hooks/useImport'
import { useToast } from '../hooks/useToast'
import { sr } from '../i18n/sr'
import {
  buildImportPlan,
  excelCategories,
  suggestMapping,
  type CategoryChoice,
  type ParsedWorkbook,
} from '../lib/excelImport'
import { Button } from './Button'
import { FormMessage } from './FormMessage'
import { ImportCategoryMapping } from './ImportCategoryMapping'
import { ImportPreview } from './ImportPreview'
import { ImportWarnings } from './ImportWarnings'
import { SettingsSection } from './SettingsSection'

type Props = {
  fileName: string
  parsed: ParsedWorkbook
  categories: Category[]
  onDone: () => void
}

const texts = { incomeSource: sr.import.incomeSource, savingNote: sr.import.savingNote }

/** Category choices, the preview and warnings of a read workbook, and the "Uvezi" button. */
export function ImportReview({ fileName, parsed, categories, onDone }: Props) {
  const names = useMemo(() => excelCategories(parsed), [parsed])
  const [mapping, setMapping] = useState(() =>
    suggestMapping(
      names.map(({ name }) => name),
      categories,
    ),
  )
  const plan = useMemo(
    () => buildImportPlan(parsed, mapping, categories, texts),
    [parsed, mapping, categories],
  )
  const batches = useImportBatches()
  const runImport = useRunImport()
  const showToast = useToast()

  const alreadyImported = batches.data?.some((batch) => batch.file_name === fileName) ?? false
  const isEmpty = plan.months.length === 0

  const onChoice = (name: string, choice: CategoryChoice) =>
    setMapping((current) => ({ ...current, [name]: choice }))

  const onSubmit = () =>
    runImport.mutate(
      { fileName, plan },
      {
        onSuccess: () => {
          showToast({ message: sr.import.done(plan.total.expenseCount) })
          onDone()
        },
        onError: () => showToast({ message: sr.import.failed, tone: 'error' }),
      },
    )

  return (
    <>
      {alreadyImported && (
        <div className="mb-6">
          <FormMessage tone="error">{sr.import.alreadyImported(fileName)}</FormMessage>
        </div>
      )}

      {names.length > 0 && (
        <SettingsSection title={sr.import.categoriesTitle}>
          <p className="mb-4 text-sm text-text-muted">{sr.import.categoriesHint}</p>
          <ImportCategoryMapping
            excelCategories={names}
            categories={categories}
            mapping={mapping}
            onChange={onChoice}
          />
        </SettingsSection>
      )}

      <SettingsSection title={sr.import.previewTitle}>
        {isEmpty ? (
          <p className="text-sm text-text-muted">{sr.import.nothing}</p>
        ) : (
          <ImportPreview plan={plan} transferCount={parsed.transferCount} />
        )}
      </SettingsSection>

      {parsed.warnings.length > 0 && (
        <SettingsSection title={sr.import.warningsTitle(parsed.warnings.length)}>
          <ImportWarnings warnings={parsed.warnings} />
        </SettingsSection>
      )}

      <div className="mb-6 flex flex-col gap-2">
        <Button onClick={onSubmit} loading={runImport.isPending} disabled={isEmpty}>
          {sr.import.submit}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={runImport.isPending}>
          {sr.import.pickOther}
        </Button>
      </div>
    </>
  )
}
