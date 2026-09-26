// Runs before every test file. Most tests run in plain Node; the screen tests ask for a
// simulated browser (jsdom) with a comment at their top, and jsdom lacks a few browser
// features the component library relies on - supplied here, only where there is a window.
import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined') {
  // Radix measures elements and moves pointer capture; jsdom has neither.
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}

  // The toast library and the theme switch ask for media queries.
  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })
}
