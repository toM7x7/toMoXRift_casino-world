import { describe, expect, it } from 'vitest'
import {
  applyCasinoPlayerEvent,
  classifyCasinoTransaction,
  EMPTY_CASINO_PLAYER_STATS,
  gmNetCoins,
  mergeCasinoPlayerRegistry,
  parseCasinoPlayerStats,
} from './casinoLedger'

describe('casino circulation ledger', () => {
  it('classifies normal wagers, payouts, refunds, relief and RIF minting', () => {
    expect(classifyCasinoTransaction(-3, 'ダービー・赤にBET')).toBe('wager')
    expect(classifyCasinoTransaction(12, 'ダービー的中・払戻')).toBe('payout')
    expect(classifyCasinoTransaction(2, '開始前ENTRY返却')).toBe('refund')
    expect(classifyCasinoTransaction(10, 'GM救済10枚')).toBe('relief')
    expect(classifyCasinoTransaction(5, 'RIF交換')).toBe('rif-exchange')
  })

  it('accumulates a player record without accepting malformed stored values', () => {
    const parsed = parseCasinoPlayerStats({ wagered: -4, payouts: 3.8, transactions: 'bad' })
    expect(parsed).toEqual({ ...EMPTY_CASINO_PLAYER_STATS, payouts: 3 })
    expect(applyCasinoPlayerEvent(parsed, 'wager', 5)).toMatchObject({ wagered: 5, payouts: 3, transactions: 1 })
  })

  it('keeps one registry row per user and refreshes the display name', () => {
    const first = mergeCasinoPlayerRegistry([], { id: 'user-1', name: '旧名' })
    const second = mergeCasinoPlayerRegistry(first, { id: 'user-1', name: '新名' })
    expect(second).toEqual([{ id: 'user-1', name: '新名' }])
  })

  it('reports GM net after payouts, refunds and relief issuance', () => {
    expect(gmNetCoins({ wagered: 100, payouts: 60, refunds: 10, relief: 20 })).toBe(10)
  })
})
