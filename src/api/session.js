import { ApiError } from './errors'
import { send } from './http'

// Who is signed in, kept only in this page's memory.
//
// The access token lives in a plain variable, never in localStorage: anything stored there
// can be read by any script running on the page, including one an attacker managed to
// inject. The refresh token is out of reach of scripts altogether - the API keeps it in an
// HttpOnly cookie. The price is that a reload forgets the access token, which is what
// `restoreSession` is for: it trades the cookie for a new one.

// A module is a file, and its top-level variables live as long as the page: one copy
// shared by everything that imports it. That is what makes this the single session.
//
// `let` declares a variable that can be reassigned, `const` one that cannot. Both belong
// to the block they are written in. Forget `var`, whose scoping rules are a trap.
let accessToken = null
let account = null

// The refresh in flight, if any - see refreshSession.
let refreshing = null

// A Set holds each value once, like a HashSet in C#. These are the functions to call when
// someone signs in or out; the screens use it to switch to the sign-in page.
const listeners = new Set()

// Name shared by every tab of the app - see withRefreshLock.
const REFRESH_LOCK = 'storage-session-refresh'

export function getAccessToken() {
  return accessToken
}

// The signed-in person and their shop, as the API describes them:
// { userId, name, email, role, shopId, shopName, shopTimeZone }. Null when signed out.
export function getAccount() {
  return account
}

// Calls `listener(account)` on every sign-in, sign-out and expiry. Returns the function
// that stops the calls - handing back the undo is the usual JavaScript shape for this,
// and fits React's useEffect cleanup exactly.
export function onSessionChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function signIn(email, password) {
  begin(await send('POST', '/api/auth/sign-in', { body: { email, password } }))
  return account
}

// A new shop and its owner, signed in at once. `timeZone` may be left out: the API
// assumes America/Sao_Paulo.
export async function signUp({ shopName, ownerName, email, password, timeZone }) {
  begin(await send('POST', '/api/auth/sign-up', { body: { shopName, ownerName, email, password, timeZone } }))
  return account
}

export async function signOut() {
  try {
    await send('POST', '/api/auth/sign-out')
  } finally {
    // `finally` runs whether the request worked or threw. Offline or not, this device
    // forgets the session; the API's copy dies on its own when it expires.
    end()
  }
}

// On page load: trades the refresh cookie, if the browser still holds one, for an access
// token. Resolves to the account, or to null when there is no session to restore - the
// cue to show the sign-in page. Being offline still throws: that is not "signed out".
export async function restoreSession() {
  try {
    return await refreshSession()
  } catch (error) {
    if (isSessionOver(error)) {
      return null
    }

    throw error
  }
}

// Gets a fresh access token from the refresh cookie.
//
// Everything that finds its token expired at the same moment waits for this one refresh
// instead of starting its own. That is not an optimisation: the API retires a refresh
// token the instant it is used, and seeing it a second time reads as theft - it ends every
// session of that person. So there is never more than one refresh on its way.
export function refreshSession() {
  // `??=` assigns only when the left side is null or undefined: the first caller starts
  // the refresh, and everyone arriving while it runs gets that same Promise back.
  refreshing ??= withRefreshLock(() => send('POST', '/api/auth/refresh'))
    .then((auth) => {
      begin(auth)
      return account
    })
    .catch((error) => {
      // A refused refresh means the session is over. A network failure does not: the
      // session may be fine, the Wi-Fi is not.
      if (isSessionOver(error)) {
        end()
      }

      throw error
    })
    .finally(() => {
      refreshing = null
    })

  return refreshing
}

// The API answers 401 when the session behind the cookie is gone: expired, signed out,
// revoked, or the person was deactivated.
function isSessionOver(error) {
  return error instanceof ApiError && error.status === 401
}

// Every tab of the app shares the same refresh cookie, but not this module - each tab has
// its own copy. Two tabs refreshing at once would send the same token twice. The Web Locks
// API makes them take turns: the second tab waits until the first one's answer has stored
// the new cookie, then refreshes with that one.
//
// `navigator.locks.request(name, task)` runs `task` once nobody else holds `name`, and
// resolves with what `task` resolved with. Browsers without it (old ones) simply refresh.
function withRefreshLock(task) {
  // `?.` stops at null or undefined instead of throwing: this reads as "locks of navigator,
  // if there is a navigator".
  const locks = globalThis.navigator?.locks

  return locks === undefined ? task() : locks.request(REFRESH_LOCK, task)
}

function begin(auth) {
  accessToken = auth.accessToken
  account = auth.account
  notify()
}

function end() {
  if (accessToken === null && account === null) {
    return
  }

  accessToken = null
  account = null
  notify()
}

function notify() {
  for (const listener of listeners) {
    listener(account)
  }
}
