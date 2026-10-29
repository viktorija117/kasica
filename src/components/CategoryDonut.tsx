import { Cell, Pie, PieChart } from 'recharts'
import type { Category } from '../data/categories'
import type { CategorySpending } from '../lib/budget'
import { Amount } from './Amount'

const SIZE = 168
const FALLBACK_COLOR = 'var(--text-muted)'

type Props = {
  rows: CategorySpending<Category>[]
  spent: number
}

/**
 * Ring of category shares with the month's spending in the middle. Decorative: the list
 * next to it carries the same numbers as text.
 */
export function CategoryDonut({ rows, spent }: Props) {
  const data = rows.filter((row) => row.total > 0)

  return (
    <div aria-hidden="true" className="relative mx-auto shrink-0" style={{ width: SIZE, height: SIZE }}>
      <PieChart width={SIZE} height={SIZE}>
        <Pie
          data={data}
          dataKey="total"
          nameKey="categoryId"
          innerRadius={58}
          outerRadius={80}
          startAngle={90}
          endAngle={-270}
          stroke="var(--surface)"
          strokeWidth={2}
          animationDuration={500}
        >
          {data.map((row) => (
            <Cell key={row.categoryId} fill={row.category?.color ?? FALLBACK_COLOR} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 grid place-items-center">
        <div className="@container w-24 text-center">
          <Amount value={spent} />
        </div>
      </div>
    </div>
  )
}
