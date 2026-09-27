import { useTranslation } from 'react-i18next'
import { PencilIcon } from 'lucide-react'
import { ProductThumb } from '@/components/ProductThumb'
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
        'group relative flex flex-col gap-2 rounded-xl border bg-card p-2.5 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
        highlighted && 'border-primary ring-2 ring-primary/25',
        !product.active && 'opacity-60',
      )}
    >
      {/* The photo on white, as a catalogue shows it; the monogram fills the same space
          when there is none, so every card in the grid keeps one height. */}
      <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-white">
        <ProductThumb product={product} className="size-full rounded-none p-2 text-xl" />
        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <PencilIcon className="size-3" />
        </span>
      </span>

      <span className="line-clamp-2 min-h-[2lh] px-0.5 text-sm leading-snug font-medium">{product.name}</span>

      <span className="mt-auto flex items-end justify-between gap-2 px-0.5">
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
