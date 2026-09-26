// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forgetSalesPass } from '@/api/sales'
import { Toaster } from '@/components/ui/sonner'
import { i18nReady } from '@/i18n'
import { fakeApi, requestsMade } from '@/test/fakeApi'
import { SalesScreen } from './SalesScreen'

const owner = { name: 'Ana', role: 'Owner', shopName: 'Mercadinho' }
const staff = { name: 'Bia', role: 'Staff', shopName: 'Mercadinho' }

const report = {
  period: 'Month',
  from: '2026-09-01',
  to: '2026-09-30',
  totals: { sales: 2, units: 7, revenueCents: 4548, costCents: 2800, netCents: 1748 },
  buckets: [{ start: '2026-09-26T00:00:00', sales: 2, revenueCents: 4548, costCents: 2800, netCents: 1748 }],
  products: [{ productId: 'cola', name: 'Refrigerante Cola 2L', units: 2, revenueCents: 2000, costCents: 1240, netCents: 760 }],
}

const pass = { token: 'pass-1', expiresAt: '2999-01-01T00:00:00Z' }

function renderScreen(account) {
  return render(
    <>
      <SalesScreen account={account} />
      <Toaster />
    </>,
  )
}

async function typePin(user, pin) {
  for (const digit of pin) {
    await user.click(screen.getByRole('button', { name: `Número ${digit}` }))
  }
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeAll(async () => {
  await i18nReady
})

beforeEach(() => {
  forgetSalesPass()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SalesScreen', () => {
  it('tells staff to ask the owner when there is no PIN yet', async () => {
    fakeApi({ 'GET /api/sales/pin': () => [200, { configured: false, lockedUntil: null }] })

    renderScreen(staff)

    expect(await screen.findByText('O dono ainda não criou o PIN de vendas.')).toBeInTheDocument()
  })

  it('refuses a wrong PIN and opens the report with the right one', async () => {
    const user = userEvent.setup()
    let passSent
    fakeApi({
      'GET /api/sales/pin': () => [200, { configured: true, lockedUntil: null }],
      'POST /api/sales/unlock': (options) =>
        JSON.parse(options.body).pin === '2580' ? [200, pass] : [422, { code: 'sales.pin_wrong' }],
      'GET /api/sales/report': (options) => {
        passSent = options.headers['X-Sales-Access']
        return [200, report]
      },
    })
    renderScreen(staff)
    await screen.findByText('Digite o PIN para ver as vendas.')

    await typePin(user, '0000')
    expect(await screen.findByText('PIN incorreto.')).toBeInTheDocument()

    await typePin(user, '2580')

    expect(await screen.findByText('R$ 45,48')).toBeInTheDocument()
    expect(screen.getByText('margem de 38,4%')).toBeInTheDocument()
    expect(screen.getByText('Refrigerante Cola 2L')).toBeInTheDocument()
    expect(passSent).toBe('pass-1')
    // Staff opens the area but does not change the PIN.
    expect(screen.queryByRole('button', { name: /Alterar PIN/ })).not.toBeInTheDocument()
  })

  it('has the owner create the PIN, typed twice, and opens the report', async () => {
    const user = userEvent.setup()
    const fetch = fakeApi({
      'GET /api/sales/pin': () => [200, { configured: false, lockedUntil: null }],
      'PUT /api/sales/pin': () => [204],
      'POST /api/sales/unlock': () => [200, pass],
      'GET /api/sales/report': () => [200, report],
    })
    renderScreen(owner)
    await screen.findByText('Crie o PIN de vendas')

    await typePin(user, '2580')
    expect(await screen.findByText('Digite o mesmo PIN de novo para confirmar.')).toBeInTheDocument()
    await typePin(user, '2580')

    expect(await screen.findByText('R$ 45,48')).toBeInTheDocument()
    expect(requestsMade(fetch)).toContain('PUT /api/sales/pin')
  })

  it('goes back to the PIN when the pass is refused', async () => {
    const user = userEvent.setup()
    fakeApi({
      'GET /api/sales/pin': () => [200, { configured: true, lockedUntil: null }],
      'POST /api/sales/unlock': () => [200, pass],
      'GET /api/sales/report': () => [403, { code: 'sales.locked' }],
    })
    renderScreen(staff)
    await screen.findByText('Digite o PIN para ver as vendas.')

    await typePin(user, '2580')

    expect(await screen.findByText('Digite o PIN para ver as vendas.')).toBeInTheDocument()
  })
})
