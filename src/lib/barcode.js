// A barcode printed as EAN-13 ("7891000000014") and the same code kept as GTIN-14 by the
// API ("07891000000014") are one code: the shorter forms are the longer one without its
// leading zeros.
export function toGtin14(code) {
  return String(code).trim().padStart(14, '0')
}

// Which of a product's codes was scanned, and so how many units it stands for: the can is
// 1, the twelve-pack is 12. Falls back to one unit when the code is not on the product.
export function unitsFor(product, scanned) {
  const gtin = toGtin14(scanned)
  const packaging = product.packagings.find((candidate) => candidate.gtin === gtin)
  return packaging?.conversionFactor ?? 1
}
