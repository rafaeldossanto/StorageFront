import { describe, expect, it } from 'vitest'
import { formatCents, parseCents } from './money'

// Intl separates "R$" from the amount with a no-break space (U+00A0); the tests compare
// the text as a person sees it.
const visible = (text) => text.replace(/ /g, ' ')

describe('formatCents', () => {
  it('formats cents as Brazilian reais', () => {
    expect(visible(formatCents(899))).toBe('R$ 8,99')
    expect(visible(formatCents(123456))).toBe('R$ 1.234,56')
    expect(visible(formatCents(5))).toBe('R$ 0,05')
  })

  it('refuses anything that is not a whole number of cents', () => {
    expect(() => formatCents(8.99)).toThrow(RangeError)
    expect(() => formatCents('899')).toThrow(RangeError)
  })
})

describe('parseCents', () => {
  it.each([
    ['8,99', 899],
    ['8', 800],
    ['8,5', 850],
    ['0,05', 5],
    ['1.234,56', 123456],
    ['R$ 8,99', 899],
    ['8.99', 899],
    ['1.234', 123400],
  ])('reads "%s" as %i cents', (typed, cents) => {
    expect(parseCents(typed)).toBe(cents)
  })

  // The trap this module exists for: as floating point, 1.15 * 100 is 114.99999999999999.
  it('never goes through floating point', () => {
    expect(1.15 * 100).not.toBe(115)
    expect(parseCents('1,15')).toBe(115)
    expect(parseCents('0,07')).toBe(7)
    expect(parseCents('8.99')).toBe(899)
  })

  it.each(['', 'abc', '8,999', '1,2,3', '12.34.56', '-1', ',50'])('refuses "%s"', (typed) => {
    expect(parseCents(typed)).toBeNull()
  })
})
