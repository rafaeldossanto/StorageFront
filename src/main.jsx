import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { i18nReady } from './i18n'
import App from './App.jsx'
import './index.css'

// Top-level await: a module can wait before anything else runs. Translations are bundled,
// so this resolves at once; waiting still guarantees the first render never flashes a raw
// key.
await i18nReady

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Light by default, like the reference; the sidebar switches to dark and the choice
        is remembered on this device. `attribute="class"` puts "dark" on <html>, which is
        what the stylesheet's .dark values key on. */}
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <App />
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  </StrictMode>,
)
