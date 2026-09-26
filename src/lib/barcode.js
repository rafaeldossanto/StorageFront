// A barcode printed as EAN-13 ("7891000000014") and the same code kept as GTIN-14 by the
// API ("07891000000014") are one code: the shorter forms are the longer one without its
// leading zeros.
export function toGtin14(code) {
  return String(code).trim().padStart(14, '0')
}

// Digits only, as long as a product barcode can be: what was typed is a code, not a name.
export function isTypedBarcode(text) {
  return /^\d{8,14}$/.test(text)
}

// Which of a product's codes was scanned, and so which packaging came in: the can or the
// twelve-pack. Null when the code is not on the product.
export function packagingFor(product, scanned) {
  const gtin = toGtin14(scanned)
  return product.packagings.find((candidate) => candidate.gtin === gtin) ?? null
}

// Which of a product's codes was scanned, and so how many units it stands for: the can is
// 1, the twelve-pack is 12. Falls back to one unit when the code is not on the product.
export function unitsFor(product, scanned) {
  return packagingFor(product, scanned)?.conversionFactor ?? 1
}
