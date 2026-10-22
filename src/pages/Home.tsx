import { Amount } from '../components/Amount'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useSelectedMonth } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'

export function Home() {
  const [month, setMonth] = useSelectedMonth()

  return (
    <>
      <h1 className="sr-only">{sr.nav.home}</h1>
      <MonthSwitcher month={month} onChange={setMonth} />

      <section className="rounded-3xl bg-primary p-6 text-on-primary shadow-sm">
        <p className="text-sm font-medium opacity-85">{sr.home.remaining}</p>
        <Amount value={0} size="xl" className="mt-1 block" />
      </section>

      <p className="mt-6 text-center text-sm text-text-muted">{sr.home.placeholder}</p>
    </>
  )
}
