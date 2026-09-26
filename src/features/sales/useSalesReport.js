import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/errors'
import { getSalesReport } from '@/api/sales'

// The report for a period. While a new period loads, the previous report stays on screen
// (the screen dims it) instead of flashing empty: the numbers are replaced, not erased.
export function useSalesReport({ period, date, pass, onLocked }) {
  const [state, setState] = useState({ report: null, key: null, error: null })
  const key = `${period}:${date}`

  // The parent's callback is a new function on every render; kept in a ref it does not
  // restart the request each time, which would loop forever.
  const locked = useRef(onLocked)

  useEffect(() => {
    locked.current = onLocked
  })

  useEffect(() => {
    const controller = new AbortController()

    getSalesReport({ period, date }, pass, { signal: controller.signal })
      .then((report) => setState({ report, key, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }
        // The pass ran out or was refused: back to the PIN.
        if (error instanceof ApiError && error.code === 'sales.locked') {
          locked.current()
          return
        }
        setState((current) => ({ ...current, key, error }))
      })

    return () => controller.abort()
  }, [period, date, pass, key])

  return {
    report: state.report,
    loading: state.key !== key,
    error: state.key === key ? state.error : null,
  }
}
