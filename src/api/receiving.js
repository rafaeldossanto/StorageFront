import { api } from './client'

// Deliveries and suppliers. Shapes are in the API's contract, Storage/openapi/storage-api.json.

// lines: [{ barcode, quantity, costCents, expiryDate }] - quantity counts what was scanned
// (two twelve-packs is 2), cost is per scanned item (the pack's price), expiryDate is
// 'YYYY-MM-DD' or left out for goods that do not spoil.
export function receiveGoods({ lines, supplierId, invoiceNumber, note }) {
  return api.post('/api/receipts', { lines, supplierId, invoiceNumber, note })
}

// The undo, for ten minutes and while all of its goods are still on the shelf.
export function cancelReceipt(id) {
  return api.post(`/api/receipts/${id}/cancel`)
}

export function listReceipts({ page = 1, pageSize = 8 } = {}, options) {
  return api.get('/api/receipts', { ...options, query: { page, pageSize } })
}

// Active suppliers first: [{ id, name, taxId, contact, active }].
export function listSuppliers(options) {
  return api.get('/api/suppliers', options)
}

export function createSupplier({ name, taxId, contact }) {
  return api.post('/api/suppliers', { name, taxId, contact })
}
