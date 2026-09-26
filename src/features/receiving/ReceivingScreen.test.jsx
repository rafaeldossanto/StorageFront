// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import { i18nReady } from '@/i18n'
import { fakeApi, requestsMade } from '@/test/fakeApi'
import { scan } from '@/test/scan'
import { ReceivingScreen } from './ReceivingScreen'

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

const beverages = { id: 'cat', name: 'Bebidas', depth: 0, active: true, children: [] }

const noReceipts = { items: [], page: 1, pageSize: 8, total: 0, totalPages: 0 }

// Far enough ahead to be valid whenever the test runs.
const LATER = '2999-12-31'

function renderScreen() {
  return render(
    <>
      <ReceivingScreen />
      <Toaster />
    </>,
  )
}

function routes(extra = {}) {
  return {
    'GET /api/suppliers': () => [200, []],
    'GET /api/receipts': () => [200, noReceipts],
    'GET /api/categories': () => [200, [beverages]],
    'GET /api/products/by-barcode/7891000000014': () => [200, drink],
    'GET /api/products/by-barcode/17891000000011': () => [200, drink],
    ...extra,
  }
}

// The receipt the API answers with, built from what was sent.
function receiptFrom(body) {
  return {
    id: 'receipt-1',
    receivedAt: '2026-09-26T15:24:00Z',
    supplierId: body.supplierId ?? null,
    supplierName: null,
    invoiceNumber: body.invoiceNumber ?? null,
    note: body.note ?? null,
    totalCostCents: body.lines.reduce((sum, line) => sum + line.costCents * line.quantity, 0),
    lines: body.lines.map((line) => ({ ...line, productId: 'drink', productName: drink.name })),
    status: 'Received',
    cancellableUntil: '2999-01-01T00:00:00Z',
  }
}

// The delivery lines on screen, top to bottom.
async function deliveryLines(count) {
  await waitFor(() => expect(screen.getAllByRole('button', { name: /^Tirar/ })).toHaveLength(count))
  return screen.getAllByRole('button', { name: /^Tirar/ }).map((button) => button.closest('li'))
}

