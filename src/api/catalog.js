import { api } from './client'

// The catalogue routes of the API, one function each, so screens call
// `findByBarcode(code)` instead of assembling URLs. Shapes are in the API's contract,
// Storage/openapi/storage-api.json.

// The shop's category tree: [{ id, name, depth, active, children: [...] }].
export function getCategoryTree(options) {
  return api.get('/api/categories', options)
}

// encodeURIComponent keeps whatever was typed from breaking the address: a "/" in it
// would otherwise read as another path segment.
export function findByBarcode(barcode, options) {
  return api.get(`/api/products/by-barcode/${encodeURIComponent(barcode)}`, options)
}

// A page of a category's products, its whole branch by default:
// { items, page, pageSize, total, totalPages }.
export function listProducts({ categoryId, page = 1, pageSize = 24 }, options) {
  return api.get('/api/products', { ...options, query: { categoryId, page, pageSize } })
}

export function searchProducts({ search, page = 1, pageSize = 24 }, options) {
  return api.get('/api/products', { ...options, query: { search, page, pageSize } })
}

// ProductDialog hands its fields over in this same shape, so a screen passes them straight on.
export function createProduct({ barcode, name, categoryId, salePriceCents, baseUnit, minimumStock, tracksExpiry }) {
  return api.post('/api/products', { barcode, name, categoryId, salePriceCents, baseUnit, minimumStock, tracksExpiry })
}

// The API takes the whole editable set each time, not only what changed.
export function updateProduct(id, { name, categoryId, salePriceCents, minimumStock, tracksExpiry }) {
  return api.put(`/api/products/${id}`, { name, categoryId, salePriceCents, minimumStock, tracksExpiry })
}

// Only for a product nothing refers to yet - the undo right after registering. One with a
// history answers product.in_use.
export function deleteProduct(id) {
  return api.delete(`/api/products/${id}`)
}

// Turns the tree into a flat list in reading order, each entry knowing its path:
// [{ id, name, depth, path: 'Bebidas › Energéticos' }]. What a <select> needs.
export function flattenCategories(tree) {
  const flat = []

  // A function that calls itself - recursion - is the natural way to walk a tree whose
  // depth is not known in advance.
  function visit(nodes, trail) {
    for (const node of nodes) {
      const path = [...trail, node.name]
      flat.push({ id: node.id, name: node.name, depth: path.length - 1, path: path.join(' › ') })
      visit(node.children ?? [], path)
    }
  }

  visit(tree, [])
  return flat
}

// The tree without deactivated categories: they take no new products, so no screen offers them.
export function activeCategories(nodes) {
  return nodes
    .filter((node) => node.active)
    .map((node) => ({ ...node, children: activeCategories(node.children ?? []) }))
}
