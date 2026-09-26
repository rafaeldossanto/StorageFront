import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PlusIcon } from 'lucide-react'
import { activeCategories, createProduct, findByBarcode, flattenCategories, getCategoryTree } from '@/api/catalog'
import { ApiError, errorMessage } from '@/api/errors'
import { cancelReceipt, listReceipts, listSuppliers, receiveGoods } from '@/api/receiving'
import { ProductSearchField } from '@/components/ProductSearchField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductDialog } from '@/features/products/ProductDialog'
import { useScanner } from '@/hooks/useScanner'
import { formatCents } from '@/lib/money'
import { today } from '@/lib/period'
import { cn } from '@/lib/utils'
import { DeliveryLine } from './DeliveryLine'
import { SupplierDialog } from './SupplierDialog'
import { findProblems, toReceiptLines, useDelivery } from './useDelivery'

// A Select cannot hold an empty value, so "no supplier" needs a value of its own.
const NO_SUPPLIER = 'none'

// The field a refusal from the API points at, so the line shows where to look.
const FIELD_OF_ERROR = {
  'receipt.quantity_invalid': 'quantity',
  'batch.quantity_invalid': 'quantity',
  'batch.cost_negative': 'cost',
  'receipt.expiry_required': 'expiry',
  'receipt.already_expired': 'expiry',
}

