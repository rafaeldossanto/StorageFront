import { useTranslation } from 'react-i18next'
import { PencilIcon } from 'lucide-react'
import { Monogram } from '@/components/Monogram'
import { formatCents } from '@/lib/money'
import { cn } from '@/lib/utils'

// One product in the grid. The whole card is a button: a tap opens it, and a keyboard
// reaches it with Tab like any other control.
export function ProductCard({ product, highlighted, onOpen }) {
  const { t } = useTranslation()

  // Destructuring an array: the first item of `packagings` that is the default one.
  const [main] = product.packagings.filter((packaging) => packaging.isDefault)

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={cn(
        'group relative flex min-h-28 flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
        highlighted && 'border-primary ring-2 ring-primary/25',
        !product.active && 'opacity-60',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <Monogram name={product.name} />
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <PencilIcon className="size-3" />
        </span>
      </span>

      <span className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</span>

      <span className="mt-auto flex items-end justify-between gap-2">
        <span className="font-mono text-sm font-medium text-money tabular-nums">
          {formatCents(product.salePriceCents)}
        </span>
        {product.active ? (
          <span className="truncate font-mono text-[10px] text-muted-foreground">{main?.displayGtin}</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t('products.inactive')}
          </span>
        )}
      </span>
    </button>
  )
}
