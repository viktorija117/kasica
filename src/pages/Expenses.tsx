import { MonthSwitcher } from '../components/MonthSwitcher'
import { PageTitle } from '../components/PageTitle'
import { useSelectedMonth } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'

export function Expenses() {
  const [month, setMonth] = useSelectedMonth()

  return (
    <>
      <PageTitle>{sr.expenses.title}</PageTitle>
      <MonthSwitcher month={month} onChange={setMonth} />
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-text-muted">
        {sr.expenses.empty}
      </p>
    </>
  )
}
