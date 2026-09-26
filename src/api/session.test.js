import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, refused, requestsMade, signedIn } from '../test/fakeApi'

// session.js keeps its state in module variables, which would leak from one test into the
// next. vi.resetModules() empties Vitest's module cache, so the `import()` that follows
// loads a brand-new copy - the same thing as opening the app in a fresh tab.
//
// `import()` written as a function is a dynamic import: it loads a module at run time and
// returns a Promise of it, instead of loading it up front like the `import` lines above.
async function freshSession() {
  vi.resetModules()
  return import('./session')
}

let session

beforeEach(async () => {
  session = await freshSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signing in and out', () => {
  it('keeps the token and the account in memory', async () => {
    fakeApi({ 'POST /api/auth/sign-in': () => signedIn('token-1') })

    const account = await session.signIn('ana@loja.com', 'senha-forte-123')

    expect(account.shopName).toBe('Mercadinho da Ana')
    expect(session.getAccessToken()).toBe('token-1')
  })

  it('stays signed out after a wrong password', async () => {
    fakeApi({ 'POST /api/auth/sign-in': () => refused(401, 'auth.invalid_credentials') })

    await expect(session.signIn('ana@loja.com', 'errada')).rejects.toMatchObject({ code: 'auth.invalid_credentials' })
    expect(session.getAccount()).toBeNull()
  })

  it('forgets the session on sign-out even when the API cannot be reached', async () => {
    fakeApi({ 'POST /api/auth/sign-in': () => signedIn('token-1') })
    await session.signIn('ana@loja.com', 'senha-forte-123')
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))

    await expect(session.signOut()).rejects.toMatchObject({ code: 'network' })

    expect(session.getAccessToken()).toBeNull()
  })

  it('tells the listeners about every change, until they stop listening', async () => {
    fakeApi({
      'POST /api/auth/sign-in': () => signedIn('token-1'),
      'POST /api/auth/sign-out': () => [204],
    })
    const seen = []
    const stop = session.onSessionChange((account) => seen.push(account?.name ?? null))

    await session.signIn('ana@loja.com', 'senha-forte-123')
    await session.signOut()
    stop()
    await session.signIn('ana@loja.com', 'senha-forte-123')

    expect(seen).toEqual(['Ana', null])
  })
})

describe('restoring the session on page load', () => {
  it('trades the refresh cookie for a new access token', async () => {
    fakeApi({ 'POST /api/auth/refresh': () => signedIn('token-2') })

    const account = await session.restoreSession()

    expect(account.name).toBe('Ana')
    expect(session.getAccessToken()).toBe('token-2')
  })

  it('resolves to null when there is no session to restore', async () => {
    fakeApi({ 'POST /api/auth/refresh': () => refused(401, 'auth.session_invalid') })

    await expect(session.restoreSession()).resolves.toBeNull()
  })

  it('does not mistake being offline for being signed out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))

    await expect(session.restoreSession()).rejects.toMatchObject({ code: 'network' })
  })
})

describe('refreshing', () => {
  it('never sends the same refresh token twice from one tab', async () => {
    const fetch = fakeApi({ 'POST /api/auth/refresh': () => signedIn('token-2') })

    // React runs effects twice in development, so this happens on every page load.
    await Promise.all([session.restoreSession(), session.restoreSession(), session.refreshSession()])

    expect(requestsMade(fetch)).toEqual(['POST /api/auth/refresh'])
  })

  it('makes two tabs take turns, so the second one sends the cookie the first one got', async () => {
    // Two tabs are two separate copies of the module, sharing only the browser's locks.
    const firstTab = await freshSession()
    const secondTab = await freshSession()
    let inFlight = 0
    let mostAtOnce = 0

    fakeApi({
      'POST /api/auth/refresh': async () => {
        inFlight++
        mostAtOnce = Math.max(mostAtOnce, inFlight)
        // A Promise that resolves after 20 ms: how JavaScript waits without blocking.
        await new Promise((resolve) => setTimeout(resolve, 20))
        inFlight--
        return signedIn('token-2')
      },
    })

    await Promise.all([firstTab.refreshSession(), secondTab.refreshSession()])

    expect(mostAtOnce).toBe(1)
  })

  it('ends the session when the refresh is refused', async () => {
    fakeApi({
      'POST /api/auth/sign-in': () => signedIn('token-1'),
      'POST /api/auth/refresh': () => refused(401, 'auth.session_invalid'),
    })
    await session.signIn('ana@loja.com', 'senha-forte-123')

    await expect(session.refreshSession()).rejects.toMatchObject({ code: 'auth.session_invalid' })

    expect(session.getAccount()).toBeNull()
  })

  it('keeps the session when the refresh only failed to reach the API', async () => {
    fakeApi({ 'POST /api/auth/sign-in': () => signedIn('token-1') })
    await session.signIn('ana@loja.com', 'senha-forte-123')
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))

    await expect(session.refreshSession()).rejects.toMatchObject({ code: 'network' })

    expect(session.getAccount()?.name).toBe('Ana')
  })
})
