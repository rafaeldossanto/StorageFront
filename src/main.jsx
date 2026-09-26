import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18nReady } from './i18n'
import App from './App.jsx'
import './index.css'

// Top-level await: a module can wait before anything else runs. Translations are bundled,
// so this resolves at once; waiting still guarantees the first render never flashes a raw
// key.
await i18nReady

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
