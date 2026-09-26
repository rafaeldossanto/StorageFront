// @vitest-environment jsdom
//
// The comment above asks Vitest for a simulated browser (jsdom) for this file only: the
// screen needs a document to draw into, while the other tests run in plain Node.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import { i18nReady } from '@/i18n'
import { fakeApi, requestsMade } from '@/test/fakeApi'
import { ProductsScreen } from './ProductsScreen'

const beverages = { id: 'cat-bebidas', name: 'Bebidas', depth: 0, active: true, children: [] }

function productFrom(body, id = 'prod-1') {
  return {
    id,
    name: body.name,
    categoryId: body.categoryId,
    baseUnit: body.baseUnit ?? 'Unit',
    salePriceCents: body.salePriceCents,
    minimumStock: body.minimumStock ?? 0,
    tracksExpiry: body.tracksExpiry ?? true,
    active: true,
    packagings: [{ id: 'pack-1', gtin: `0${body.barcode}`, displayGtin: body.barcode, name: null, conversionFactor: 1, isDefault: true, isInternalCode: false }],
    createdAt: '2026-09-26T12:00:00Z',
    updatedAt: null,
  }
}

// A barcode reader is a keyboard that types very fast: every key within a millisecond or
// two, then Enter. Dispatching the events back to back reproduces exactly that.
function scan(code) {
  act(() => {
    for (const key of [...code, 'Enter']) {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
  })
}

function renderScreen() {
  return render(
    <>
      <ProductsScreen />
      <Toaster />
    </>,
  )
}

beforeAll(async () => {
  await i18nReady
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProductsScreen', () => {
  it('opens the registration form, filled in, when an unknown code is scanned', async () => {
    fakeApi({
      'GET /api/categories': () => [200, [beverages]],
      'GET /api/products': () => [200, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }],
      'GET /api/products/by-barcode/7891000000014': () => [404, { code: 'product.not_found' }],
    })
    renderScreen()
    await screen.findByRole('button', { name: 'Bebidas' })

    scan('7891000000014')

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Código de barras')).toHaveValue('7891000000014')
    // The cursor waits on the name: the code is already there.
    expect(within(dialog).getByLabelText('Nome')).toHaveFocus()
  })

  it('opens a known product for editing when its code is scanned', async () => {
    const known = productFrom({ name: 'Energético 473ml', categoryId: beverages.id, salePriceCents: 899, barcode: '7891000000014' })
    fakeApi({
      'GET /api/categories': () => [200, [beverages]],
      'GET /api/products': () => [200, { items: [known], page: 1, pageSize: 24, total: 1, totalPages: 1 }],
      'GET /api/products/by-barcode/7891000000014': () => [200, known],
    })
    renderScreen()
    await screen.findByText('Energético 473ml')

    scan('7891000000014')

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Energético 473ml' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('registers the product and undoes it from the confirmation', async () => {
    const user = userEvent.setup()
    let created
    const fetch = fakeApi({
      'GET /api/categories': () => [200, [beverages]],
      'GET /api/products': () => [200, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }],
      'GET /api/products/by-barcode/7891000000014': () => [404, { code: 'product.not_found' }],
      'POST /api/products': (options) => {
        created = productFrom(JSON.parse(options.body))
        return [201, created]
      },
      'DELETE /api/products/prod-1': () => [204],
    })
    renderScreen()
    await screen.findByRole('button', { name: 'Bebidas' })

    scan('7891000000014')
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'Energético 473ml')
    await user.type(within(dialog).getByLabelText('Preço de venda'), '8,99')
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    // What went to the API: the scanned code, the price in cents, the branch on screen.
    expect(created).toMatchObject({ name: 'Energético 473ml', salePriceCents: 899, categoryId: beverages.id })
    expect(await screen.findByRole('button', { name: /^Energético 473ml/ })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Desfazer' }))

    await waitFor(() => expect(requestsMade(fetch)).toContain('DELETE /api/products/prod-1'))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Energético 473ml/ })).not.toBeInTheDocument())
  })

  it('refuses to register without a price', async () => {
    const user = userEvent.setup()
    const fetch = fakeApi({
      'GET /api/categories': () => [200, [beverages]],
      'GET /api/products': () => [200, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }],
      'GET /api/products/by-barcode/7891000000014': () => [404, { code: 'product.not_found' }],
    })
    renderScreen()
    await screen.findByRole('button', { name: 'Bebidas' })

    scan('7891000000014')
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'Energético 473ml')
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    expect(within(dialog).getByText('Digite um preço, como 8,99.')).toBeInTheDocument()
    expect(requestsMade(fetch)).not.toContain('POST /api/products')
  })

  it('does not treat typing in the search box as a scan', async () => {
    const user = userEvent.setup()
    const fetch = fakeApi({
      'GET /api/categories': () => [200, [beverages]],
      'GET /api/products': () => [200, { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 }],
    })
    renderScreen()
    await screen.findByRole('button', { name: 'Bebidas' })

    // userEvent types like a person, with real gaps between the keys.
    await user.type(screen.getByRole('textbox', { name: 'Bipe um código ou digite o nome' }), 'coca{Enter}', { delay: 30 })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsMade(fetch).some((made) => made.startsWith('GET /api/products/by-barcode'))).toBe(false)
  })
})
