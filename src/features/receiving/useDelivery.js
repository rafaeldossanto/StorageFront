import { useRef, useState } from 'react'
import { packagingFor } from '@/lib/barcode'

// The delivery being entered: its lines, newest on top, and what they add up to.
//
// A line is { key, product, barcode, factor, packagingName, quantity, costCents, expiryDate }.
// `key` is ours, not the product's: the same product comes in two lines when half of it
// expires on another date.
export function useDelivery() {
  const [lines, setLines] = useState([])
  const lastKey = useRef(0)

  function newKey() {
    lastKey.current += 1
    return lastKey.current
  }

  // The same code scanned again adds one to its line. Returns the key a new line would
  // get - a key no line has means the scan went into an existing one.
  //
  // The check happens inside the updater, against the latest lines: two scans answered by
  // the API before React re-renders would otherwise both see "no line yet".
  function add(product, code) {
    const key = newKey()
    const packaging = packagingFor(product, code)
    const barcode = packaging?.displayGtin ?? code

    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id && line.barcode === barcode)

      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
      }

      const line = {
        key,
        product,
        barcode,
        factor: packaging?.conversionFactor ?? 1,
        packagingName: packaging?.name ?? null,
        quantity: 1,
        costCents: null,
        expiryDate: '',
      }
      return [line, ...current]
    })

    return key
  }

  function change(key, changes) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)))
  }

  function remove(key) {
    setLines((current) => current.filter((line) => line.key !== key))
  }

  // Part of a line expiring on another date: a copy right under it, with the same cost and
  // its own date and quantity.
  function split(key) {
    const copyKey = newKey()

    setLines((current) =>
      current.flatMap((line) => (line.key === key ? [line, { ...line, key: copyKey, quantity: 1, expiryDate: '' }] : [line])),
    )

    return copyKey
  }

  function clear() {
    setLines([])
  }

  // A newer copy of a product already in the delivery - the same one, now with its photo.
  function refreshProduct(product) {
    setLines((current) => current.map((line) => (line.product.id === product.id ? { ...line, product } : line)))
  }

  // Lines still without a cost count as zero here; they are flagged before anything is sent.
  const totalCents = lines.reduce((sum, line) => sum + (line.costCents ?? 0) * line.quantity, 0)
  const units = lines.reduce((sum, line) => sum + line.quantity * line.factor, 0)

  return { lines, totalCents, units, add, change, remove, split, clear, refreshProduct }
}

// What is wrong with each line before the API is asked: { [key]: 'quantity' | 'cost' | 'expiry' }.
// Dates are 'YYYY-MM-DD', so comparing the text compares the days.
export function findProblems(lines, today) {
  const problems = {}

  for (const line of lines) {
    if (line.quantity < 1) {
      problems[line.key] = 'quantity'
    } else if (line.costCents === null) {
      problems[line.key] = 'cost'
    } else if (line.product.tracksExpiry && (line.expiryDate === '' || line.expiryDate < today)) {
      problems[line.key] = 'expiry'
    }
  }

  return problems
}

// The lines as POST /api/receipts takes them. JSON leaves `undefined` out, so goods that
// do not spoil go without a date.
export function toReceiptLines(lines) {
  return lines.map((line) => ({
    barcode: line.barcode,
    quantity: line.quantity,
    costCents: line.costCents,
    expiryDate: line.product.tracksExpiry ? line.expiryDate : undefined,
  }))
}
