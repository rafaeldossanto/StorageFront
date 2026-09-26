import { act } from '@testing-library/react'

// A barcode reader "typing" a code and its Enter, as useScanner sees it.
//
// Each key carries its own time, 1 ms after the last, instead of the moment it happens to
// be dispatched: with other test files running alongside, a pause of more than the 20 ms
// a scan allows can land in the middle of the loop, and the code would arrive split in
// two - "78" typed by hand and "91000000014" scanned. jsdom stamps events with Date.now(),
// so the stamps start from there and stay in line with the keys userEvent types.
export function scan(code, target = document.body) {
  const start = Date.now()

  act(() => {
    for (const [index, key] of [...code, 'Enter'].entries()) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      // timeStamp is read-only on an event; defineProperty sets it anyway.
      Object.defineProperty(event, 'timeStamp', { value: start + index })
      target.dispatchEvent(event)
    }
  })
}
