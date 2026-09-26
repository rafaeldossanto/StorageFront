import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { NETWORK_ERROR } from './errors'

// `fetch` is a global function, so a test can swap it for a fake with vi.stubGlobal and
// look at what the client asked for - no server needed.
function answer(status, body) {
  const fetch = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('returns the parsed body of a successful answer', async () => {
    answer(200, { status: 'ok' })

    await expect(api.get('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('sends JSON and the cookies the session needs', async () => {
    const fetch = answer(201, { id: '1' })

    await api.post('/api/categories', { name: 'Bebidas' })

    // mock.calls[0] is the list of arguments of the first call: [url, options].
    const [url, options] = fetch.mock.calls[0]
    expect(String(url)).toBe('http://api.test/api/categories')
    expect(options.method).toBe('POST')
    expect(options.body).toBe('{"name":"Bebidas"}')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.credentials).toBe('include')
  })

  it('puts query values in the address and skips the empty ones', async () => {
    const fetch = answer(200, [])

    await api.get('/api/products', { query: { search: 'coca cola', categoryId: undefined } })

    expect(String(fetch.mock.calls[0][0])).toBe('http://api.test/api/products?search=coca+cola')
  })

  it('turns a refusal into an ApiError carrying its code', async () => {
    answer(404, { code: 'product.not_found', detail: 'No product answers to barcode 7891000000021.' })

    await expect(api.get('/api/products/by-barcode/7891000000021')).rejects.toMatchObject({
      status: 404,
      code: 'product.not_found',
      isNotFound: true,
    })
  })

  it('turns a request that never got an answer into a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))

    await expect(api.get('/health')).rejects.toMatchObject({ code: NETWORK_ERROR })
  })

  it('accepts an empty answer, like a 204 after signing out', async () => {
    answer(204)

    await expect(api.post('/api/auth/sign-out')).resolves.toBeUndefined()
  })
})
