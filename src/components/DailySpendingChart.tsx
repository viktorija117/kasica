import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { sr } from '../i18n/sr'
import type { DayTotal } from '../lib/budget'
import { dayOfMonth } from '../lib/dates'
import { formatRSD } from '../lib/money'

type Props = {
  days: DayTotal[]
  avgPerDay: number
}

type Point = { day: number; total: number }

const LABELED_DAYS = new Set([1, 5, 10, 15, 20, 25])

function DayTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as Point | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-text-muted">{sr.home.dayLabel(point.day)}</p>
      <p className="amount">{formatRSD(point.total)}</p>
    </div>
  )
}

/** One bar per day of the month and a dashed line at the average per day. */
export function DailySpendingChart({ days, avgPerDay }: Props) {
  const data: Point[] = days.map((day) => ({ day: dayOfMonth(day.date), total: day.total }))
  const lastDay = data.length

  return (
    <section aria-label={sr.home.byDay} className="rounded-3xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-text-muted">{sr.home.byDay}</h2>
      <div className="mt-3 h-40" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 160 }}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
            <XAxis
              dataKey="day"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(day: number) => (LABELED_DAYS.has(day) || day === lastDay ? String(day) : '')}
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip content={DayTooltip} cursor={{ fill: 'var(--surface-muted)' }} isAnimationActive={false} />
            <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} animationDuration={500} />
            {avgPerDay > 0 && (
              <ReferenceLine
                y={avgPerDay}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-text-muted" />
        {sr.home.avgLine(formatRSD(avgPerDay))}
      </p>
    </section>
  )
}
