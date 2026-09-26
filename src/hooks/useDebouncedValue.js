import { useEffect, useState } from 'react'

// The value, but only once it has stopped changing for `delayMs`. A search box uses it so
// typing "energético" asks the API once, not ten times.
export function useDebouncedValue(value, delayMs = 250) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    // setTimeout runs a function later and returns an id to cancel it. Every new value
    // cancels the pending one (the cleanup below), so only the last survives.
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
