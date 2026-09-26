import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatCents } from '@/lib/money'

const UNITS = ['Unit', 'Kilogram', 'Liter']

// Registers a new product or edits one. Opened by a scan more often than by a click: an
// unknown code arrives here already filled in, and the cursor waits on the name.
//
// The parent does the talking to the API through onSubmit/onDelete, which return
// Promises; a refusal comes back here and is shown above the buttons.
export function ProductDialog({ open, onOpenChange, product, barcode, categories, defaultCategoryId, onSubmit, onDelete }) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" closeLabel={t('common.close')}>
        {/* The form is its own component, mounted only while the dialog is open: every
            opening starts from fresh state instead of what the last product left behind. */}
        {open && (
          <ProductForm
            product={product}
            barcode={barcode}
            categories={categories}
            defaultCategoryId={defaultCategoryId}
            onSubmit={onSubmit}
            onDelete={onDelete}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProductForm({ product, barcode, categories, defaultCategoryId, onSubmit, onDelete, onCancel }) {
  const { t } = useTranslation()

  // useId gives each field a unique id, so every <Label htmlFor> points at its own input
  // even with two forms on the page.
  const id = useId()
  const editing = product != null

  const [fields, setFields] = useState(() => ({
    barcode: barcode ?? '',
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? defaultCategoryId ?? '',
    priceCents: product?.salePriceCents ?? null,
    baseUnit: product?.baseUnit ?? 'Unit',
    minimumStock: product?.minimumStock ?? 0,
    tracksExpiry: product?.tracksExpiry ?? true,
  }))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [showPriceError, setShowPriceError] = useState(false)

  // One setter for every field: set('name')('Leite') returns a copy of the fields with
  // name changed. A function returning a function - currying - keeps the JSX short.
  const set = (name) => (value) => setFields((current) => ({ ...current, [name]: value }))

  const selectedCategory = categories.find((category) => category.id === fields.categoryId)

  async function submit(event) {
    // A <form> would reload the page on submit; preventDefault keeps it a single-page app.
    event.preventDefault()

    if (fields.priceCents === null) {
      setShowPriceError(true)
      return
    }
    if (!fields.categoryId) {
      setProblem(t('products.form.categoryRequired'))
      return
    }

    setBusy(true)
    setProblem(null)

    try {
      await onSubmit(fields)
    } catch (error) {
      setProblem(errorMessage(t, error))
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setProblem(null)

    try {
      await onDelete(product)
    } catch (error) {
      setProblem(errorMessage(t, error))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-base">{editing ? product.name : t('products.form.createTitle')}</DialogTitle>
        <DialogDescription>{editing ? t('products.form.editHint') : t('products.form.createHint')}</DialogDescription>
      </DialogHeader>

      {editing ? (
        <div className="grid gap-1.5">
          <Label>{t('products.form.packagings')}</Label>
          <ul className="grid gap-1 rounded-lg border bg-muted/40 p-2 text-sm">
            {product.packagings.map((packaging) => (
              <li key={packaging.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{packaging.displayGtin}</span>
                <span className="text-xs text-muted-foreground">
                  {packaging.name ? `${packaging.name} · ` : ''}
                  {t('products.form.packagingUnits', { count: packaging.conversionFactor })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-barcode`}>{t('products.form.barcode')}</Label>
          <Input
            id={`${id}-barcode`}
            value={fields.barcode}
            onChange={(event) => set('barcode')(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            autoFocus={!barcode}
            className="h-9 font-mono"
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>{t('products.form.name')}</Label>
        <Input
          id={`${id}-name`}
          value={fields.name}
          onChange={(event) => set('name')(event.target.value)}
          placeholder={t('products.form.namePlaceholder')}
          autoComplete="off"
          autoFocus={Boolean(barcode) || editing}
          required
          className="h-9"
        />
      </div>

      <div className="grid grid-cols-[1fr_9rem] gap-3">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${id}-category`}>{t('products.form.category')}</Label>
          <Select value={fields.categoryId} onValueChange={set('categoryId')}>
            <SelectTrigger id={`${id}-category`} className="h-9 w-full min-w-0">
              <SelectValue placeholder={t('products.form.categoryPlaceholder')}>
                {selectedCategory?.path}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span style={{ paddingLeft: `${category.depth * 14}px` }}>{category.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-price`}>{t('products.form.price')}</Label>
          <MoneyInput
            id={`${id}-price`}
            cents={fields.priceCents}
            onCentsChange={(cents) => {
              set('priceCents')(cents)
              setShowPriceError(false)
            }}
            invalid={showPriceError}
          />
        </div>
      </div>
      {showPriceError && <p className="-mt-2 text-xs text-destructive">{t('products.form.priceInvalid')}</p>}

      <div className="flex items-center justify-between gap-3">
        <Label>{t('products.form.unit')}</Label>
        {editing ? (
          <span className="text-sm text-muted-foreground">{t(`products.form.units.${fields.baseUnit}`)}</span>
        ) : (
          <ToggleGroup
            type="single"
            value={fields.baseUnit}
            // Radix sends '' when the pressed item is clicked again; a unit is always required.
            onValueChange={(value) => value && set('baseUnit')(value)}
            className="rounded-full bg-muted p-0.5"
            spacing={0}
          >
            {UNITS.map((unit) => (
              <ToggleGroupItem
                key={unit}
                value={unit}
                size="sm"
                className="rounded-full px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {t(`products.form.units.${unit}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <Label htmlFor={`${id}-minimum`}>{t('products.form.minimumStock')}</Label>
          <span className="text-xs text-muted-foreground">{t('products.form.minimumStockHint')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('products.form.decrease')}
            onClick={() => set('minimumStock')(Math.max(0, fields.minimumStock - 1))}
          >
            <MinusIcon />
          </Button>
          <input
            id={`${id}-minimum`}
            value={fields.minimumStock}
            inputMode="numeric"
            onChange={(event) => {
              // Keeps only the digits; an empty field reads as zero.
              const digits = event.target.value.replace(/\D/g, '')
              set('minimumStock')(digits === '' ? 0 : Math.min(Number(digits), 1_000_000))
            }}
            className="w-12 bg-transparent text-center font-mono text-sm tabular-nums outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('products.form.increase')}
            onClick={() => set('minimumStock')(fields.minimumStock + 1)}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>

      <label
        htmlFor={`${id}-expiry`}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">{t('products.form.tracksExpiry')}</span>
          <span className="text-xs text-muted-foreground">{t('products.form.tracksExpiryHint')}</span>
        </span>
        <Switch
          id={`${id}-expiry`}
          aria-label={t('products.form.tracksExpiry')}
          checked={fields.tracksExpiry}
          onCheckedChange={set('tracksExpiry')}
        />
      </label>

      <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2.5 text-accent-foreground">
        <span className="text-xs">
          {t('products.form.summary')} ·{' '}
          {t('products.form.perUnit', { unit: t(`products.form.unitWords.${fields.baseUnit}`) })}
        </span>
        <span className="font-mono text-base font-semibold tabular-nums">
          {fields.priceCents === null ? '—' : formatCents(fields.priceCents)}
        </span>
      </div>

      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}

      <DialogFooter className="items-center sm:justify-between">
        {editing ? (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={remove}>
            {t('products.form.delete')}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {t('products.form.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {editing ? t('products.form.save') : t('products.form.create')}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
