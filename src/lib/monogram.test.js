import { describe, expect, it } from 'vitest'
import { monogramOf } from './monogram'

describe('monogramOf', () => {
  it.each([
    ['Energético 473ml', 'EN'],
    ['Água Mineral 500ml', 'ÁM'],
    ['arroz tipo 1', 'AT'],
    ['Coca-Cola 2L', 'CO'],
    ['500ml', '?'],
  ])('"%s" is %s', (name, letters) => {
    expect(monogramOf(name)).toBe(letters)
  })
})
