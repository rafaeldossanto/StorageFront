import { api } from './client'
import { onSessionChange } from './session'

// The sales routes of the API. Shapes are in the contract, Storage/openapi/storage-api.json.

// What a product costs today, discounts included:
// { regularPriceCents, finalPriceCents, discountCents, applied: [...] }.
export function getPriceQuote(productId, options) {
  return api.get(`/api/products/${productId}/price`, options)
}

// items: [{ productId, quantity }], quantity in base units (a twelve-pack is 12).
// Answers { id, soldAt, status, totalCents, lines, cancellableUntil }.
export function registerSale(items) {
  return api.post('/api/sales', { items })
}

// The undo, for ten minutes after the sale.
export function cancelSale(id) {
  return api.post(`/api/sales/${id}/cancel`)
}

// { configured, lockedUntil }
export function getPinStatus(options) {
  return api.get('/api/sales/pin', options)
}

// The owner sets or replaces the PIN.
export function setPin(pin) {
  return api.put('/api/sales/pin', { pin })
}

// The right PIN trades for a pass: { token, expiresAt }.
export function unlockSales(pin) {
  return api.post('/api/sales/unlock', { pin })
}

// period: 'Day' | 'Month' | 'Year'; date: 'YYYY-MM-DD', any day inside the period.
export function getSalesReport({ period, date }, pass, options) {
  return api.get('/api/sales/report', {
    ...options,
    query: { period, date },
    headers: { 'X-Sales-Access': pass },
  })
}

// ---- the pass to the sales area ---------------------------------------------------
//
// Kept in memory like the access token: leaving the page and coming back within fifteen
// minutes finds it still open, a reload asks the PIN again. It is forgotten on sign-out,
// so the next person at the till does not inherit it.

let pass = null

export function getSalesPass() {
  // Past its time, a pass is as good as none.
  return pass !== null && new Date(pass.expiresAt) > new Date() ? pass : null
}

export function keepSalesPass(newPass) {
  pass = newPass
}

export function forgetSalesPass() {
  pass = null
}

onSessionChange((account) => {
  if (account === null) {
    forgetSalesPass()
  }
})
