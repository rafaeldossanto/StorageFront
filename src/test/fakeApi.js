import { vi } from 'vitest'

// A stand-in for the Storage API, for tests only. `routes` maps "METHOD /path" to a
// function that receives the request and returns [status, body]:
//
//   fakeApi({ 'GET /api/me': () => [200, { name: 'Ana' }] })
//
// Anything else answers 404. Returns the fake fetch, whose `mock.calls` list every request.
export function fakeApi(routes) {
  const fetch = vi.fn(async (url, options) => {
    const route = routes[`${options.method} ${new URL(url).pathname}`]
    const [status, body] = route === undefined ? [404, { code: 'test.no_route' }] : await route(options)

    return new Response(body === undefined ? null : JSON.stringify(body), { status })
  })

  vi.stubGlobal('fetch', fetch)
  return fetch
}

// The requests made so far, as "METHOD /path" - easy to compare with toEqual.
export function requestsMade(fetch) {
  return fetch.mock.calls.map(([url, options]) => `${options.method} ${new URL(url).pathname}`)
}

// What the API answers to a sign-in, a sign-up or a refresh.
export function signedIn(accessToken, role = 'Owner') {
  return [200, {
    accessToken,
    accessTokenExpiresAt: '2026-09-26T12:15:00Z',
    account: {
      userId: 'user-1',
      name: 'Ana',
      email: 'ana@loja.com',
      role,
      shopId: 'shop-1',
      shopName: 'Mercadinho da Ana',
      shopTimeZone: 'America/Sao_Paulo',
    },
  }]
}

export const refused = (status, code) => [status, { code }]
