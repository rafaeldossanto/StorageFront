// Codes that do not come from the API but from the trip to it.
export const NETWORK_ERROR = 'network'
export const UNKNOWN_ERROR = 'unknown'

// The API's answer to a missing or expired access token: the cue to refresh and retry.
export const UNAUTHENTICATED = 'auth.unauthenticated'

// A request the API refused, or could not be asked at all.
//
// It carries the stable `code` the API sends in its problem document. The screen shows the
// Portuguese message for that code - never the API's `detail`, which is technical English
// meant for logs.
//
// `extends Error` works like in Java or C#: an ApiError is an Error, so `throw` and
// `instanceof` behave as expected, and the browser console shows a stack trace.
export class ApiError extends Error {
  constructor(status, code, detail) {
    // `??` returns the right side only when the left is null or undefined - unlike `||`,
    // which would also skip an empty string or 0.
    super(detail ?? code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  // A getter: read as `error.isNotFound`, without parentheses, like a C# property. For a
  // barcode lookup a 404 is the cue to register a new product, not a failure.
  get isNotFound() {
    return this.status === 404
  }

  // Builds the error from a failed response. A body without a `code` means a server bug
  // (a 500 carries no message on purpose), so it becomes the generic "unknown".
  static fromResponse(status, body) {
    // `?.` stops at null or undefined instead of throwing: body?.code is undefined when
    // body is. `typeof` is how JavaScript checks a value's kind at run time.
    const code = typeof body?.code === 'string' ? body.code : UNKNOWN_ERROR
    const detail = typeof body?.detail === 'string' ? body.detail : undefined

    const error = new ApiError(status, code, detail)

    // Which line of a multi-line request was refused - a receipt, a sale - counted from 1.
    if (Number.isInteger(body?.line)) {
      error.line = body.line
    }

    return error
  }

  // The request never got an answer: offline, DNS, CORS, server down.
  static network(cause) {
    const error = new ApiError(0, NETWORK_ERROR)
    error.cause = cause
    return error
  }
}

// The message to show for any error thrown while talking to the API.
//
// A code the front end does not know yet falls back to the generic message instead of
// printing the raw key, so a new backend rule never shows "product.something" on screen.
export function errorMessage(t, error) {
  const code = error instanceof ApiError ? error.code : UNKNOWN_ERROR

  return t(`errors.${code}`, { defaultValue: t(`errors.${UNKNOWN_ERROR}`) })
}
