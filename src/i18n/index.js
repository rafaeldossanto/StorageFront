import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './pt-BR.json'

// Every word the shopkeeper reads lives in a resource file, never in a component. Today
// there is one language; the day a customer asks for another, it is a new JSON file.
// The API never sends display text: it sends stable codes, translated here.
//
// init returns a Promise; exporting it lets main.jsx wait for it before drawing.
export const i18nReady = i18n.use(initReactI18next).init({
  resources: { 'pt-BR': { translation: ptBR } },
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
})

export default i18n
