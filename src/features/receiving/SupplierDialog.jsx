import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '@/api/errors'
import { createSupplier } from '@/api/receiving'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// A new supplier, registered without leaving the delivery being entered. `onCreated`
// receives it, so the screen can pick it at once.
export function SupplierDialog({ open, onOpenChange, onCreated }) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" closeLabel={t('common.close')}>
        {open && <SupplierForm onCreated={onCreated} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SupplierForm({ onCreated, onCancel }) {
  const { t } = useTranslation()
  const id = useId()
  const [fields, setFields] = useState({ name: '', taxId: '', contact: '' })
  const [state, setState] = useState({ busy: false, problem: null })

  const change = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setState({ busy: true, problem: null })

    try {
      onCreated(await createSupplier(fields))
    } catch (error) {
      setState({ busy: false, problem: errorMessage(t, error) })
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-base">{t('receiving.supplier.newTitle')}</DialogTitle>
        <DialogDescription>{t('receiving.supplier.newHint')}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>{t('receiving.supplier.name')}</Label>
        <Input id={`${id}-name`} name="name" required autoFocus value={fields.name} onChange={change} className="h-9" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-tax`}>{t('receiving.supplier.taxId')}</Label>
        <Input id={`${id}-tax`} name="taxId" value={fields.taxId} onChange={change} className="h-9 font-mono" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-contact`}>{t('receiving.supplier.contact')}</Label>
        <Input id={`${id}-contact`} name="contact" value={fields.contact} onChange={change} className="h-9" />
      </div>

      {state.problem && (
        <p role="alert" className="text-sm text-destructive">
          {state.problem}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={state.busy} onClick={onCancel}>
          {t('products.form.cancel')}
        </Button>
        <Button type="submit" disabled={state.busy}>
          {t('receiving.supplier.create')}
        </Button>
      </DialogFooter>
    </form>
  )
}
