import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { NETWORK_ERROR } from './errors'
import { fakeApi, refused, requestsMade, signedIn } from '../test/fakeApi'

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

describe('api, signed in', () => {
  // A fresh client and session for each test - see session.test.js for why.
  async function signedInAs(token, routes) {
    vi.resetModules()
    const client = await import('./client')
    const session = await import('./session')

    fakeApi({ 'POST /api/auth/sign-in': () => signedIn(token) })
    await session.signIn('ana@loja.com', 'senha-forte-123')

    const fetch = fakeApi(routes)
    return { api: client.api, session, fetch }
  }

  // The token the API accepts right now. The fake routes read it, so a test can make the
  // current token expire by changing this variable.
  let validToken

  const bearer = (options) => options.headers.Authorization
  const guarded = (answerWith) => (options) =>
    bearer(options) === `Bearer ${validToken}` ? answerWith() : refused(401, 'auth.unauthenticated')

  it('signs every request with the access token', async () => {
    validToken = 'token-1'
    const { api, fetch } = await signedInAs('token-1', { 'GET /api/me': guarded(() => [200, { name: 'Ana' }]) })

    await expect(api.get('/api/me')).resolves.toEqual({ name: 'Ana' })
    expect(bearer(fetch.mock.calls[0][1])).toBe('Bearer token-1')
  })

  it('renews an expired token and repeats the request once, unnoticed', async () => {
    validToken = 'token-2'
    const { api, fetch } = await signedInAs('token-1', {
      'GET /api/products': guarded(() => [200, [{ name: 'Energético' }]]),
      'POST /api/auth/refresh': () => signedIn('token-2'),
    })

    await expect(api.get('/api/products')).resolves.toEqual([{ name: 'Energético' }])

    expect(requestsMade(fetch)).toEqual(['GET /api/products', 'POST /api/auth/refresh', 'GET /api/products'])
    expect(bearer(fetch.mock.calls[2][1])).toBe('Bearer token-2')
  })

  it('has every request that expired at the same moment wait for one refresh', async () => {
    validToken = 'token-2'
    const { api, fetch } = await signedInAs('token-1', {
      'GET /api/products': guarded(() => [200, []]),
      'GET /api/categories': guarded(() => [200, []]),
      'GET /api/stock/summary': guarded(() => [200, {}]),
      'POST /api/auth/refresh': () => signedIn('token-2'),
    })

    await Promise.all([api.get('/api/products'), api.get('/api/categories'), api.get('/api/stock/summary')])

    // `filter` keeps the items the function returns true for, like Where in LINQ.
    expect(requestsMade(fetch).filter((made) => made === 'POST /api/auth/refresh')).toHaveLength(1)
  })

  it('hands the caller the refused refresh, and the session is over', async () => {
    validToken = 'nobody-has-this'
    const { api, session } = await signedInAs('token-1', {
      'GET /api/products': guarded(() => [200, []]),
      'POST /api/auth/refresh': () => refused(401, 'auth.session_invalid'),
    })

    await expect(api.get('/api/products')).rejects.toMatchObject({ code: 'auth.session_invalid' })
    expect(session.getAccount()).toBeNull()
  })

  it('does not refresh for a refusal a new token would not change', async () => {
    const { api, fetch } = await signedInAs('token-1', {
      'POST /api/team': () => refused(403, 'auth.forbidden'),
    })

    await expect(api.post('/api/team', { name: 'Bia' })).rejects.toMatchObject({ code: 'auth.forbidden' })
    expect(requestsMade(fetch)).toEqual(['POST /api/team'])
  })

  it('keeps the caller\'s headers and adds the token next to them', async () => {
    validToken = 'token-1'
    const { api, fetch } = await signedInAs('token-1', { 'GET /api/me': guarded(() => [200, {}]) })
    const headers = { 'X-Trace': 'abc' }

    await api.get('/api/me', { headers })

    expect(fetch.mock.calls[0][1].headers).toEqual({ 'X-Trace': 'abc', Authorization: 'Bearer token-1' })
    // The object the caller passed is left as it was.
    expect(headers).toEqual({ 'X-Trace': 'abc' })
  })
})
