import { describe, expect, it } from 'vitest'
import { analyzeDiscard, dealGuidedMahjong, isWinningHand, winningTiles } from './mahjong'

describe('mahjong rules', () => {
  it('accepts four melds and one pair', () => {
    expect(isWinningHand([
      0, 1, 2,
      3, 4, 5,
      9, 10, 11,
      18, 18, 18,
      27, 27,
    ])).toBe(true)
  })

  it('rejects an incomplete hand', () => {
    expect(isWinningHand([0, 1, 3, 3, 4, 5, 9, 10, 11, 18, 18, 18, 27, 27])).toBe(false)
  })

  it('finds a simple edge wait', () => {
    expect(winningTiles([
      0, 1,
      3, 4, 5,
      9, 10, 11,
      18, 18, 18,
      27, 27,
    ])).toContain(2)
  })

  it('starts the beginner table in tenpai', () => {
    const deal = dealGuidedMahjong(() => 0)
    expect(deal.hands[0]).toHaveLength(13)
    expect(winningTiles(deal.hands[0]).length).toBeGreaterThan(0)
    expect(deal.hands.slice(1).every((hand) => hand.length === 13)).toBe(true)
  })

  it('recommends a discard that preserves a wait', () => {
    const deal = dealGuidedMahjong(() => 0)
    const drawnHand = [...deal.hands[0], 8]
    const analysis = analyzeDiscard(drawnHand)
    expect(analysis.waits.length).toBeGreaterThan(0)
  })
})
