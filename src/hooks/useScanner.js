import { useEffect, useRef } from 'react'
import { createScanDetector, DEFAULT_MAX_GAP_MS } from '@/lib/scanner'

// Hears a USB barcode reader anywhere on the page while `enabled`, and calls onScan(code).
//
// A hook is a function whose name starts with "use" and that calls other hooks. It lets a
// component borrow behaviour - here, a keyboard listener that lives as long as the
// component does - without the component knowing how it works.
//
// The reader types into whatever field has the cursor - the cost of the last line, say.
// Its keys are let through, and once they turn out to be a scan the field is put back as
// it was before the burst. Holding fast keys back instead would lose them whenever the run
// is not a scan after all: two keys a person presses almost together, or a test typing.
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
    let lastKeyAt = -Infinity

    // The field the first key of the current run landed in, and its value before that key.
    let before = null

    function onKeyDown(event) {
      const printable = event.key.length === 1
      const fast = event.timeStamp - lastKeyAt <= DEFAULT_MAX_GAP_MS

      if (printable && !fast) {
        // Maybe the start of a burst. keydown comes before the character is typed, so the
        // field still holds what the person had in it.
        before = isEditable(event.target) ? { field: event.target, value: event.target.value } : null
      }

      if (event.key !== 'Shift') {
        lastKeyAt = event.timeStamp
      }

      const code = detect(event.key, event.timeStamp)

      if (code !== null) {
        // The reader's Enter is ours: it must not also submit whatever field has focus.
        event.preventDefault()
        event.stopPropagation()

        if (before !== null) {
          restore(before)
        }

        before = null
        latest.current(code)
      }

      if (event.key === 'Enter') {
        lastKeyAt = -Infinity
        before = null
      }
    }

    // Capture phase: the window hears the key before any field does, so a component that
    // stops the event cannot hide a scan from us.
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [enabled])
}

function isEditable(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

// React owns the value of the fields it draws: writing `field.value` directly would be
// undone on its next render. Going through the browser's own setter and announcing an
// "input" event makes React see the change as if it had been typed, and update its state.
function restore({ field, value }) {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}
