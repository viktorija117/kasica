import { useYearExport } from '../hooks/useYearExport'
import { sr } from '../i18n/sr'
import type { YearOverview } from '../lib/budget'
import { Button } from './Button'

type Props = {
  year: number
  overview: YearOverview<{ id: string; name: string }>
}

export function YearExport({ year, overview }: Props) {
  const { exportYear, exporting, ready } = useYearExport(year, overview)

  return (
    <section className="rounded-3xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm text-text-muted">{sr.export.hint}</p>
      <Button variant="secondary" className="w-full" loading={exporting} disabled={!ready} onClick={exportYear}>
        {exporting ? sr.export.working : sr.export.button}
      </Button>
    </section>
  )
}