beforeAll(async () => {
  await i18nReady
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ReceivingScreen', () => {
  it('enters the delivery as scanned: the same code adds up, a pack gets its own line', async () => {
    const user = userEvent.setup()
    let sent
    fakeApi(
      routes({
        'POST /api/receipts': (options) => {
          sent = JSON.parse(options.body)
          return [201, receiptFrom(sent)]
        },
      }),
    )
    renderScreen()

    scan('7891000000014')
    await deliveryLines(1)
    scan('7891000000014')
    scan('17891000000011')

    // Newest on top: the pack, then the can scanned twice.
    const [pack, can] = await deliveryLines(2)
    await waitFor(() => expect(within(can).getByLabelText('Quantidade')).toHaveValue('2'))
    expect(within(pack).getByText(/Fardo 12 · 12 unidades/)).toBeInTheDocument()

    await user.type(within(pack).getByLabelText('Custo da embalagem'), '36,00')
    await user.type(within(can).getByLabelText('Custo unitário'), '3,50')
    fireEvent.change(within(pack).getByLabelText('Validade'), { target: { value: LATER } })
    fireEvent.change(within(can).getByLabelText('Validade'), { target: { value: LATER } })
    await user.type(screen.getByLabelText('Número da nota'), '12345')

    // What each can of the pack cost, and the invoice's total: 36,00 + 2 × 3,50.
    expect(within(pack).getByText('R$ 3,00 por unidade')).toBeInTheDocument()
    expect(screen.getByText('R$ 43,00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dar entrada' }))

    expect(sent).toEqual({
      lines: [
        { barcode: '17891000000011', quantity: 1, costCents: 3600, expiryDate: LATER },
        { barcode: '7891000000014', quantity: 2, costCents: 350, expiryDate: LATER },
      ],
      invoiceNumber: '12345',
    })
    expect(await screen.findByText('Entrada registrada')).toBeInTheDocument()
    expect(screen.getByText(/NF 12345/)).toBeInTheDocument()
    expect(screen.getByText(/Bipe o primeiro produto da nota/)).toBeInTheDocument()
  })

  it('takes the cursor to the cost of a new line', async () => {
    fakeApi(routes())
    renderScreen()

    scan('7891000000014')

    const [line] = await deliveryLines(1)
    await waitFor(() => expect(within(line).getByLabelText('Custo unitário')).toHaveFocus())
  })

  it('flags what is missing instead of sending it', async () => {
    const user = userEvent.setup()
    const fetch = fakeApi(routes())
    renderScreen()

    scan('7891000000014')
    const [line] = await deliveryLines(1)
    await user.click(screen.getByRole('button', { name: 'Dar entrada' }))

    expect(await screen.findByText('Confira o item destacado.')).toBeInTheDocument()
    expect(within(line).getByLabelText('Custo unitário')).toHaveAttribute('aria-invalid', 'true')

    // With the cost typed, the date is next.
    await user.type(within(line).getByLabelText('Custo unitário'), '3,50')
    await user.click(screen.getByRole('button', { name: 'Dar entrada' }))

    await waitFor(() => expect(within(line).getByLabelText('Validade')).toHaveFocus())
    expect(within(line).getByLabelText('Validade')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsMade(fetch)).not.toContain('POST /api/receipts')
  })

  it('points at the line the API refused', async () => {
    const user = userEvent.setup()
    fakeApi(routes({ 'POST /api/receipts': () => [422, { code: 'receipt.already_expired', line: 1 }] }))
    renderScreen()

    scan('7891000000014')
    const [line] = await deliveryLines(1)
    await user.type(within(line).getByLabelText('Custo unitário'), '3,50')
    fireEvent.change(within(line).getByLabelText('Validade'), { target: { value: LATER } })
    await user.click(screen.getByRole('button', { name: 'Dar entrada' }))

    expect(await screen.findByText('Energético 473ml: A validade informada já passou.')).toBeInTheDocument()
    expect(within(line).getByLabelText('Validade')).toHaveAttribute('aria-invalid', 'true')
  })

  it('splits a line when part of it expires on another date', async () => {
    const user = userEvent.setup()
    fakeApi(routes())
    renderScreen()

    scan('7891000000014')
    const [line] = await deliveryLines(1)
    await user.type(within(line).getByLabelText('Custo unitário'), '3,50')
    await user.click(within(line).getByRole('button', { name: 'Outra validade' }))

    // The copy sits right under the original, with its cost and a date of its own to type.
    const [, copy] = await deliveryLines(2)
    expect(within(copy).getByLabelText('Custo unitário')).toHaveValue('3,50')
    await waitFor(() => expect(within(copy).getByLabelText('Validade')).toHaveFocus())
  })

  it('registers an unknown code on the spot and adds it to the delivery', async () => {
    const user = userEvent.setup()
    let created
    fakeApi(
      routes({
        'GET /api/products/by-barcode/7891000000021': () => [404, { code: 'product.not_found' }],
        'POST /api/products': (options) => {
          const body = JSON.parse(options.body)
          created = body
          return [201, {
            ...drink,
            id: 'water',
            name: body.name,
            tracksExpiry: body.tracksExpiry,
            packagings: [{ id: 'bottle', gtin: '07891000000021', displayGtin: '7891000000021', name: null, conversionFactor: 1, isDefault: true }],
          }]
        },
      }),
    )
    renderScreen()

    // The cursor is on the cost of a line already in the delivery when the new code comes.
    scan('7891000000014')
    const [first] = await deliveryLines(1)
    await waitFor(() => expect(within(first).getByLabelText('Custo unitário')).toHaveFocus())

    scan('7891000000021')
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'Água 500ml')
    await user.click(within(dialog).getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: /Bebidas/ }))
    await user.type(within(dialog).getByLabelText('Preço de venda'), '2,50')
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    expect(created).toMatchObject({ barcode: '7891000000021', name: 'Água 500ml', categoryId: 'cat', salePriceCents: 250 })
    const [line] = await deliveryLines(2)
    expect(within(line).getByText('Água 500ml')).toBeInTheDocument()
    // A closing dialog hands the focus back a moment later, to whatever opened it. This one
    // was opened by a scan, and the cursor must stay on the new line, not go back to the
    // one it was on - hence the wait before looking.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(within(line).getByLabelText('Custo unitário')).toHaveFocus()
  })

  it('registers a supplier without leaving the delivery and picks it', async () => {
    const user = userEvent.setup()
    let sent
    fakeApi(
      routes({
        'POST /api/suppliers': (options) => {
          sent = JSON.parse(options.body)
          return [201, { id: 'sol', name: sent.name, taxId: sent.taxId, contact: sent.contact, active: true }]
        },
      }),
    )
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Novo fornecedor' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'Distribuidora Sol')
    await user.type(within(dialog).getByLabelText('CNPJ ou CPF'), '12.345.678/0001-90')
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    expect(sent).toEqual({ name: 'Distribuidora Sol', taxId: '12.345.678/0001-90', contact: '' })
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Fornecedor' })).toHaveTextContent('Distribuidora Sol'))
  })

  it('undoes a recent entry', async () => {
    const user = userEvent.setup()
    const fetch = fakeApi(
      routes({
        'GET /api/receipts': () => [200, {
          ...noReceipts,
          total: 1,
          totalPages: 1,
          items: [{
            id: 'receipt-9',
            receivedAt: '2026-09-26T15:24:00Z',
            supplierName: 'Distribuidora Sol',
            invoiceNumber: '777',
            lineCount: 3,
            totalCostCents: 12000,
            status: 'Received',
            cancellableUntil: '2999-01-01T00:00:00Z',
          }],
        }],
        'POST /api/receipts/receipt-9/cancel': () => [200, { id: 'receipt-9', status: 'Cancelled' }],
      }),
    )
    renderScreen()

    const recent = screen.getByRole('heading', { name: 'Últimas entradas' }).parentElement
    await user.click(await within(recent).findByRole('button', { name: 'Desfazer' }))

    await waitFor(() => expect(requestsMade(fetch)).toContain('POST /api/receipts/receipt-9/cancel'))
    expect(await within(recent).findByText('Desfeita')).toBeInTheDocument()
  })
})