const timeOf = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Entering a delivery: scan what arrived, type what each item cost on the invoice and, for
// goods that spoil, until when they last. A code the shop does not know yet opens the
// product registration right there. Entered goods go into stock as batches; the entry is
// undone from its confirmation, for ten minutes and while none of it has left the shelf.
export function ReceivingScreen() {
  const { t } = useTranslation()
  const delivery = useDelivery()

  const [query, setQuery] = useState('')
  const [problems, setProblems] = useState({})
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState({ supplierId: NO_SUPPLIER, invoiceNumber: '', note: '' })
  const [suppliers, setSuppliers] = useState([])
  const [recent, setRecent] = useState([])
  const [tree, setTree] = useState([])
  const [productDialog, setProductDialog] = useState({ open: false, barcode: '' })
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)

  const categories = useMemo(() => flattenCategories(activeCategories(tree)), [tree])
  const minDate = today()

  // The id of the field to focus once the lines on screen are up to date. A ref and not
  // state: changing it must not render anything by itself.
  const focusTarget = useRef(null)

  useEffect(() => {
    if (focusTarget.current !== null) {
      document.getElementById(focusTarget.current)?.focus()
      focusTarget.current = null
    }
  }, [delivery.lines])

  useEffect(() => {
    const controller = new AbortController()
    const options = { signal: controller.signal }
    const report = (error) => {
      if (!controller.signal.aborted) {
        toast.error(errorMessage(t, error))
      }
    }

    // Three independent lists; one failing does not keep the others off the screen.
    listSuppliers(options)
      .then((loaded) => setSuppliers(loaded.filter((supplier) => supplier.active)))
      .catch(report)
    listReceipts({}, options)
      .then((page) => setRecent(page.items))
      .catch(report)
    getCategoryTree(options).then(setTree).catch(report)

    return () => controller.abort()
  }, [t])

  useScanner(scan, { enabled: !productDialog.open && !supplierDialogOpen })

  async function scan(code) {
    setQuery('')

    try {
      addLine(await findByBarcode(code), code)
    } catch (error) {
      // A code nobody registered yet: the product is registered here, without losing the
      // delivery, and joins it right after.
      if (error instanceof ApiError && error.isNotFound) {
        setProductDialog({ open: true, barcode: code })
      } else {
        toast.error(errorMessage(t, error))
      }
    }
  }

  // A new line takes the cursor to its cost, the next thing to type. A scan that only adds
  // one to an existing line leaves the cursor where it is: that key is on no field.
  function addLine(product, code) {
    focusTarget.current = `cost-${delivery.add(product, code)}`
  }

  // Picked by name: the product's main code, the one its stock is counted in.
  function pick(product) {
    const main = product.packagings.find((packaging) => packaging.isDefault) ?? product.packagings[0]
    addLine(product, main.displayGtin)
  }

  async function register(fields) {
    const product = await createProduct(fields)
    setProductDialog({ open: false, barcode: '' })
    addLine(product, fields.barcode)
    toast.success(t('receiving.productCreated'))
  }

  function splitLine(key) {
    focusTarget.current = `expiry-${delivery.split(key)}`
  }

  function changeLine(key, changes) {
    delivery.change(key, changes)
    // What was flagged on the line is being fixed; the highlight goes as the person types.
    setProblems((current) => (key in current ? omit(current, key) : current))
  }

  function supplierCreated(supplier) {
    setSuppliers((current) => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    setDetails((current) => ({ ...current, supplierId: supplier.id }))
    setSupplierDialogOpen(false)
    toast.success(t('receiving.supplier.created'))
  }

  function clear() {
    delivery.clear()
    setProblems({})
    setDetails({ supplierId: NO_SUPPLIER, invoiceNumber: '', note: '' })
  }

  async function submit() {
    const found = findProblems(delivery.lines, minDate)
    const first = delivery.lines.find((line) => line.key in found)

    if (first) {
      setProblems(found)
      document.getElementById(`${found[first.key]}-${first.key}`)?.focus()
      toast.error(t('receiving.fix', { count: Object.keys(found).length }))
      return
    }

    setBusy(true)

    try {
      const receipt = await receiveGoods({
        lines: toReceiptLines(delivery.lines),
        supplierId: details.supplierId === NO_SUPPLIER ? undefined : details.supplierId,
        invoiceNumber: details.invoiceNumber.trim() || undefined,
        note: details.note.trim() || undefined,
      })
      const summary = summaryOf(receipt)

      clear()
      setRecent((current) => [summary, ...current])

      toast.success(t('receiving.toast.received'), {
        description: t('receiving.toast.receivedHint', {
          total: formatCents(receipt.totalCostCents),
          items: t('receiving.items', { count: summary.lineCount }),
        }),
        action: { label: t('receiving.toast.undo'), onClick: () => undo(receipt.id) },
        duration: 10_000,
      })
    } catch (error) {
      // The API names the refused line, counted in the order the lines went out - the
      // order on screen.
      const line = error instanceof ApiError && error.line ? delivery.lines[error.line - 1] : null
      const message = errorMessage(t, error)

      if (line) {
        setProblems({ [line.key]: FIELD_OF_ERROR[error.code] ?? true })
      }
      toast.error(line ? t('receiving.lineProblem', { name: line.product.name, message }) : message)
    } finally {
      setBusy(false)
    }
  }

  async function undo(id) {
    try {
      const cancelled = await cancelReceipt(id)
      setRecent((current) => current.map((entry) => (entry.id === id ? { ...entry, status: cancelled.status } : entry)))
      toast(t('receiving.toast.undone'))
    } catch (error) {
      toast.error(errorMessage(t, error))
    }
  }

  const empty = delivery.lines.length === 0
  const missingCost = delivery.lines.filter((line) => line.costCents === null).length

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_22rem]">
      <section className="flex min-w-0 flex-col gap-6 p-6 lg:p-8">
        <header className="grid gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">{t('receiving.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('receiving.subtitle')}</p>
          <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {t('receiving.items', { count: delivery.lines.length })}
          </span>
        </header>

        <ProductSearchField
          query={query}
          onQueryChange={setQuery}
          onCode={scan}
          onPick={pick}
          placeholder={t('receiving.scanPlaceholder')}
        />

        {empty ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{t('receiving.empty')}</p>
        ) : (
          <ul className="grid gap-2">
            {delivery.lines.map((line) => (
              <DeliveryLine
                key={line.key}
                line={line}
                problem={problems[line.key]}
                minDate={minDate}
                onChange={(changes) => changeLine(line.key, changes)}
                onRemove={() => delivery.remove(line.key)}
                onSplit={() => splitLine(line.key)}
              />
            ))}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-6 border-t bg-card p-5 lg:border-t-0 lg:border-l">
        <div className="grid gap-4">
          <h2 className="text-sm font-semibold">{t('receiving.details')}</h2>

          <div className="grid gap-1.5">
            <Label htmlFor="receiving-supplier">{t('receiving.supplier.label')}</Label>
            <div className="flex gap-2">
              <Select value={details.supplierId} onValueChange={(supplierId) => setDetails((current) => ({ ...current, supplierId }))}>
                <SelectTrigger id="receiving-supplier" className="h-9 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  <SelectItem value={NO_SUPPLIER}>{t('receiving.supplier.none')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                aria-label={t('receiving.supplier.new')}
                title={t('receiving.supplier.new')}
                onClick={() => setSupplierDialogOpen(true)}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="receiving-invoice">{t('receiving.invoice')}</Label>
            <Input
              id="receiving-invoice"
              maxLength={30}
              autoComplete="off"
              value={details.invoiceNumber}
              onChange={(event) => setDetails((current) => ({ ...current, invoiceNumber: event.target.value }))}
              className="h-9 font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="receiving-note">{t('receiving.note')}</Label>
            <Input
              id="receiving-note"
              maxLength={200}
              autoComplete="off"
              value={details.note}
              onChange={(event) => setDetails((current) => ({ ...current, note: event.target.value }))}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl bg-accent p-4 text-accent-foreground">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{t('receiving.total')}</span>
            <span className="text-xs">{t('receiving.units', { count: delivery.units })}</span>
          </div>
          <span className="text-4xl font-semibold tracking-tight">{formatCents(delivery.totalCents)}</span>
          {missingCost > 0 && <span className="text-xs">{t('receiving.missingCost', { count: missingCost })}</span>}
          <div className="flex gap-2">
            <Button className="h-10 flex-1" disabled={empty || busy} onClick={submit}>
              {t('receiving.submit')}
            </Button>
            <Button variant="outline" className="h-10 bg-card" disabled={empty || busy} onClick={clear}>
              {t('receiving.clear')}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <h2 className="text-sm font-semibold">{t('receiving.recent')}</h2>
          {recent.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{t('receiving.recentEmpty')}</p>
          ) : (
            <ul className="grid gap-2">
              {recent.map((receipt) => (
                <RecentReceipt key={receipt.id} receipt={receipt} onUndo={() => undo(receipt.id)} />
              ))}
            </ul>
          )}
        </div>
      </aside>

      <ProductDialog
        open={productDialog.open}
        onOpenChange={(open) => setProductDialog((current) => ({ ...current, open }))}
        barcode={productDialog.barcode}
        categories={categories}
        defaultCategoryId={null}
        onSubmit={register}
      />

      <SupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} onCreated={supplierCreated} />
    </div>
  )
}

