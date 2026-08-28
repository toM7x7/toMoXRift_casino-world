import { describe, expect, it } from 'vitest'
import {
  RIF_EXCHANGE_CONFIG,
  isPendingRifExchange,
  quoteCasinoWithdrawal,
  quoteRifExchange,
} from './rifExchange'

describe('approved mutual RIF exchange', () => {
  it('quotes the same 1 RIF to 50 coin rate in both directions', () => {
    expect(quoteRifExchange(1)).toMatchObject({ rifAmount: 1, casinoCoinAmount: 50 })
    expect(quoteRifExchange(5)).toMatchObject({ rifAmount: 5, casinoCoinAmount: 250 })
    expect(quoteCasinoWithdrawal(50)).toMatchObject({ rifAmount: 1, casinoCoinAmount: 50 })
    expect(quoteCasinoWithdrawal(250)).toMatchObject({ rifAmount: 5, casinoCoinAmount: 250 })
  })

  it('rejects fractions, non-50 withdrawals, and amounts above the daily cap', () => {
    expect(quoteRifExchange(0)).toBeNull()
    expect(quoteRifExchange(1.5)).toBeNull()
    expect(quoteRifExchange(6)).toBeNull()
    expect(quoteCasinoWithdrawal(49)).toBeNull()
    expect(quoteCasinoWithdrawal(75)).toBeNull()
    expect(quoteCasinoWithdrawal(300)).toBeNull()
    expect(RIF_EXCHANGE_CONFIG.reverseExchangeEnabled).toBe(true)
  })

  it('validates direction-specific resumable journals', () => {
    expect(isPendingRifExchange({
      clientTransactionId: 'deposit-1', direction: 'RIF_TO_CASINO', stage: 'rif-paid',
      createdAt: '2026-08-28T00:00:00.000Z', exchangeDay: '2026-08-28',
      rateVersion: RIF_EXCHANGE_CONFIG.rateVersion, rifAmount: 2, casinoCoinAmount: 100,
    })).toBe(true)
    expect(isPendingRifExchange({
      clientTransactionId: 'withdraw-1', direction: 'CASINO_TO_RIF', stage: 'casino-debited',
      createdAt: '2026-08-28T00:00:00.000Z', exchangeDay: '2026-08-28',
      rateVersion: RIF_EXCHANGE_CONFIG.rateVersion, rifAmount: 2, casinoCoinAmount: 100,
    })).toBe(true)
  })
})
