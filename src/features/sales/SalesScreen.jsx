import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { LockKeyholeIcon } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { forgetSalesPass, getPinStatus, getSalesPass, keepSalesPass, setPin, unlockSales } from '@/api/sales'
import { PinPad } from './PinPad'
import { SalesReport } from './SalesReport'

// The longest delay setTimeout can hold: 2^31 - 1 milliseconds.
const MAX_TIMEOUT = 2 ** 31 - 1

// The sales area. Closed until the PIN is typed; then open for fifteen minutes on this
// device, or until someone locks it. Anyone in the team can open it with the PIN; only the
// owner creates or changes the PIN.
export function SalesScreen({ account }) {
  const [pass, setPass] = useState(getSalesPass)

  // Closes itself when the pass runs out, like a computer locking after a while.
  useEffect(() => {
    if (pass === null) {
      return undefined
    }

    // setTimeout keeps its delay in 32 bits: anything past about 24.8 days overflows and
    // fires at once. A pass never lives that long, but a clock set far ahead would lock
    // the screen the instant it opened - so the delay is capped.
    const delay = Math.min(new Date(pass.expiresAt) - new Date(), MAX_TIMEOUT)

    const timer = setTimeout(() => {
      forgetSalesPass()
      setPass(null)
    }, delay)

    return () => clearTimeout(timer)
  }, [pass])

  function unlocked(newPass) {
    keepSalesPass(newPass)
    setPass(newPass)
  }

  function lock() {
    forgetSalesPass()
    setPass(null)
  }

  return pass === null ? (
    <SalesGate account={account} onUnlock={unlocked} />
  ) : (
    <SalesReport pass={pass.token} account={account} onLock={lock} />
  )
}

function SalesGate({ account, onUnlock }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getPinStatus({ signal: controller.signal })
      .then(setStatus)
      .catch((error) => {
        if (!controller.signal.aborted) {
          toast.error(errorMessage(t, error))
        }
      })

    return () => controller.abort()
  }, [t])

  let content = null

  if (status?.configured) {
    content = <UnlockPin onUnlock={onUnlock} />
  } else if (status && account.role === 'Owner') {
    content = (
      <PinSetup
        onSaved={async (pin) => {
          onUnlock(await unlockSales(pin))
        }}
      />
    )
  } else if (status) {
    content = (
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <LockKeyholeIcon className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{t('sales.pin.title')}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{t('sales.pin.missing')}</p>
      </div>
    )
  }

  return <div className="flex min-h-full items-center justify-center p-6">{content}</div>
}

function UnlockPin({ onUnlock }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(pin) {
    setBusy(true)

    try {
      onUnlock(await unlockSales(pin))
    } catch (error) {
      setProblem(errorMessage(t, error))
      // A new key makes React throw the old pad away and draw an empty one.
      setAttempt((current) => current + 1)
      setBusy(false)
    }
  }

  return (
    <PinPad
      key={attempt}
      title={t('sales.pin.title')}
      hint={t('sales.pin.unlockHint')}
      problem={problem}
      busy={busy}
      onSubmit={submit}
    />
  )
}

// Two steps, like any new PIN: type it, then type it again. `onSaved` receives the PIN
// once the API has it.
export function PinSetup({ onSaved }) {
  const { t } = useTranslation()
  const [first, setFirst] = useState(null)
  const [problem, setProblem] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)

  async function submit(pin) {
    if (first === null) {
      setFirst(pin)
      setProblem(null)
      setAttempt((current) => current + 1)
      return
    }

    if (pin !== first) {
      setFirst(null)
      setProblem(t('sales.pin.mismatch'))
      setAttempt((current) => current + 1)
      return
    }

    setBusy(true)

    try {
      await setPin(pin)
      toast.success(t('sales.pin.saved'))
      await onSaved(pin)
    } catch (error) {
      setFirst(null)
      setProblem(errorMessage(t, error))
      setAttempt((current) => current + 1)
      setBusy(false)
    }
  }

  return (
    <PinPad
      key={attempt}
      title={t('sales.pin.createTitle')}
      hint={first === null ? t('sales.pin.createHint') : t('sales.pin.confirmHint')}
      problem={problem}
      busy={busy}
      onSubmit={submit}
    />
  )
}
