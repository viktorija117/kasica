import type { Category } from '../data/categories'
import { sr } from '../i18n/sr'
import type { YearOverview } from '../lib/budget'
import { formatAmount, formatRSD } from '../lib/money'
import { YearCategoryList } from './YearCategoryList'
import { categoryColor, categoryLabel, cellBackground, fullMonth, shortMonth, yearTable } from './yearTable'

type Props = { overview: YearOverview<Category> }

/**
 * Months × categories, every category with spending in the year (archived ones too).
 * A phone gets a list with a strip per category instead of the wide table.
 */
export function YearCategoryHeatmap({ overview }: Props) {
  const { categories } = overview

  return (
    <section aria-label={sr.year.categoriesTitle} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{sr.year.categoriesTitle}</h2>
      <div className="sm:hidden">
        <YearCategoryList categories={categories} months={overview.months} />
      </div>
      <div className={`${yearTable.wrap} hidden sm:block`}>
        <table className={yearTable.table}>
          <thead>
            <tr>
              <th scope="col" className={`${yearTable.head} ${yearTable.sticky} text-left`}>
                {sr.year.month}
              </th>
              {categories.map((column) => (
                <th key={column.categoryId} scope="col" className={`${yearTable.head} align-bottom`}>
                  {categoryLabel(column)}
                  {column.category?.archived && (
                    <span className="block font-normal italic">{sr.year.archived}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overview.months.map(({ month, cells }) => (
              <tr key={month}>
                <th scope="row" className={`${yearTable.sticky} border-b border-border px-2 py-2 text-left font-medium`}>
                  <abbr title={fullMonth(month)} className="no-underline">
                    {shortMonth(month)}
                  </abbr>
                </th>
                {cells.map((cell, index) => {
                  const column = categories[index]
                  return (
                    <td
                      key={cell.categoryId}
                      title={sr.year.cellLabel(fullMonth(month), categoryLabel(column), formatRSD(cell.total))}
                      style={{
                        backgroundColor: cellBackground(categoryColor(column), cell.intensity),
                      }}
                      className={`${yearTable.cell} border-l-2 border-l-surface`}
                    >
                      {cell.total !== 0 ? formatAmount(cell.total) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={yearTable.totalRow}>
              <th scope="row" className={`${yearTable.sticky} px-2 py-2.5 text-left`}>
                {sr.year.total}
              </th>
              {categories.map((column) => (
                <td key={column.categoryId} className="amount whitespace-nowrap px-2 py-2.5 text-right">
                  {formatAmount(column.total)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
