// Tells a USB barcode reader apart from a person typing.
//
// A USB reader is a keyboard as far as the computer knows: it "types" the digits of the
// code and presses Enter. The difference is speed - a reader sends each key a few
// milliseconds after the last, far faster than any hand. That is the whole trick: a run
// of keys closer together than `maxGapMs`, ending in Enter, is a scan.
//
// Knowing which is which is what lets a screen act on a scan at once (look the product
// up, open the form already filled in) while treating typed digits as something to check
// before trusting.
//
// Usage, from a keydown listener:
//
//   const detect = createScanDetector()
//   window.addEventListener('keydown', (event) => {
//     const code = detect(event.key, event.timeStamp)
//     if (code !== null) { ... it was a scan ... }
//   })
//
// Pass `event.timeStamp`, not Date.now(): the browser stamps the event when the key
// arrived, so a page busy redrawing does not make a fast reader look slow.

// The two limits, named so the numbers mean something where they are used. Eight digits
// is the shortest product barcode (EAN-8); 20 ms is the gap no person types under.
export const DEFAULT_MAX_GAP_MS = 20
export const DEFAULT_MIN_LENGTH = 8

// A factory function: it builds and returns a detector. Each call gets its own `run` and
// `lastKeyAt`, which live on inside the returned function after the factory has returned -
// a closure. It does the job a class with private fields would in C#, with less ceremony.
export function createScanDetector({ maxGapMs = DEFAULT_MAX_GAP_MS, minLength = DEFAULT_MIN_LENGTH } = {}) {
  // The keys of the current fast run, and when the last one arrived. -Infinity makes the
  // first key of all "long after the previous one" without a special case.
  let run = ''
  let lastKeyAt = -Infinity

  // Returns the scanned code when this key completes a scan, null for every other key.
  return function detect(key, at) {
    const fast = at - lastKeyAt <= maxGapMs

    if (key === 'Enter') {
      // The reader's Enter comes as fast as its digits; a person's Enter after typing
      // fast-looking digits does not.
      const code = fast && run.length >= minLength ? run : null
      forget()
      return code
    }

    // Some readers press Shift around letters. It is not part of the code, and it must not
    // break the run either.
    if (key === 'Shift') {
      lastKeyAt = at
      return null
    }

    // Printable keys have a one-character name ('7', 'A'); the others are words ('Tab',
    // 'ArrowLeft', 'Backspace'). None of those is part of a code.
    if (key.length !== 1) {
      forget()
      return null
    }

    // A pause means whatever came before was typed: this key starts a new run.
    run = fast ? run + key : key
    lastKeyAt = at
    return null
  }

  // A function declared inside another one: visible only in there, and sharing its
  // variables. Declarations are hoisted - usable above the line that defines them.
  function forget() {
    run = ''
    lastKeyAt = -Infinity
  }
}
