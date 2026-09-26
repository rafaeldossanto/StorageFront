import { ApiError } from './errors'

// The one place that talks HTTP to the Storage API. Every screen calls `api.get`,
// `api.post`... and gets back plain data, or an ApiError it can show.
//
// Written on the browser's own `fetch`, with no library: it is short, and it is exactly
// the JavaScript worth knowing well.

// `async` makes the function return a Promise - the JavaScript equivalent of C#'s Task.
// `await` pauses until a Promise settles, like `await` in C#. A rejected Promise surfaces
// as an exception at the `await`, so try/catch works the same way.
export async function request(method, path, { body, query, signal } = {}) {
  // The { body, query, signal } = {} above is destructuring with a default: it pulls those
  // three fields out of the options object, and an empty object is used when none is passed.

  // Read here rather than once at the top of the module, so tests can point it elsewhere.
  // Vite replaces import.meta.env.VITE_* with the values from the .env files at build time.
  const url = new URL(path, import.meta.env.VITE_API_URL)

  // Object.entries turns { search: 'coca' } into [['search', 'coca']], and `for...of`
  // walks it; the [key, value] in the loop destructures each pair.
  for (const [key, value] of Object.entries(query ?? {})) {
    // `!= null` (loose) matches both null and undefined - the one idiomatic use of loose
    // equality. Everywhere else, use === and !==, which never convert types.
    if (value != null) {
      url.searchParams.set(key, String(value))
    }
  }

  let response

  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),

      // Sends cookies to the API even though it lives on another origin. The refresh token
      // travels only in an HttpOnly cookie, so without this the session could not renew.
      credentials: 'include',

      // Lets a screen cancel a request it no longer needs, e.g. when the user leaves it.
      signal,
    })
  } catch (cause) {
    // fetch only throws when there was no answer at all: offline, DNS failure, CORS
    // refusal, server down. An HTTP 404 or 500 is still an answer and does not throw.
    throw ApiError.network(cause)
  }

  const payload = await readBody(response)

  // `response.ok` is true for 200-299. Anything else is a refusal with a problem document.
  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload)
  }

  return payload
}

async function readBody(response) {
  const text = await response.text()

  if (text === '') {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    // Not JSON - say, an HTML error page from a proxy in front of the API. Treated as a
    // body without a code, which becomes the generic "unknown" message.
    return undefined
  }
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
