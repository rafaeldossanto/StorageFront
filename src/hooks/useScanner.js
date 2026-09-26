import { useEffect, useRef } from 'react'
import { createScanDetector } from '@/lib/scanner'

// Hears a USB barcode reader anywhere on the page while `enabled`, and calls onScan(code).
//
// A hook is a function whose name starts with "use" and that calls other hooks. It lets a
// component borrow behaviour - here, a keyboard listener that lives as long as the
// component does - without the component knowing how it works.
export function useScanner(onScan, { enabled = true } = {}) {
  // useRef keeps a value between renders without causing one. Holding the latest onScan
  // here means the listener below is attached once, not again on every render.
  const latest = useRef(onScan)

  useEffect(() => {
    latest.current = onScan
  })

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const detect = createScanDetector()

    function onKeyDown(event) {
      const code = detect(event.key, event.timeStamp)

      if (code !== null) {
        // The reader's Enter is ours: it must not also submit whatever field has focus.
        event.preventDefault()
        event.stopPropagation()
        latest.current(code)
      }
    }

    // Capture phase: the window hears the key before any field does, so a component that
    // stops the event cannot hide a scan from us.
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [enabled])
}
