import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'
import { findByBarcode } from '@/api/catalog'
import { ApiError, errorMessage } from '@/api/errors'
import { cancelSale, registerSale } from '@/api/sales'
import { Monogram } from '@/components/Monogram'
import { ProductSearchField } from '@/components/ProductSearchField'
import { Button } from '@/components/ui/button'
import { useScanner } from '@/hooks/useScanner'
import { unitsFor } from '@/lib/barcode'
import { formatCents } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useCart } from './useCart'

const timeOf = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Ringing up a sale: scan, scan, scan, conclude. A pack counts as its units; the total is
// on the side, big enough to read from the other side of the counter. A concluded sale is
// undone from its confirmation, for ten minutes.
export function SellScreen() {
  const { t } = useTranslation()
  const cart = useCart()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState([])
  const [problemId, setProblemId] = useState(null)

  useScanner(scan)

  async function scan(code) {
    setQuery('')

    try {
      const product = await findByBarcode(code)
      cart.add(product, unitsFor(product, code))
      setProblemId(null)
    } catch (error) {
      toast.error(error instanceof ApiError && error.isNotFound ? t('sell.unknownCode') : errorMessage(t, error))
    }
  }

  async function finish() {
    setBusy(true)

    try {
      const sale = await registerSale(cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })))
      const items = t('sell.items', { count: cart.units })

      cart.clear()
      setProblemId(null)
      setRecent((current) => [{ sale, status: 'done' }, ...current])

      toast.success(t('sell.toast.sold'), {
        description: t('sell.toast.soldHint', { total: formatCents(sale.totalCents), items }),
        action: { label: t('sell.toast.undo'), onClick: () => undo(sale) },
        duration: 10_000,
      })
    } catch (error) {
      // The API names the refused line; the cart went out in its own order, so the line
      // is the cart position.
      const item = error instanceof ApiError && error.line ? cart.items[error.line - 1] : null
      setProblemId(item?.product.id ?? null)
      toast.error(item ? t('sell.lineProblem', { name: item.product.name, message: errorMessage(t, error) }) : errorMessage(t, error))
    } finally {
      setBusy(false)
    }
  }

  async function undo(sale) {
    try {
      await cancelSale(sale.id)
      setRecent((current) => current.map((entry) => (entry.sale.id === sale.id ? { ...entry, status: 'cancelled' } : entry)))
      toast(t('sell.toast.undone'))
    } catch (error) {
      toast.error(errorMessage(t, error))
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_22rem]">
      <section className="flex min-w-0 flex-col gap-6 p-6 lg:p-8">
        <header className="grid gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">{t('sell.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('sell.subtitle')}</p>
          <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {t('sell.items', { count: cart.units })}
          </span>
        </header>

        <ProductSearchField
          query={query}
          onQueryChange={setQuery}
          onCode={scan}
          onPick={(product) => cart.add(product, 1)}
          placeholder={t('sell.scanPlaceholder')}
        />

        {cart.items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{t('sell.empty')}</p>
        ) : (
          <ul className="grid gap-2">
            {cart.items.map((item) => (
              <CartLine
                key={item.product.id}
                item={item}
                problem={item.product.id === problemId}
                onQuantity={(quantity) => cart.setQuantity(item.product.id, quantity)}
                onRemove={() => cart.remove(item.product.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-6 border-t bg-card p-5 lg:border-t-0 lg:border-l">
        <div className="grid gap-4 rounded-xl bg-accent p-4 text-accent-foreground">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{t('sell.total')}</span>
            <span className="text-xs">{t('sell.items', { count: cart.units })}</span>
          </div>
          <span className="text-4xl font-semibold tracking-tight">{formatCents(cart.totalCents)}</span>
          <div className="flex gap-2">
            <Button className="h-10 flex-1" disabled={cart.items.length === 0 || busy} onClick={finish}>
              {t('sell.finish')}
            </Button>
            <Button variant="outline" className="h-10 bg-card" disabled={cart.items.length === 0 || busy} onClick={cart.clear}>
              {t('sell.clear')}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <h2 className="text-sm font-semibold">{t('sell.recent')}</h2>
          {recent.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{t('sell.recentEmpty')}</p>
          ) : (
            <ul className="grid gap-2">
              {recent.map(({ sale, status }) => (
                <li key={sale.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                  <div className="grid">
                    <span className={cn('font-mono text-sm tabular-nums', status === 'cancelled' ? 'text-muted-foreground line-through' : 'text-money')}>
                      {formatCents(sale.totalCents)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeOf.format(new Date(sale.soldAt))} · {t('sell.items', { count: sale.lines.reduce((sum, line) => sum + line.quantity, 0) })}
                    </span>
                  </div>
                  {status === 'cancelled' ? (
                    <span className="text-xs text-muted-foreground">{t('sell.cancelled')}</span>
                  ) : (
                    new Date(sale.cancellableUntil) > new Date() && (
                      <Button variant="ghost" size="sm" onClick={() => undo(sale)}>
                        {t('sell.undo')}
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

function CartLine({ item, problem, onQuantity, onRemove }) {
  const { t } = useTranslation()
  const { product } = item
  const discounted = item.unitPriceCents < item.regularPriceCents

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5',
        problem && 'border-destructive ring-2 ring-destructive/20',
      )}
    >
      <Monogram name={product.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {discounted && <span className="mr-1.5 line-through">{formatCents(item.regularPriceCents)}</span>}
          {t('sell.each', { price: formatCents(item.unitPriceCents) })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label={t('sell.decrease', { name: product.name })} onClick={() => onQuantity(item.quantity - 1)}>
          <MinusIcon />
        </Button>
        <span className="w-10 text-center font-mono text-sm tabular-nums">{item.quantity}</span>
        <Button variant="outline" size="icon-sm" aria-label={t('sell.increase', { name: product.name })} onClick={() => onQuantity(item.quantity + 1)}>
          <PlusIcon />
        </Button>
      </div>
      <span className="w-24 text-right font-mono text-sm font-medium text-money tabular-nums">
        {formatCents(item.unitPriceCents * item.quantity)}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={t('sell.remove', { name: product.name })} onClick={onRemove}>
        <XIcon />
      </Button>
    </li>
  )
}
