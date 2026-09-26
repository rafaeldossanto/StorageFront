import { describe, expect, it } from 'vitest'
import i18n, { i18nReady } from '../i18n'
import { ApiError, call, errorMessage, NETWORK_ERROR, UNKNOWN_ERROR } from './errors'

await i18nReady
const t = i18n.t.bind(i18n)

describe('ApiError.fromResponse', () => {
  it('keeps the stable code the API sends', () => {
    const error = ApiError.fromResponse(409, { code: 'barcode.taken', detail: 'technical text' })

    expect(error.status).toBe(409)
    expect(error.code).toBe('barcode.taken')
  })

  it('treats a response without a code as a server bug', () => {
    expect(ApiError.fromResponse(500, undefined).code).toBe(UNKNOWN_ERROR)
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

describe('call', () => {
  const answer = (status: number, body?: unknown) =>
    Promise.resolve({
      data: status < 400 ? body : undefined,
      error: status >= 400 ? body : undefined,
      response: new Response(null, { status }),
    })

  it('returns the data of a successful answer', async () => {
    await expect(call(() => answer(200, { status: 'ok' }))).resolves.toEqual({ status: 'ok' })
  })

  it('turns a refusal into an ApiError carrying its code', async () => {
    await expect(call(() => answer(404, { code: 'product.not_found' }))).rejects.toMatchObject({
      status: 404,
      code: 'product.not_found',
      isNotFound: true,
    })
  })

  it('turns a request that never got an answer into a network error', async () => {
    await expect(call(() => Promise.reject(new TypeError('Failed to fetch')))).rejects.toMatchObject({
      code: NETWORK_ERROR,
    })
  })
})
