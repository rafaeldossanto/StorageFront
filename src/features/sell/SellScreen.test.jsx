// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import { i18nReady } from '@/i18n'
import { fakeApi, requestsMade } from '@/test/fakeApi'
import { scan } from '@/test/scan'
import { SellScreen } from './SellScreen'

const drink = {
  id: 'drink',
  name: 'Energético 473ml',
  categoryId: 'cat',
  baseUnit: 'Unit',
  salePriceCents: 899,
  minimumStock: 0,
  tracksExpiry: true,
  active: true,
  packagings: [
    { id: 'can', gtin: '07891000000014', displayGtin: '7891000000014', name: null, conversionFactor: 1, isDefault: true },
    { id: 'pack', gtin: '17891000000011', displayGtin: '17891000000011', name: 'Fardo 12', conversionFactor: 12, isDefault: false },
  ],
}

function renderScreen() {
  return render(
    <>
      <SellScreen />
      <Toaster />
    </>,
  )
}

function sellingRoutes(extra = {}) {
  return {
    'GET /api/products/by-barcode/7891000000014': () => [200, drink],
    'GET /api/products/by-barcode/17891000000011': () => [200, drink],
    'GET /api/products/drink/price': () => [200, { regularPriceCents: 899, finalPriceCents: 809, discountCents: 90, applied: [] }],
    ...extra,
  }
}

beforeAll(async () => {
  await i18nReady
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SellScreen', () => {
  it('counts a scanned pack as its units, at the discounted price', async () => {
    fakeApi(sellingRoutes())
    renderScreen()

    scan('17891000000011')
    scan('7891000000014')

    // Twelve from the pack, one loose can, at R$ 8,09 once the price arrives.
    expect(await screen.findByText('R$ 8,09 cada')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 105,17').length).toBeGreaterThan(0)
  })

  it('sends the cart as products and units, and undoes the sale from the confirmation', async () => {
    const user = userEvent.setup()
    let sent
    const fetch = fakeApi(
      sellingRoutes({
        'POST /api/sales': (options) => {
          sent = JSON.parse(options.body)
          return [201, {
            id: 'sale-1',
            soldAt: '2026-09-26T15:24:00Z',
            status: 'Completed',
            totalCents: 1618,
            lines: [{ productId: 'drink', productName: 'Energético 473ml', quantity: 2, unitPriceCents: 809, totalCents: 1618 }],
            cancellableUntil: '2999-01-01T00:00:00Z',
          }]
        },
        'POST /api/sales/sale-1/cancel': () => [200, { id: 'sale-1', status: 'Cancelled' }],
      }),
    )
    renderScreen()

    scan('7891000000014')
    scan('7891000000014')
    await screen.findByText('R$ 8,09 cada')
    await user.click(screen.getByRole('button', { name: 'Concluir venda' }))

    expect(sent).toEqual({ items: [{ productId: 'drink', quantity: 2 }] })
    expect(await screen.findByText('Venda registrada')).toBeInTheDocument()

    const recent = screen.getByRole('heading', { name: 'Vendas de agora' }).parentElement
    await user.click(within(recent).getByRole('button', { name: 'Desfazer' }))

    await waitFor(() => expect(requestsMade(fetch)).toContain('POST /api/sales/sale-1/cancel'))
    expect(await within(recent).findByText('Desfeita')).toBeInTheDocument()
  })

  it('points at the product the shelf cannot serve', async () => {
    const user = userEvent.setup()
    fakeApi(
      sellingRoutes({
        'POST /api/sales': () => [422, { code: 'stock.insufficient', line: 1 }],
      }),
    )
    renderScreen()

    scan('7891000000014')
    await screen.findByText('R$ 8,09 cada')
    await user.click(screen.getByRole('button', { name: 'Concluir venda' }))

    expect(await screen.findByText('Energético 473ml: Não há estoque suficiente para isso.')).toBeInTheDocument()
  })

  it('says so when a scanned code is not registered', async () => {
    fakeApi({ 'GET /api/products/by-barcode/7891000000021': () => [404, { code: 'product.not_found' }] })
    renderScreen()

    scan('7891000000021')

    expect(await screen.findByText('Código não cadastrado. Cadastre o produto em Produtos.')).toBeInTheDocument()
  })
})
