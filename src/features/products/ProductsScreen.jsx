import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PlusIcon, ScanBarcodeIcon, XIcon } from 'lucide-react'
import {
  activeCategories,
  createProduct,
  deleteProduct,
  findByBarcode,
  flattenCategories,
  getCategoryTree,
  updateProduct,
} from '@/api/catalog'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePhotoArrival } from '@/hooks/usePhotoArrival'
import { useScanner } from '@/hooks/useScanner'
import { isTypedBarcode } from '@/lib/barcode'
import { cn } from '@/lib/utils'
import { ProductCard } from './ProductCard'
import { ProductDialog } from './ProductDialog'
import { SessionPanel } from './SessionPanel'
import { useProductList } from './useProductList'

// Products and registration by scanning.
//
// A scan anywhere on the screen looks the code up: a known product opens for editing, an
// unknown code opens the registration form already filled in. Registering is undone from
// the confirmation itself - no "are you sure?" in the way of the next scan.
export function ProductsScreen() {
  const { t } = useTranslation()

  const [tree, setTree] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState({ open: false })
  const [session, setSession] = useState([])
  const [highlightId, setHighlightId] = useState(null)

  const search = useDebouncedValue(query.trim())
  const searching = search !== '' && !isTypedBarcode(search)
  const list = useProductList({ categoryId, search: searching ? search : '' })

  // useMemo recomputes only when `tree` changes, not on every keystroke in the search box.
  const categories = useMemo(() => flattenCategories(activeCategories(tree)), [tree])
  const roots = useMemo(() => activeCategories(tree), [tree])

  useEffect(() => {
    const controller = new AbortController()

    getCategoryTree({ signal: controller.signal })
      .then((loaded) => {
        setTree(loaded)
        // The first branch is open from the start, so the grid is never an empty page.
        setCategoryId((current) => current ?? activeCategories(loaded)[0]?.id ?? null)
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          toast.error(errorMessage(t, error))
        }
      })

    return () => controller.abort()
  }, [t])

  useScanner(lookUp, { enabled: !dialog.open })

  // A product registered here gets its photo a few seconds later; it replaces the monogram
  // wherever the product shows, without moving anything.
  const watchPhoto = usePhotoArrival((withPhoto) => {
    setSession((current) => current.map((item) => (item.id === withPhoto.id ? withPhoto : item)))
    list.upsert(withPhoto, { belongs: false })
  })

  async function lookUp(code) {
    setQuery('')

    try {
      const product = await findByBarcode(code)
      setHighlightId(product.id)
      setDialog({ open: true, product })
    } catch (error) {
      // A 404 is the normal path for a new product: the form opens with the code in it.
      if (error instanceof ApiError && error.isNotFound) {
        setDialog({ open: true, barcode: code })
      } else {
        toast.error(errorMessage(t, error))
      }
    }
  }

  // Newest first, each product once: a product edited twice moves back to the top.
  function touch(product) {
    setSession((current) => [product, ...current.filter((item) => item.id !== product.id)])
    setHighlightId(product.id)
  }

  function forget(id) {
    setSession((current) => current.filter((item) => item.id !== id))
    list.remove(id)
  }

  async function register(fields) {
    const product = await createProduct(fields)

    setDialog({ open: false })
    touch(product)
    list.upsert(product, { belongs: !searching && isInBranch(tree, categoryId, product.categoryId) })
    watchPhoto(product)

    toast.success(t('products.toast.created'), {
      description: t('products.toast.createdHint'),
      action: { label: t('products.toast.undo'), onClick: () => undo(product) },
      // Long enough to notice a typo in the name and reach the button; hovering the toast
      // also holds it on screen.
      duration: 10_000,
    })
  }

  async function undo(product) {
    try {
      await deleteProduct(product.id)
      forget(product.id)
      toast(t('products.toast.undone'))
    } catch (error) {
      toast.error(errorMessage(t, error))
    }
  }

  async function save(product, fields) {
    const updated = await updateProduct(product.id, fields)

    setDialog({ open: false })
    touch(updated)
    list.upsert(updated, { belongs: false })
    toast.success(t('products.toast.updated'))
  }

  async function remove(product) {
    await deleteProduct(product.id)
    setDialog({ open: false })
    forget(product.id)
    toast.success(t('products.toast.deleted'))
  }

  // The session panel's own price field: saves without moving the row.
  async function savePrice(product, cents) {
    const updated = await updateProduct(product.id, { ...product, salePriceCents: cents })
    setSession((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    list.upsert(updated, { belongs: false })
  }

  const pathOf = (id) => categories.find((category) => category.id === id)?.path ?? ''
  const selectedRoot = roots.find((root) => root.id === categoryId)

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_20rem]">
      <section className="flex min-w-0 flex-col gap-6 p-6 lg:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight">{t('products.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('products.subtitle')}</p>
            <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              {t('products.count', { count: list.total })}
            </span>
          </div>
          <Button variant="outline" className="h-9 bg-card" onClick={() => setDialog({ open: true, barcode: '' })}>
            <PlusIcon />
            {t('products.newProduct')}
          </Button>
        </header>

        <label className="flex h-12 items-center gap-3 rounded-xl border bg-card px-4 shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
          <ScanBarcodeIcon className="size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // A code typed by hand, digit by digit, finished with Enter.
              if (event.key === 'Enter' && isTypedBarcode(query.trim())) {
                event.preventDefault()
                lookUp(query.trim())
              }
            }}
            placeholder={t('products.scanPlaceholder')}
            aria-label={t('products.scanPlaceholder')}
            autoComplete="off"
            className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {query !== '' && (
            <Button variant="ghost" size="icon-sm" aria-label={t('products.clearSearch')} onClick={() => setQuery('')}>
              <XIcon />
            </Button>
          )}
        </label>

        {!searching && (
          <div className="grid gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">{t('products.categories')}</span>
            <div className="flex flex-wrap gap-2">
              {roots.map((root) => (
                <button
                  key={root.id}
                  type="button"
                  onClick={() => setCategoryId(root.id)}
                  aria-pressed={root.id === categoryId}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors',
                    root.id === categoryId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:border-primary/40',
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', root.id === categoryId ? 'bg-sidebar-primary' : 'bg-muted-foreground/50')}
                  />
                  {root.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            {searching ? t('products.results', { term: search }) : selectedRoot?.name}
          </span>

          {list.status === 'loading' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {/* Array.from({ length: 8 }) is a quick way to make eight placeholders. */}
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : list.items.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {list.error ? errorMessage(t, list.error) : searching ? t('products.noResults', { term: search }) : t('products.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {list.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  highlighted={product.id === highlightId}
                  onOpen={(opened) => setDialog({ open: true, product: opened })}
                />
              ))}
            </div>
          )}

          {list.hasMore && (
            <Button
              variant="outline"
              className="mx-auto mt-2 bg-card"
              disabled={list.status === 'loading-more'}
              onClick={list.loadMore}
            >
              {t('products.loadMore')}
            </Button>
          )}

          {/* The licence of the photos asks for their source where they are shown. */}
          {list.items.some((product) => product.photo) && (
            <p className="text-center text-[11px] text-muted-foreground">{t('products.photo.creditAll')}</p>
          )}
        </div>
      </section>

      <SessionPanel
        products={session}
        pathOf={pathOf}
        onOpen={(product) => setDialog({ open: true, product })}
        onPriceCommit={savePrice}
      />

      <ProductDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        product={dialog.product}
        barcode={dialog.barcode}
        categories={categories}
        defaultCategoryId={categoryId}
        onSubmit={(fields) => (dialog.product ? save(dialog.product, fields) : register(fields))}
        onDelete={remove}
      />
    </div>
  )
}

// Whether `candidateId` is `branchId` itself or anywhere under it.
function isInBranch(tree, branchId, candidateId) {
  const branch = findNode(tree, branchId)
  return branch != null && flattenCategories([branch]).some((category) => category.id === candidateId)
}

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const inside = findNode(node.children ?? [], id)
    if (inside) {
      return inside
    }
  }
  return null
}
