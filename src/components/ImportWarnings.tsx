import { sr } from '../i18n/sr'
import type { ImportWarning } from '../lib/excelImport'

/** Rows of the workbook that were left out, so they can be entered by hand. */
export function ImportWarnings({ warnings }: { warnings: ImportWarning[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {warnings.map((warning) => (
        <li key={`${warning.sheet}-${warning.row}-${warning.reason}`} className="rounded-2xl bg-danger-soft px-3 py-2">
          <p className="text-xs text-text-muted">
            {sr.import.warningPlace(sr.import.sheets[warning.sheet], warning.row)}
          </p>
          <p>
            {warning.text && <span className="font-medium">{warning.text}: </span>}
            {sr.import.warnings[warning.reason]}
          </p>
        </li>
      ))}
    </ul>
  )
}
