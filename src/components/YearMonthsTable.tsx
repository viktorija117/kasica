import { Link, useNavigate } from 'react-router'
import type { Category } from '../data/categories'
import { homePath } from '../hooks/useSelectedMonth'
import { sr } from '../i18n/sr'
import type { YearOverview } from '../lib/budget'
import { formatRSD } from '../lib/money'
import { categoryLabel, fullMonth, yearTable } from './yearTable'

type Props = { overview: YearOverview<Category> }

const columns = [sr.year.opening, sr.year.spent, sr.year.saved, sr.year.remaining] as const

/** The 12 months with their balances and a UKUPNO row; a tap on a month opens it on Home. */
export function YearMonthsTable({ overview }: Props) {
  const navigate = useNavigate()
  const byId = new Map(overview.categories.map((column) => [column.categoryId, column]))
  const { total } = overview

  return (
    <section aria-label={sr.year.monthsTitle} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{sr.year.monthsTitle}</h2>
      <div className={yearTable.wrap}>
        <table className={yearTable.table}>
          <thead>
            <tr>
              <th scope="col" className={`${yearTable.head} ${yearTable.sticky} text-left`}>
                {sr.year.month}
              </th>
              {columns.map((label) => (
                <th key={label} scope="col" className={yearTable.head}>
                  {label}
                </th>
              ))}
              <th scope="col" className={`${yearTable.head} text-left`}>
                {sr.year.topCategory}
              </th>
            </tr>
          </thead>
          <tbody>
            {overview.months.map(({ month, balance, shown, top }) => {
              const values = [balance.opening, balance.spent, balance.saved, balance.remaining]
              return (
                <tr
                  key={month}
                  onClick={() => navigate(homePath(month))}
                  className={`cursor-pointer transition hover:bg-surface-muted ${shown ? '' : 'text-text-muted'}`}
                >
                  <th scope="row" className={`${yearTable.sticky} border-b border-border px-2 py-2.5 text-left font-medium`}>
                    <Link
                      to={homePath(month)}
                      aria-label={sr.year.openMonth(fullMonth(month))}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:underline"
                    >
                      {fullMonth(month)}
                    </Link>
                  </th>
                  {values.map((value, index) => (
                    <td key={columns[index]} className={yearTable.cell}>
                      {shown ? formatRSD(value) : sr.year.noValue}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-border px-2 py-2.5">
                    {top ? categoryLabel(byId.get(top.categoryId)) : sr.year.noValue}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={yearTable.totalRow}>
              <th scope="row" className={`${yearTable.sticky} px-2 py-2.5 text-left`}>
                {sr.year.total}
              </th>
              {[total.opening, total.spent, total.saved, total.remaining].map((value, index) => (
                <td key={columns[index]} className="amount whitespace-nowrap px-2 py-2.5 text-right">
                  {formatRSD(value)}
                </td>
              ))}
              <td className="whitespace-nowrap px-2 py-2.5">
                {overview.topCategory ? categoryLabel(overview.topCategory) : sr.year.noValue}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
