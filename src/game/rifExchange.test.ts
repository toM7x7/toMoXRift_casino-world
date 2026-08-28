import { describe, expect, it } from 'vitest'
import {
  RIF_EXCHANGE_CONFIG,
  isPendingRifExchange,
  isValidRifAmount,
  minimumConvertibleRifAmount,
  quoteRifExchange,
  quoteRifExchangeAtRate,
} from './rifExchange'

describe('RIF to casino coin exchange', () => {
  it('quotes the current 1:1 rate', () => {
    expect(quoteRifExchange(1)).toEqual({
      rifAmount: 1,
      casinoCoinAmount: 1,
      rateVersion: 'rif-to-casino-v1',
    })
    expect(quoteRifExchange(137)?.casinoCoinAmount).toBe(137)
  })

  it('accepts only positive integers within the configured bounds', () => {
    expect(isValidRifAmount(1)).toBe(true)
    expect(isValidRifAmount(RIF_EXCHANGE_CONFIG.maximumRif)).toBe(true)
    expect(isValidRifAmount(0)).toBe(false)
    expect(isValidRifAmount(1.5)).toBe(false)
    expect(isValidRifAmount(RIF_EXCHANGE_CONFIG.maximumRif + 1)).toBe(false)
  })

  it('ships only the one-way exchange in this release', () => {
    expect(RIF_EXCHANGE_CONFIG.reverseExchangeEnabled).toBe(false)
  })

  it('supports a future integer ratio without silently rounding fractions', () => {
    const futureRate = {
      rateVersion: 'future-2-to-3',
      rifUnits: 2,
      casinoCoinUnits: 3,
      minimumRif: 1,
      maximumRif: 100,
    }
    expect(quoteRifExchangeAtRate(2, futureRate)?.casinoCoinAmount).toBe(3)
    expect(quoteRifExchangeAtRate(3, futureRate)).toBeNull()
    expect(minimumConvertibleRifAmount(futureRate)).toBe(2)
  })

  it('validates a resumable pending journal against the active rate', () => {
    expect(isPendingRifExchange({
      clientTransactionId: 'exchange-1',
      stage: 'created',
      createdAt: '2026-08-17T00:00:00.000Z',
      rateVersion: 'rif-to-casino-v1',
      rifAmount: 25,
      casinoCoinAmount: 25,
    })).toBe(true)
    expect(isPendingRifExchange({
      clientTransactionId: 'exchange-1',
      stage: 'created',
      createdAt: '2026-08-17T00:00:00.000Z',
      rateVersion: 'old-rate',
      rifAmount: 25,
      casinoCoinAmount: 25,
    })).toBe(false)
  })
})
