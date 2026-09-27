import { useTranslation } from 'react-i18next'
import { CopyPlusIcon, MinusIcon, PlusIcon, XIcon } from 'lucide-react'
import { ProductThumb } from '@/components/ProductThumb'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCents } from '@/lib/money'
import { cn } from '@/lib/utils'

// One line of the delivery: a product as it was scanned - the can or the twelve-pack -
// how many came, what each cost on the invoice, and until when they last.
//
// `problem` names the field to fix ('quantity', 'cost', 'expiry') or is true when the API
// refused the line as a whole.
export function DeliveryLine({ line, problem, minDate, onChange, onRemove, onSplit }) {
  const { t } = useTranslation()
  const { product } = line
  const set = (field) => (value) => onChange({ [field]: value })

  const pack = line.factor > 1
  const total = line.costCents === null ? null : line.costCents * line.quantity

  return (
    <li className={cn('grid gap-3 rounded-xl border bg-card p-3', problem && 'border-destructive ring-2 ring-destructive/20')}>
      <div className="flex items-start gap-3">
        <ProductThumb product={product} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {pack
              ? line.packagingName
                ? t('receiving.line.namedPack', { name: line.packagingName, count: line.factor })
                : t('receiving.line.pack', { count: line.factor })
              : t('receiving.line.unit')}
            {' · '}
            <span className="font-mono">{line.barcode}</span>
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t('receiving.line.remove', { name: product.name })} onClick={onRemove}>
          <XIcon />
        </Button>
      </div>

      {/* The total gets a fixed width: sized by its content, "—" and "R$ 25,90" would
          line the other columns up differently from one line to the next. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_1fr_7rem] sm:items-start">
        <div className="grid gap-1.5">
          <Label htmlFor={`quantity-${line.key}`}>{t('receiving.line.quantity')}</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t('receiving.line.decrease', { name: product.name })}
              disabled={line.quantity <= 1}
              onClick={() => set('quantity')(line.quantity - 1)}
            >
              <MinusIcon />
            </Button>
            <Input
              id={`quantity-${line.key}`}
              inputMode="numeric"
              autoComplete="off"
              // 0 stands for a field left empty while the person types a new number.
              value={line.quantity === 0 ? '' : String(line.quantity)}
              onChange={(event) => set('quantity')(Number(event.target.value.replace(/\D/g, '').slice(0, 6)))}
              aria-invalid={problem === 'quantity' || undefined}
              className="h-8 w-14 text-center font-mono tabular-nums"
            />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t('receiving.line.increase', { name: product.name })}
              onClick={() => set('quantity')(line.quantity + 1)}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`cost-${line.key}`}>{pack ? t('receiving.line.packCost') : t('receiving.line.unitCost')}</Label>
          <MoneyInput
            id={`cost-${line.key}`}
            cents={line.costCents}
            onCentsChange={set('costCents')}
            invalid={problem === 'cost'}
            className="h-8"
          />
          {pack && line.costCents !== null && (
            <span className="text-xs text-muted-foreground">
              {t('receiving.line.perUnit', { price: formatCents(Math.round(line.costCents / line.factor)) })}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`expiry-${line.key}`}>{t('receiving.line.expiry')}</Label>
          {product.tracksExpiry ? (
            <Input
              id={`expiry-${line.key}`}
              type="date"
              min={minDate}
              value={line.expiryDate}
              onChange={(event) => set('expiryDate')(event.target.value)}
              aria-invalid={problem === 'expiry' || undefined}
              className="h-8"
            />
          ) : (
            <span className="flex h-8 items-center text-xs text-muted-foreground">{t('receiving.line.noExpiry')}</span>
          )}
        </div>

        <div className="grid justify-items-end gap-1.5">
          <span className="text-xs text-muted-foreground">
            {pack ? t('receiving.line.units', { count: line.quantity * line.factor }) : t('receiving.line.total')}
          </span>
          <span className="flex h-8 items-center font-mono text-sm font-medium text-money tabular-nums">
            {total === null ? '—' : formatCents(total)}
          </span>
        </div>
      </div>

      {product.tracksExpiry && (
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={onSplit}>
          <CopyPlusIcon />
          {t('receiving.line.split')}
        </Button>
      )}
    </li>
  )
}
