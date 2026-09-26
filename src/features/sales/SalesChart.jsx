import { useTranslation } from 'react-i18next'
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { formatCents, formatCompactCents } from '@/lib/money'
import { bucketLabel, bucketTick } from '@/lib/period'

// The two series take their colours from the theme tokens --chart-revenue and --chart-net
// (index.css), checked with the colour validator against the card in both themes. Sold is
// columns and "left over" is a line, so shape tells them apart too, not colour alone.
const config = {
  revenue: { color: 'var(--chart-revenue)' },
  net: { color: 'var(--chart-net)' },
}

// Sold as columns, what was left as a line, on one axis: both are reais, so one scale is
// honest - two scales would invent a relation between them.
export function SalesChart({ period, buckets }) {
  const data = buckets.map((bucket) => ({
    tick: bucketTick(period, bucket.start),
    label: bucketLabel(period, bucket.start),
    sales: bucket.sales,
    revenue: bucket.revenueCents,
    net: bucket.netCents,
  }))

  const anyLoss = data.some((bucket) => bucket.net < 0)

  return (
    <div className="grid gap-3">
      <Legend />
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} width={76} tickFormatter={formatCompactCents} />
          {anyLoss && <ReferenceLine y={0} stroke="var(--muted-foreground)" />}
          <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<BucketTooltip />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Line
            dataKey="net"
            type="linear"
            stroke="var(--color-net)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

// The legend mirrors the marks: a square for the columns, a short stroke for the line.
function Legend() {
  const { t } = useTranslation()

  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px]" style={{ background: 'var(--chart-revenue)' }} />
        {t('sales.chart.revenue')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 rounded-full" style={{ background: 'var(--chart-net)' }} />
        {t('sales.chart.net')}
      </span>
    </div>
  )
}

// One tooltip for both series at the hovered bucket: the value leads, the name follows.
// Recharts hands it `active` and `payload` - the data of the hovered bucket.
function BucketTooltip({ active, payload }) {
  const { t } = useTranslation()

  if (!active || !payload?.length) {
    return null
  }

  const bucket = payload[0].payload

  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <span className="font-medium">{bucket.label}</span>
      <TooltipRow keyClass="size-2.5 rounded-[3px]" color="var(--chart-revenue)" value={formatCents(bucket.revenue)} name={t('sales.chart.revenue')} />
      <TooltipRow keyClass="h-0.5 w-2.5 rounded-full" color="var(--chart-net)" value={formatCents(bucket.net)} name={t('sales.chart.net')} />
      <span className="text-muted-foreground">{t('sales.chart.salesCount', { count: bucket.sales })}</span>
    </div>
  )
}

function TooltipRow({ keyClass, color, value, name }) {
  return (
    <span className="flex items-center gap-2">
      <span className={keyClass} style={{ background: color }} />
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground">{name}</span>
    </span>
  )
}
