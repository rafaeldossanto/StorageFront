import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, KeyRoundIcon, LockKeyholeIcon } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCents } from '@/lib/money'
import { bucketLabel, periodTitle, shift, today } from '@/lib/period'
import { cn } from '@/lib/utils'
import { PinSetup } from './SalesScreen'
import { SalesChart } from './SalesChart'
import { useSalesReport } from './useSalesReport'

const PERIODS = ['Day', 'Month', 'Year']

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

// What was sold in a day, a month or a year, what it had cost and what was left, by hour,
// day or month and per product. The filters sit in one row above everything they scope.
export function SalesReport({ pass, account, onLock }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState('Month')
  const [date, setDate] = useState(today)
  const [asTable, setAsTable] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const { report, loading, error } = useSalesReport({ period, date, pass, onLocked: onLock })

  return (
    <section className="flex min-w-0 flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">{t('sales.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('sales.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {account.role === 'Owner' && (
            <Button variant="outline" className="h-9 bg-card" onClick={() => setChangingPin(true)}>
              <KeyRoundIcon />
              {t('sales.changePin')}
            </Button>
          )}
          <Button variant="outline" className="h-9 bg-card" onClick={onLock}>
            <LockKeyholeIcon />
            {t('sales.lock')}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-muted p-0.5" role="group">
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === period}
              onClick={() => setPeriod(option)}
              className={cn(
                'h-8 rounded-full px-4 text-sm font-medium transition-colors',
                option === period ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`sales.periods.${option}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t('sales.previous')} onClick={() => setDate(shift(period, date, -1))}>
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-44 text-center text-sm font-medium first-letter:uppercase">{periodTitle(period, date)}</span>
          <Button variant="ghost" size="icon-sm" aria-label={t('sales.next')} onClick={() => setDate(shift(period, date, 1))}>
            <ChevronRightIcon />
          </Button>
        </div>

        <Button variant="outline" size="sm" className="bg-card" onClick={() => setDate(today())}>
          {t('sales.today')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(t, error)}
        </p>
      )}

      {report === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        // A new period keeps the old numbers on screen, dimmed, until the new ones arrive.
        <div className={cn('grid gap-6 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
          <Tiles totals={report.totals} />

          <div className="grid gap-4 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t(`sales.chart.title_${report.period}`)}</h2>
              <Button variant="ghost" size="sm" onClick={() => setAsTable((current) => !current)}>
                {asTable ? t('sales.chart.showChart') : t('sales.chart.showTable')}
              </Button>
            </div>
            {asTable ? <BucketTable report={report} /> : <SalesChart period={report.period} buckets={report.buckets} />}
          </div>

          <SoldProducts products={report.products} />
        </div>
      )}

      <Dialog open={changingPin} onOpenChange={setChangingPin}>
        <DialogContent className="sm:max-w-sm" closeLabel={t('common.close')}>
          <DialogTitle className="sr-only">{t('sales.changePin')}</DialogTitle>
          {changingPin && <PinSetup onSaved={() => setChangingPin(false)} />}
        </DialogContent>
      </Dialog>
    </section>
  )
}

// The headline numbers. Plain sans figures: a big number set in equal-width digits looks loose.
function Tiles({ totals }) {
  const { t } = useTranslation()
  const margin = totals.revenueCents > 0 ? percent.format(totals.netCents / totals.revenueCents) : null

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile label={t('sales.tiles.revenue')} value={formatCents(totals.revenueCents)} />
      <Tile label={t('sales.tiles.cost')} value={formatCents(totals.costCents)} />
      <Tile
        label={t('sales.tiles.net')}
        value={formatCents(totals.netCents)}
        note={margin && t('sales.tiles.margin', { percent: margin })}
      />
      <Tile label={t('sales.tiles.sales')} value={String(totals.sales)} note={t('sales.tiles.units', { count: totals.units })} />
    </div>
  )
}

function Tile({ label, value, note }) {
  return (
    <div className="grid gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

// The chart as a table: every value readable without hovering, and by anyone the colours fail.
function BucketTable({ report }) {
  const { t } = useTranslation()

  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left font-medium">{t('sales.chart.period')}</th>
            <th className="py-2 text-right font-medium">{t('sales.chart.count')}</th>
            <th className="py-2 text-right font-medium">{t('sales.chart.revenue')}</th>
            <th className="py-2 text-right font-medium">{t('sales.chart.net')}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {report.buckets.map((bucket) => (
            <tr key={bucket.start} className="border-b last:border-b-0">
              <td className="py-1.5">{bucketLabel(report.period, bucket.start)}</td>
              <td className="py-1.5 text-right">{bucket.sales}</td>
              <td className="py-1.5 text-right">{formatCents(bucket.revenueCents)}</td>
              <td className="py-1.5 text-right">{formatCents(bucket.netCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SoldProducts({ products }) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{t('sales.products.title')}</h2>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('sales.products.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">{t('sales.products.name')}</th>
              <th className="py-2 text-right font-medium">{t('sales.products.units')}</th>
              <th className="py-2 text-right font-medium">{t('sales.products.revenue')}</th>
              <th className="hidden py-2 text-right font-medium sm:table-cell">{t('sales.products.cost')}</th>
              <th className="py-2 text-right font-medium">{t('sales.products.net')}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {products.map((product) => (
              <tr key={product.productId} className="border-b last:border-b-0">
                <td className="py-2 pr-2">{product.name}</td>
                <td className="py-2 text-right">{product.units}</td>
                <td className="py-2 text-right">{formatCents(product.revenueCents)}</td>
                <td className="hidden py-2 text-right text-muted-foreground sm:table-cell">{formatCents(product.costCents)}</td>
                <td className="py-2 text-right font-medium">{formatCents(product.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
