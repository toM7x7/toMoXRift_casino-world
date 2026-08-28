import { describe, expect, it } from 'vitest'
import {
  CASINO_BALANCE,
  balancedExactChoiceReturn,
  blackjackTotalReturn,
  classifyDicePoker,
  dicePokerTotalReturn,
} from './casinoBalance'

describe('casino balance', () => {
  it('keeps the approved mutual 1 RIF to 50 coin exchange centralized', () => {
    expect(CASINO_BALANCE.exchange.rifToCasino).toMatchObject({ rifUnits: 1, casinoUnits: 50 })
    expect(CASINO_BALANCE.exchange.casinoToRif).toMatchObject({ casinoUnits: 50, rifUnits: 1 })
    expect(CASINO_BALANCE.exchange.dailyLimitRif).toBe(5)
  })

  it('uses explicit rounded paytables for exact-choice games', () => {
    expect(balancedExactChoiceReturn('fate', 3, 2, 2)).toBe(22)
    expect(balancedExactChoiceReturn('fate', 3, 2, 1)).toBe(0)
    expect(balancedExactChoiceReturn('derby', 5, 0, 0)).toBe(19)
  })

  it('classifies pirate three-dice poker hands', () => {
    expect(classifyDicePoker([2, 2, 2])).toBe('three-kind')
    expect(classifyDicePoker([4, 2, 3])).toBe('straight')
    expect(classifyDicePoker([1, 5, 1])).toBe('pair')
    expect(classifyDicePoker([0, 2, 5])).toBe('high')
  })

  it('keeps emblem dice poker at 95.83 percent theoretical RTP', () => {
    let returned = 0
    for (let first = 0; first < 6; first += 1) {
      for (let second = 0; second < 6; second += 1) {
        for (let third = 0; third < 6; third += 1) {
          returned += dicePokerTotalReturn(2, [first, second, third])
        }
      }
    }
    expect(returned / (216 * 2)).toBeCloseTo(0.958333, 5)
  })

  it('pays blackjack with standard pushes, even money wins, and 3:2 naturals', () => {
    expect(blackjackTotalReturn({ wager: 2, outcome: 'lose' })).toBe(0)
    expect(blackjackTotalReturn({ wager: 2, outcome: 'push' })).toBe(2)
    expect(blackjackTotalReturn({ wager: 2, outcome: 'win' })).toBe(4)
    expect(blackjackTotalReturn({ wager: 2, outcome: 'win', natural: true })).toBe(5)
  })
})
