import { useCallback, useRef, useState } from 'react'
import { getPriceQuote } from '@/api/sales'

// The sale being rung up: which products, how many units of each, and at what price.
//
// A product shows its regular price the moment it is scanned and switches to the price
// the discount rules give as soon as the API answers. The API prices the sale again when
// it is concluded, so what is charged never depends on this screen being right.
export function useCart() {
  const [items, setItems] = useState([])

  // Products whose price was already asked for. A ref, not state: it never changes what is
  // drawn, and it must be read right away - a function passed to setItems only runs later,
  // on the next render, so it cannot tell us now whether the product was new.
  const quoted = useRef(new Set())

  const add = useCallback((product, units) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.product.id === product.id)

      if (index >= 0) {
        const item = current[index]
        // The product scanned again moves to the top, where the eye already is.
        // `toSpliced` returns a copy without that position, leaving `current` untouched.
        return [{ ...item, quantity: item.quantity + units }, ...current.toSpliced(index, 1)]
      }

      return [
        { product, quantity: units, unitPriceCents: product.salePriceCents, regularPriceCents: product.salePriceCents },
        ...current,
      ]
    })

    if (!quoted.current.has(product.id)) {
      quoted.current.add(product.id)

      getPriceQuote(product.id)
        .then((quote) =>
          setItems((current) =>
            current.map((item) =>
              item.product.id === product.id
                ? { ...item, unitPriceCents: quote.finalPriceCents, regularPriceCents: quote.regularPriceCents }
                : item,
            ),
          ),
        )
        // Without a quote the regular price stays on screen; the sale is priced by the API anyway.
        .catch(() => quoted.current.delete(product.id))
    }
  }, [])

  const remove = useCallback((productId) => {
    quoted.current.delete(productId)
    setItems((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const setQuantity = useCallback(
    (productId, quantity) => {
      if (quantity < 1) {
        remove(productId)
        return
      }
      setItems((current) => current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
    },
    [remove],
  )

  const clear = useCallback(() => {
    quoted.current.clear()
    setItems([])
  }, [])

  // `reduce` walks the array carrying a running value - here, the total so far.
  const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  const units = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, totalCents, units, add, setQuantity, remove, clear }
}
