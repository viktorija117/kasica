import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { sr } from '../i18n/sr'
import type { YearChartPoint } from '../lib/budget'
import { formatRSD } from '../lib/money'
import { fullMonth, shortMonth } from './yearTable'

type Props = { points: YearChartPoint[] }

const series = [
  { key: 'income', label: sr.year.income, color: 'var(--chart-income)' },
  { key: 'spent', label: sr.year.spent, color: 'var(--chart-spent)' },
  { key: 'saved', label: sr.year.saved, color: 'var(--chart-saved)' },
] as const

function MonthTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as YearChartPoint | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-text-muted">{fullMonth(point.month)}</p>
      {series.map(({ key, label, color }) => (
        <p key={key} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-text-muted">{label}</span>
          <span className="amount ml-auto pl-3">{formatRSD(point[key])}</span>
        </p>
      ))}
    </div>
  )
}

/** Incomes, spending and savings side by side for every month. The months table holds the numbers. */
export function YearChart({ points }: Props) {
  return (
    <section aria-label={sr.year.chartTitle} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{sr.year.chartTitle}</h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        {series.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-3 h-52" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 208 }}>
          <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={2}>
            <XAxis
              dataKey="month"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickFormatter={(month: string) => shortMonth(month)}
            />
            <YAxis hide />
            <Tooltip content={MonthTooltip} cursor={{ fill: 'var(--surface-muted)' }} isAnimationActive={false} />
            <ReferenceLine y={0} stroke="var(--border)" />
            {series.map(({ key, color }) => (
              <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} animationDuration={500} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
