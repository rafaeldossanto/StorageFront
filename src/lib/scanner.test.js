import { describe, expect, it } from 'vitest'
import { createScanDetector } from './scanner'

// Feeds keys to a detector as if they arrived `gapMs` apart, starting at `from`, and
// returns what the detector answered for each - the last one is what Enter produced.
function press(detect, keys, { gapMs, from = 1000 }) {
  // `map` builds a new array from each item and its index, like Select in LINQ.
  return keys.map((key, index) => detect(key, from + index * gapMs))
}

// '7891000000014' followed by Enter, one key per item: the spread `...` turns a string
// into an array of its characters.
const keysOf = (code) => [...code, 'Enter']

const lastOf = (answers) => answers.at(-1)

describe('createScanDetector', () => {
  it('recognises a reader: every key within a few milliseconds, then Enter', () => {
    const detect = createScanDetector()

    const answers = press(detect, keysOf('7891000000014'), { gapMs: 4 })

    expect(lastOf(answers)).toBe('7891000000014')
    // Only Enter answers; the digits before it do not.
    expect(answers.slice(0, -1).every((answer) => answer === null)).toBe(true)
  })

  it('does not mistake a person typing the same digits for a reader', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, keysOf('7891000000014'), { gapMs: 120 }))).toBeNull()
  })

  it('refuses a burst too short to be a product barcode', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, keysOf('1234'), { gapMs: 4 }))).toBeNull()
  })

  it('takes the shortest barcode there is, EAN-8', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, keysOf('96385074'), { gapMs: 4 }))).toBe('96385074')
  })

  it('keeps only the scan when someone was typing just before it', () => {
    const detect = createScanDetector()
    press(detect, ['c', 'o', 'c', 'a'], { gapMs: 150 })

    // The reader's burst starts 300 ms after the last typed letter.
    expect(lastOf(press(detect, keysOf('7891000000014'), { gapMs: 4, from: 1800 }))).toBe('7891000000014')
  })

  it('does not accept an Enter pressed by hand after a fast burst', () => {
    const detect = createScanDetector()
    press(detect, [...'7891000000014'], { gapMs: 4 })

    expect(detect('Enter', 5000)).toBeNull()
  })

  it('lets Shift pass without breaking the run', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, ['A', 'B', 'Shift', 'C', '1', '2', '3', '4', '5', 'Enter'], { gapMs: 4 }))).toBe('ABC12345')
  })

  it('drops the run when a key that is not part of a code arrives', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, ['7', '8', '9', '1', 'Tab', '0', '0', '0', '0', 'Enter'], { gapMs: 4 }))).toBeNull()
  })

  it('reads two scans in a row, each on its own', () => {
    const detect = createScanDetector()

    expect(lastOf(press(detect, keysOf('7891000000014'), { gapMs: 4 }))).toBe('7891000000014')
    expect(lastOf(press(detect, keysOf('7891000000021'), { gapMs: 4, from: 1060 }))).toBe('7891000000021')
  })

  it('accepts other limits for a slower reader', () => {
    const detect = createScanDetector({ maxGapMs: 50 })

    expect(lastOf(press(detect, keysOf('7891000000014'), { gapMs: 35 }))).toBe('7891000000014')
  })

  it('gives each detector its own memory', () => {
    const first = createScanDetector()
    const second = createScanDetector()
    press(first, [...'789100000'], { gapMs: 4 })

    expect(second('Enter', 1040)).toBeNull()
  })
})
