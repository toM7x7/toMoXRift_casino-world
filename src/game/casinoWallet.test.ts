import { describe, expect, it } from 'vitest'
import {
  applyRifDeposit,
  applyLegacyRifDeposit,
  applyRifWithdrawalDebit,
  createCasinoWallet,
  createCasinoWagerId,
  jstExchangeDay,
  placeCasinoWager,
  refundCasinoWager,
  settleCasinoWager,
  totalCasinoCoins,
} from './casinoWallet'

describe('casino wallet v2', () => {
  it('creates instance-independent wager IDs instead of reusing round numbers', () => {
    const first = createCasinoWagerId('blackjack', 'user-123')
    const second = createCasinoWagerId('blackjack', 'user-123')
    expect(first).toMatch(/^blackjack:user-123:/u)
    expect(second).not.toBe(first)
  })
  it('migrates legacy coins to non-redeemable bonus without multiplying them', () => {
    const wallet = createCasinoWallet(137)
    expect(wallet).toMatchObject({ bonus: 137, redeemable: 0 })
    expect(totalCasinoCoins(wallet)).toBe(137)
  })

  it('spends bonus before redeemable and returns the wager to its source', () => {
    const deposited = applyRifDeposit(createCasinoWallet(1), {
      clientTransactionId: 'deposit-1', rifAmount: 1, casinoCoinAmount: 50, day: '2026-08-28', dailyLimitRif: 5,
    })!
    const wagered = placeCasinoWager(deposited, 'fate:1:user', 3, 123)!
    expect(wagered).toMatchObject({ bonus: 0, redeemable: 48 })
    expect(wagered.wagers['fate:1:user']).toMatchObject({ bonus: 1, redeemable: 2, amount: 3 })
    const refunded = refundCasinoWager(wagered, 'fate:1:user')!
    expect(refunded).toMatchObject({ bonus: 1, redeemable: 50 })
    expect(refundCasinoWager(refunded, 'fate:1:user')).toEqual(refunded)
  })

  it('attributes winnings to the stake source and rounds mixed redeemable returns down', () => {
    const wallet = { ...createCasinoWallet(), bonus: 1, redeemable: 2 }
    const wagered = placeCasinoWager(wallet, 'derby:1:user', 3, 123)!
    const settled = settleCasinoWager(wagered, 'derby:1:user', 11)!
    expect(settled).toMatchObject({ bonus: 4, redeemable: 7 })
  })

  it('keeps a pure redeemable win redeemable and closes a losing wager', () => {
    const wallet = { ...createCasinoWallet(), redeemable: 10 }
    const won = settleCasinoWager(placeCasinoWager(wallet, 'bj:1:user', 2, 123)!, 'bj:1:user', 5)!
    expect(won).toMatchObject({ bonus: 0, redeemable: 13, wagers: {} })
    const lost = settleCasinoWager(placeCasinoWager(won, 'bj:2:user', 2, 124)!, 'bj:2:user', 0)!
    expect(lost).toMatchObject({ bonus: 0, redeemable: 11, wagers: {} })
    expect(settleCasinoWager(lost, 'bj:2:user', 99)).toEqual(lost)
  })

  it('applies 1 RIF to 50 redeemable coins once and caps total daily exchange at 5 RIF', () => {
    let wallet = createCasinoWallet()
    wallet = applyRifDeposit(wallet, {
      clientTransactionId: 'deposit-1', rifAmount: 5, casinoCoinAmount: 250, day: '2026-08-28', dailyLimitRif: 5,
    })!
    expect(wallet.redeemable).toBe(250)
    expect(applyRifDeposit(wallet, {
      clientTransactionId: 'deposit-2', rifAmount: 1, casinoCoinAmount: 50, day: '2026-08-28', dailyLimitRif: 5,
    })).toBeNull()
    expect(applyRifDeposit(wallet, {
      clientTransactionId: 'deposit-1', rifAmount: 5, casinoCoinAmount: 250, day: '2026-08-28', dailyLimitRif: 5,
    })).toEqual(wallet)

    expect(applyRifWithdrawalDebit(wallet, {
      clientTransactionId: 'same-day-withdraw', rifAmount: 1, casinoCoinAmount: 50, day: '2026-08-28', dailyLimitRif: 5,
    })).toBeNull()
    wallet = applyRifWithdrawalDebit(wallet, {
      clientTransactionId: 'withdraw-1', rifAmount: 5, casinoCoinAmount: 250, day: '2026-08-29', dailyLimitRif: 5,
    })!
    expect(wallet.redeemable).toBe(0)
    expect(applyRifWithdrawalDebit(wallet, {
      clientTransactionId: 'withdraw-1', rifAmount: 5, casinoCoinAmount: 250, day: '2026-08-29', dailyLimitRif: 5,
    })).toEqual(wallet)
    expect(applyRifWithdrawalDebit(wallet, {
      clientTransactionId: 'withdraw-2', rifAmount: 1, casinoCoinAmount: 50, day: '2026-08-29', dailyLimitRif: 5,
    })).toBeNull()
  })

  it('resets usage on a new JST day without changing either balance bucket', () => {
    const first = applyRifDeposit(createCasinoWallet(10), {
      clientTransactionId: 'day-1', rifAmount: 5, casinoCoinAmount: 250, day: '2026-08-28', dailyLimitRif: 5,
    })!
    const second = applyRifDeposit(first, {
      clientTransactionId: 'day-2', rifAmount: 1, casinoCoinAmount: 50, day: '2026-08-29', dailyLimitRif: 5,
    })!
    expect(second).toMatchObject({ bonus: 10, redeemable: 300, dailyExchange: { day: '2026-08-29', rifIn: 1, rifOut: 0 } })
  })

  it('uses a stable JST date around midnight', () => {
    expect(jstExchangeDay(Date.parse('2026-08-27T15:00:00.000Z'))).toBe('2026-08-28')
    expect(jstExchangeDay(Date.parse('2026-08-28T14:59:59.999Z'))).toBe('2026-08-28')
  })

  it('completes an old 1:1 pending deposit as bonus exactly once', () => {
    const first = applyLegacyRifDeposit(createCasinoWallet(), 'legacy-1', 3)!
    expect(first).toMatchObject({ bonus: 3, redeemable: 0 })
    expect(applyLegacyRifDeposit(first, 'legacy-1', 3)).toEqual(first)
  })
})
