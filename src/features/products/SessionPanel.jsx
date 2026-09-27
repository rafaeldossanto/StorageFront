import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, PencilIcon } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { MoneyInput } from '@/components/MoneyInput'
import { ProductThumb } from '@/components/ProductThumb'
import { Button } from '@/components/ui/button'

// What was registered or edited since the screen opened, newest first. The price is
// editable right here and saves itself when the field is left: registering a delivery's
// worth of new products is scan, name, next - and the prices after, in one pass.
export function SessionPanel({ products, pathOf, onOpen, onPriceCommit }) {
  const { t } = useTranslation()

  return (
    <aside className="flex flex-col gap-4 border-t bg-card p-5 lg:border-t-0 lg:border-l">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t('products.session.title')}</h2>
        <span className="text-xs text-muted-foreground">{t('products.count', { count: products.length })}</span>
      </div>

      {products.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{t('products.session.empty')}</p>
      ) : (
        <ul className="grid gap-4">
          {products.map((product) => (
            // `key` tells React which item is which between renders, so each row keeps its
            // own state - the "saved" mark - as the list changes around it.
            <SessionItem
              key={product.id}
              product={product}
              path={pathOf(product.categoryId)}
              onOpen={onOpen}
              onPriceCommit={onPriceCommit}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}

function SessionItem({ product, path, onOpen, onPriceCommit }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState({ kind: 'idle' })

  async function commit(cents) {
    if (cents === null || cents === product.salePriceCents) {
      return
    }

    setStatus({ kind: 'saving' })

    try {
      await onPriceCommit(product, cents)
      setStatus({ kind: 'saved' })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(t, error) })
    }
  }

  return (
    <li className="grid gap-1.5 border-b pb-4 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProductThumb product={product} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{path}</p>
          </div>
        </div>
        {status.kind === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-money" role="status">
            <CheckIcon className="size-3.5" />
            {t('products.session.saved')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Keyed by the price: when it changes - saved here or in the dialog - the field
            starts again from the new value instead of what was typed before. */}
        <MoneyInput
          key={product.salePriceCents}
          cents={product.salePriceCents}
          onCommit={commit}
          aria-label={t('products.session.price', { name: product.name })}
          className="h-8 flex-1 bg-muted/40"
          invalid={status.kind === 'error'}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('products.session.edit', { name: product.name })}
          onClick={() => onOpen(product)}
        >
          <PencilIcon />
        </Button>
      </div>

      {status.kind === 'error' && <p className="text-xs text-destructive">{status.message}</p>}
    </li>
  )
}
