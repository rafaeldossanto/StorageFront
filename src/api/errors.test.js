import { describe, expect, it } from 'vitest'
import i18n, { i18nReady } from '../i18n'
import { ApiError, errorMessage, UNKNOWN_ERROR } from './errors'

await i18nReady

// `bind` fixes `this` inside t to the i18n instance. Passing i18n.t around on its own
// would lose it: in JavaScript, `this` depends on how a function is called, not where it
// was written - the classic trap for anyone coming from Java or C#.
const t = i18n.t.bind(i18n)

describe('ApiError.fromResponse', () => {
  it('keeps the stable code the API sends', () => {
    const error = ApiError.fromResponse(409, { code: 'barcode.taken', detail: 'technical text' })

    expect(error.status).toBe(409)
    expect(error.code).toBe('barcode.taken')
    expect(error).toBeInstanceOf(Error)
  })

  it('treats a response without a code as a server bug', () => {
    expect(ApiError.fromResponse(500, undefined).code).toBe(UNKNOWN_ERROR)
    expect(ApiError.fromResponse(502, 'Bad Gateway').code).toBe(UNKNOWN_ERROR)
  })
})

describe('errorMessage', () => {
  it('shows the Portuguese message for a known code, not the API detail', () => {
    const error = new ApiError(409, 'barcode.taken', 'Barcode 7891000000014 already belongs to a product.')

    expect(errorMessage(t, error)).toBe('Este código de barras já está cadastrado em outro produto.')
  })

  it('never prints a raw key for a code the front end does not know yet', () => {
    const message = errorMessage(t, new ApiError(422, 'product.some_future_rule'))

    expect(message).toBe(t('errors.unknown'))
  })

  it('falls back to the generic message for anything that is not an ApiError', () => {
    expect(errorMessage(t, new TypeError('boom'))).toBe(t('errors.unknown'))
  })
})
