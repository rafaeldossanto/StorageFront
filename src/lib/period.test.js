import { describe, expect, it } from 'vitest'
import { bucketLabel, bucketTick, fromLocalDateTime, periodTitle, shift, toIsoDate } from './period'

describe('period', () => {
  it('writes a date from its local parts, never shifted to UTC', () => {
    // 23:30 on the 26th, local: still the 26th.
    expect(toIsoDate(new Date(2026, 8, 26, 23, 30))).toBe('2026-09-26')
  })

  it.each([
    ['Day', '2026-09-26', -1, '2026-09-25'],
    ['Day', '2026-03-01', -1, '2026-02-28'],
    ['Month', '2026-03-31', -1, '2026-02-01'],
    ['Month', '2026-12-15', 1, '2027-01-01'],
    ['Year', '2026-09-26', 1, '2027-01-01'],
  ])('%s %s moved by %i is %s', (period, date, steps, expected) => {
    expect(shift(period, date, steps)).toBe(expected)
  })

  it('keeps the wall-clock time the API sent', () => {
    expect(fromLocalDateTime('2026-09-26T14:00:00').getHours()).toBe(14)
  })

  it('names periods and buckets in Portuguese', () => {
    expect(periodTitle('Month', '2026-09-26')).toBe('setembro de 2026')
    expect(periodTitle('Year', '2026-09-26')).toBe('2026')
    expect(bucketTick('Day', '2026-09-26T14:00:00')).toBe('14h')
    expect(bucketTick('Month', '2026-09-26T00:00:00')).toBe('26')
    expect(bucketLabel('Day', '2026-09-26T14:00:00')).toBe('14h às 15h')
  })
})
