import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ScanBarcodeIcon } from 'lucide-react'
import { searchProducts } from '@/api/catalog'
import { errorMessage } from '@/api/errors'
import { ProductThumb } from '@/components/ProductThumb'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { isTypedBarcode } from '@/lib/barcode'
import { formatCents } from '@/lib/money'

// The field at the top of a screen that takes products in: a code typed by hand and
// finished with Enter goes to `onCode`, like a scan; a name lists matching products under
// the field, and the one clicked goes to `onPick`.
//
// The text is the parent's (`query`), so a scan elsewhere on the screen can clear it.
export function ProductSearchField({ query, onQueryChange, onCode, onPick, placeholder }) {
  const { t } = useTranslation()

  // Results remember the term they answer: while the next search is on its way, the old
  // list is not shown under the new text.
  const [found, setFound] = useState({ term: '', items: [] })

  const search = useDebouncedValue(query.trim())
  const searching = search !== '' && !isTypedBarcode(search)

  useEffect(() => {
    if (!searching) {
      return undefined
    }

    const controller = new AbortController()

    searchProducts({ search, pageSize: 8 }, { signal: controller.signal })
      .then((page) => setFound({ term: search, items: page.items }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          toast.error(errorMessage(t, error))
        }
      })

    return () => controller.abort()
  }, [search, searching, t])

  function pick(product) {
    onQueryChange('')
    onPick(product)
  }

  return (
    <div className="relative">
      <label className="flex h-12 items-center gap-3 rounded-xl border bg-card px-4 shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
        <ScanBarcodeIcon className="size-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && isTypedBarcode(query.trim())) {
              event.preventDefault()
              onQueryChange('')
              onCode(query.trim())
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
      </label>

      {searching && found.term === search && (
        <ul className="absolute inset-x-0 top-14 z-10 grid gap-0.5 rounded-xl border bg-popover p-1.5 shadow-md">
          {found.items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t('search.noResults', { term: search })}</li>
          ) : (
            found.items.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => pick(product)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                >
                  <ProductThumb product={product} className="size-8" />
                  <span className="flex-1 truncate">{product.name}</span>
                  <span className="font-mono text-money tabular-nums">{formatCents(product.salePriceCents)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
