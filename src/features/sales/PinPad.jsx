import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightIcon, DeleteIcon, LockKeyholeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const PIN_MIN = 4
export const PIN_MAX = 8

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

// A PIN pad like a computer's lock screen: digits from the keyboard or the buttons,
// shown as dots, never as numbers. The parent gives it a new `key` after a wrong PIN,
// which starts it empty again.
export function PinPad({ title, hint, problem, busy, onSubmit }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')

  // The keyboard listener is attached once; it reads the latest PIN through this ref
  // instead of being attached again on every digit.
  const latest = useRef({ pin, busy, onSubmit })

  useEffect(() => {
    latest.current = { pin, busy, onSubmit }
  })

  const type = (digit) => setPin((current) => (current.length < PIN_MAX ? current + digit : current))
  const erase = () => setPin((current) => current.slice(0, -1))

  function submit() {
    const { pin: typed, busy: waiting, onSubmit: send } = latest.current
    if (typed.length >= PIN_MIN && !waiting) {
      send(typed)
    }
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (/^\d$/.test(event.key)) {
        type(event.key)
      } else if (event.key === 'Backspace') {
        erase()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        submit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="mx-auto grid w-full max-w-xs justify-items-center gap-5">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <LockKeyholeIcon className="size-5" />
      </span>

      <div className="grid gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>

      <div className="flex h-4 items-center gap-3" aria-hidden="true">
        {Array.from({ length: Math.max(PIN_MIN, pin.length) }, (_, index) => (
          <span
            key={index}
            className={cn('size-3 rounded-full border-2 border-primary transition-colors', index < pin.length && 'bg-primary')}
          />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {t('sales.pin.entered', { count: pin.length })}
      </span>

      <p role="alert" className="min-h-5 text-center text-sm text-destructive">
        {problem}
      </p>

      <div className="grid w-full grid-cols-3 gap-2">
        {KEYS.map((digit) => (
          <PadKey key={digit} label={t('sales.pin.digit', { digit })} onClick={() => type(digit)}>
            {digit}
          </PadKey>
        ))}
        <PadKey label={t('sales.pin.erase')} onClick={erase}>
          <DeleteIcon className="size-5" />
        </PadKey>
        <PadKey label={t('sales.pin.digit', { digit: '0' })} onClick={() => type('0')}>
          0
        </PadKey>
        <Button
          type="button"
          className="h-14 rounded-xl"
          aria-label={t('sales.pin.enter')}
          disabled={pin.length < PIN_MIN || busy}
          onClick={submit}
        >
          <ArrowRightIcon className="size-5" />
        </Button>
      </div>
    </div>
  )
}

function PadKey({ label, onClick, children }) {
  return (
    <Button type="button" variant="outline" className="h-14 rounded-xl bg-card text-lg font-medium" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  )
}
