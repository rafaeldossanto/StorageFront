import type { TFunction } from 'i18next'

/** Codes that do not come from the API but from the trip to it. */
export const NETWORK_ERROR = 'network'
export const UNKNOWN_ERROR = 'unknown'

/**
 * A request the API refused, or could not be asked at all.
 *
 * Carries the stable `code` the API sends in its problem document. The screen shows the
 * Portuguese message for that code - never the API's `detail`, which is technical English
 * meant for logs.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, detail?: string) {
    super(detail ?? code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  /** 404: for a barcode lookup this is the cue to register a new product, not a failure. */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /**
   * Builds the error from a failed response. A body without a `code` is a server bug
   * (a 500 carries no message on purpose), so it becomes the generic "unknown".
   */
  static fromResponse(status: number, body: unknown): ApiError {
    const problem = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
    const code = typeof problem.code === 'string' ? problem.code : UNKNOWN_ERROR
    const detail = typeof problem.detail === 'string' ? problem.detail : undefined

    return new ApiError(status, code, detail)
  }

  /** The request never got an answer: offline, DNS, CORS, server down. */
  static network(cause: unknown): ApiError {
    const error = new ApiError(0, NETWORK_ERROR)
    error.cause = cause
    return error
  }
}

/**
 * The message to show for any error thrown while talking to the API.
 *
 * A code the front end does not know yet falls back to the generic message instead of
 * printing the raw key, so a new backend rule never shows "product.something" on screen.
 */
export function errorMessage(t: TFunction, error: unknown): string {
  const code = error instanceof ApiError ? error.code : UNKNOWN_ERROR
  const unknown = t(`errors.${UNKNOWN_ERROR}`)

  return t(`errors.${code}`, { defaultValue: unknown })
}

/**
 * Runs an openapi-fetch call and returns its data, or throws an {@link ApiError}.
 *
 * openapi-fetch reports refusals as a value and network failures as a thrown TypeError;
 * this folds both into one kind of error so each screen handles a single case.
 */
export async function call<T>(
  request: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: Awaited<ReturnType<typeof request>>

  try {
    result = await request()
  } catch (cause) {
    throw ApiError.network(cause)
  }

  if (!result.response.ok || result.data === undefined) {
    throw ApiError.fromResponse(result.response.status, result.error)
  }

  return result.data
}
