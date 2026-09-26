import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { onSessionChange, restoreSession, signOut } from '@/api/session'
import { Button } from '@/components/ui/button'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ProductsScreen } from '@/features/products/ProductsScreen'
import { AppShell } from '@/features/shell/AppShell'
import { BrandMark } from '@/features/shell/BrandMark'

// Decides what the whole page shows: nothing yet while the session is being restored,
// the sign-in page, or the app. It follows the session module - signing in, signing out
// and a session that expired all switch the page from there.
export default function App() {
  const [session, setSession] = useState({ status: 'restoring', account: null })

  // Settles the session only once the answer is in; the page shows "restoring" until then.
  const restore = useCallback(
    () =>
      restoreSession()
        .then((account) => setSession({ status: account ? 'signed-in' : 'signed-out', account }))
        // Only being offline throws here; no session at all resolves to null.
        .catch(() => setSession({ status: 'offline', account: null })),
    [],
  )

  useEffect(() => {
    const stop = onSessionChange((account) => setSession({ status: account ? 'signed-in' : 'signed-out', account }))
    restore()
    return stop
  }, [restore])

  function retry() {
    setSession({ status: 'restoring', account: null })
    restore()
  }

  switch (session.status) {
    case 'signed-in':
      return (
        <AppShell account={session.account} onSignOut={() => signOut().catch(() => {})}>
          <ProductsScreen />
        </AppShell>
      )
    case 'signed-out':
      return <AuthScreen />
    case 'offline':
      return <Offline onRetry={retry} />
    default:
      return <Restoring />
  }
}

function Restoring() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <BrandMark className="animate-pulse" />
    </div>
  )
}

function Offline({ onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <BrandMark />
      <p className="max-w-xs text-sm text-muted-foreground">{t('errors.network')}</p>
      <Button onClick={onRetry}>{t('status.retry')}</Button>
    </div>
  )
}
