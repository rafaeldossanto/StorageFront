import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api/client'
import { call } from './api/errors'

type ApiStatus = 'checking' | 'online' | 'offline'

/**
 * A deliberately bare shell: the visual library is still an open decision, and the first
 * real screens wait for it. What this does prove is the whole wiring - the typed client,
 * the API address, CORS and the translations.
 */
export default function App() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    let current = true

    call(() => api.GET('/health'))
      .then(() => current && setStatus('online'))
      .catch(() => current && setStatus('offline'))

    return () => {
      current = false
    }
  }, [])

  return (
    <main className="shell">
      <h1>{t('app.name')}</h1>
      <p className="tagline">{t('app.tagline')}</p>
      <p className={`status status--${status}`} role="status">
        {t(`status.${status}`)}
      </p>
    </main>
  )
}
