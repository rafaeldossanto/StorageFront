import { ApiError, UNAUTHENTICATED } from './errors'
import { send } from './http'
import { getAccessToken, refreshSession } from './session'

// What every screen uses to talk to the Storage API: `api.get`, `api.post`... return plain
// data, or throw an ApiError the screen can show.
//
// On top of the bare request in http.js, it signs each request with the access token and
// keeps the session alive: an access token lasts fifteen minutes, and when one expires in
// the middle of work it is renewed quietly and the request repeated, so the person never
// notices.
export async function request(method, path, options = {}) {
  try {
    return await send(method, path, signed(options))
  } catch (error) {
    if (!isExpiredToken(error)) {
      throw error
    }

    // Throws when the session itself is over. The caller then gets auth.session_invalid,
    // and the session listeners have already been told - the app shows the sign-in page.
    await refreshSession()

    // Once, not in a loop: a request refused again with a brand-new token is refused for
    // a real reason.
    return send(method, path, signed(options))
  }
}

// A copy of the options with the Authorization header added. Built again for the retry, so
// it carries the new token.
function signed(options) {
  const token = getAccessToken()

  if (token === null) {
    return options
  }

  // A template literal: backquotes, and ${...} placed inside - string interpolation, like
  // $"Bearer {token}" in C#.
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } }
}

// Only a missing or expired token is worth a refresh. A 401 for a wrong password, or a
// 403 for staff trying an owner's action, would be refused again.
function isExpiredToken(error) {
  return error instanceof ApiError && error.status === 401 && error.code === UNAUTHENTICATED
}

// Shorthands for each HTTP verb. An object literal holding arrow functions: `(a) => b` is
// a function returning b, like a C# lambda. `...options` copies the caller's options into
// the new object, then `body` is added next to them.
export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
}
