import { useMutation } from '@tanstack/react-query'
import { fetchYearRows } from '../data/yearExport'
import { sr } from '../i18n/sr'
import type { YearOverview } from '../lib/budget'
import { downloadWorkbook, exportSheets } from '../lib/excelExport'
import { useCategories, useHousehold, useMembers } from './useHousehold'
import { useToast } from './useToast'

/** Downloads `Kasica <year>.xlsx` with the year's rows and the month overview. */
export function useYearExport(year: number, overview: YearOverview<{ id: string; name: string }>) {
  const householdId = useHousehold().id
  const categories = useCategories().data
  const members = useMembers().data
  const showToast = useToast()

  const mutation = useMutation({
    mutationFn: async () => {
      const rows = await fetchYearRows(householdId, year)
      const sheets = exportSheets({ ...rows, overview, categories: categories ?? [], members: members ?? [] })
      await downloadWorkbook(sheets, sr.export.fileName(year))
    },
    onError: () => showToast({ message: sr.export.failed, tone: 'error' }),
  })

  return {
    exportYear: () => mutation.mutate(),
    exporting: mutation.isPending,
    ready: categories !== undefined && members !== undefined,
  }
}