function RecentReceipt({ receipt, onUndo }) {
  const { t } = useTranslation()
  const cancelled = receipt.status === 'Cancelled'
  const undoable = !cancelled && new Date(receipt.cancellableUntil) > new Date()

  return (
    <li className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
      <div className="grid min-w-0">
        <span className={cn('font-mono text-sm tabular-nums', cancelled ? 'text-muted-foreground line-through' : 'text-money')}>
          {formatCents(receipt.totalCostCents)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {receipt.supplierName ?? t('receiving.supplier.none')}
          {receipt.invoiceNumber && ` · ${invoiceLabel(t, receipt.invoiceNumber)}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {timeOf.format(new Date(receipt.receivedAt))} · {t('receiving.items', { count: receipt.lineCount })}
        </span>
      </div>
      {cancelled ? (
        <span className="text-xs text-muted-foreground">{t('receiving.cancelled')}</span>
      ) : (
        undoable && (
          <Button variant="ghost" size="sm" onClick={onUndo}>
            {t('receiving.undo')}
          </Button>
        )
      )}
    </li>
  )
}

// "NF 48213" - unless the number was typed with its prefix, "NF-48213", which stays as is.
function invoiceLabel(t, number) {
  return /^nf/i.test(number) ? number : t('receiving.invoiceShort', { number })
}

// A full receipt, as POST answers it, cut down to what the recent list shows - the shape
// GET /api/receipts lists.
function summaryOf(receipt) {
  return {
    id: receipt.id,
    receivedAt: receipt.receivedAt,
    supplierName: receipt.supplierName,
    invoiceNumber: receipt.invoiceNumber,
    lineCount: receipt.lines.length,
    totalCostCents: receipt.totalCostCents,
    status: receipt.status,
    cancellableUntil: receipt.cancellableUntil,
  }
}

// The object without one of its keys. The rest syntax collects every other key into `rest`.
function omit(object, key) {
  const { [key]: _removed, ...rest } = object
  return rest
}
