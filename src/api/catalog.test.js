import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, requestsMade } from '@/test/fakeApi'
import { awaitPhoto } from './catalog'

const photo = { url: '/api/product-photos/07894900010015?v=ab12', source: 'Open Food Facts', sourcePage: '', license: '' }

const coke = {
  id: 'coke',
  name: 'Coca-Cola Lata 350ml',
  photo: null,
  packagings: [
    { id: 'pack', gtin: '17894900010012', displayGtin: '17894900010012', conversionFactor: 12, isDefault: false },
    { id: 'can', gtin: '07894900010015', displayGtin: '7894900010015', conversionFactor: 1, isDefault: true },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('awaitPhoto', () => {
  it('asks again by the main code until the photo is there', async () => {
    let asked = 0
    const fetch = fakeApi({
      'GET /api/products/by-barcode/7894900010015': () => {
        asked += 1
        return [200, { ...coke, photo: asked < 2 ? null : photo }]
      },
    })

    const found = await awaitPhoto(coke, { delays: [0, 0, 0] })

    expect(found.photo).toEqual(photo)
    expect(requestsMade(fetch)).toEqual([
      'GET /api/products/by-barcode/7894900010015',
      'GET /api/products/by-barcode/7894900010015',
    ])
  })

  it('gives up after the last try', async () => {
    fakeApi({ 'GET /api/products/by-barcode/7894900010015': () => [200, coke] })

    expect(await awaitPhoto(coke, { delays: [0, 0] })).toBeNull()
  })

  it('does not ask at all for a product that already has its photo', async () => {
    const fetch = fakeApi({})

    const withPhoto = { ...coke, photo }

    expect(await awaitPhoto(withPhoto)).toBe(withPhoto)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('stops when the screen leaves', async () => {
    const fetch = fakeApi({ 'GET /api/products/by-barcode/7894900010015': () => [200, coke] })
    const controller = new AbortController()

    const waiting = awaitPhoto(coke, { signal: controller.signal, delays: [60_000] })
    controller.abort()

    await expect(waiting).rejects.toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })
})
