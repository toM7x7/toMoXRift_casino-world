import { describe, expect, it } from 'vitest'
import {
  canJoinRound,
  choiceBetTotals,
  isValidBetAmount,
  MAX_ROUND_PLAYERS,
  roundToken,
  seededResult,
  totalReturn,
  type CasinoRoundBet,
} from './casinoRounds'

const bet: CasinoRoundBet = {
  userId: 'u1',
  userName: 'Player',
  choice: 2,
  amount: 3,
}

describe('casino formal rounds', () => {
  it('uses only the displayed bet amounts', () => {
    expect(isValidBetAmount(1)).toBe(true)
    expect(isValidBetAmount(3)).toBe(true)
    expect(isValidBetAmount(5)).toBe(true)
    expect(isValidBetAmount(2)).toBe(false)
  })

  it('returns fair total payout for exact-choice games', () => {
    expect(totalReturn(bet, 2, 8)).toBe(24)
    expect(totalReturn(bet, 1, 8)).toBe(0)
    expect(totalReturn(bet, 2, 4)).toBe(12)
  })

  it('caps a round at eight users while preserving existing bets', () => {
    const bets = Object.fromEntries(Array.from({ length: MAX_ROUND_PLAYERS }, (_, index) => [
      `u${index}`,
      { ...bet, userId: `u${index}` },
    ]))
    expect(canJoinRound(bets, 'new-user')).toBe(false)
    expect(canJoinRound(bets, 'u3')).toBe(true)
  })

  it('derives deterministic bounded results and settlement tokens', () => {
    expect(seededResult(123456, 8)).toBe(seededResult(123456, 8))
    expect(seededResult(123456, 8)).toBeGreaterThanOrEqual(0)
    expect(seededResult(123456, 8)).toBeLessThan(8)
    expect(roundToken('fate', 4, 99)).toBe('fate:4:99')
  })

  it('summarizes the chips placed on every betting target', () => {
    expect(choiceBetTotals({
      u1: bet,
      u2: { ...bet, userId: 'u2', amount: 5 },
      u3: { ...bet, userId: 'u3', choice: 0, amount: 1 },
    }, 4)).toEqual([1, 0, 8, 0])
  })
})
