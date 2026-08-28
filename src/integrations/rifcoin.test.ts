import { describe, expect, it, vi } from 'vitest'
import { XRiftCurrency } from './rifcoin'

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('RIFCoin client', () => {
  it('uses negative payments and positive grants with stable transaction IDs', async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const input = JSON.parse(String(init?.body)) as { amount: number }
      return response({
        success: true,
        transactionId: `tx-${input.amount}`,
        previousBalance: 20,
        amount: input.amount,
        balance: 20 + input.amount,
      })
    })
    const currency = new XRiftCurrency({
      apiBaseUrl: 'https://example.test',
      worldId: 'world',
      fetch: request,
    })
    const base = {
      userId: 'user',
      amount: 3,
      reason: 'exchange',
      clientTransactionId: 'stable-id',
    }
    expect((await currency.pay(base)).amount).toBe(-3)
    expect((await currency.grant(base)).amount).toBe(3)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
