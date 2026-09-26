import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api/client'

// A deliberately bare shell: the visual library is still an open decision, and the first
// real screens wait for it. What this does prove is the whole wiring - the API client, the
// API address, CORS and the translations.
//
// A React component is just a function that returns what to draw. JSX - the HTML-looking
// part - is compiled by Vite into plain function calls.
export default function App() {
  const { t } = useTranslation()

  // useState keeps a value between renders and returns [current value, setter]. Calling
  // the setter redraws the component with the new value.
  const [status, setStatus] = useState('checking')

  // useEffect runs after the component is drawn. The empty [] at the end means "only
  // once, when it first appears" - a good place to fetch data.
  useEffect(() => {
    let current = true

    api
      .get('/health')
      .then(() => current && setStatus('online'))
      .catch(() => current && setStatus('offline'))

    // The function returned here runs when the component goes away. It closes over
    // `current` - a closure: an inner function keeps access to the variables around it
    // even after the outer one returned. Setting it to false stops a late answer from
    // updating a screen that is no longer there.
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
