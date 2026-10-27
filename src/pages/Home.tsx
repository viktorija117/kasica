import { BalanceCards } from '../components/BalanceCards'
import { MonthStats } from '../components/MonthStats'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { QueryStatus } from '../components/QueryStatus'
import { useMonthSummary } from '../hooks/useMonthSummary'
import { useSelectedMonth } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'

export function Home() {
  const [month, setMonth] = useSelectedMonth()
  const { data, error } = useMonthSummary(month)

  return (
    <>
      <h1 className="sr-only">{sr.nav.home}</h1>
      <MonthSwitcher month={month} onChange={setMonth} />

      {data ? (
        <>
          <BalanceCards summary={data.summary} setting={data.setting} />
          <MonthStats summary={data.summary} comparison={data.comparison} />
        </>
      ) : (
        <QueryStatus error={error} />
      )}
    </>
  )
}
