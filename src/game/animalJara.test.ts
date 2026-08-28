import { describe, expect, it } from 'vitest'
import {
  ANIMAL_JARA_EMBLEMS,
  createAnimalJaraWall,
  dealAnimalJara,
  discardAnimalJaraTile,
  drawAnimalJaraTile,
  findAnimalJaraWinningSets,
  isValidAnimalJaraSet,
  isWinningAnimalJaraHand,
  suggestAnimalJaraDiscard,
} from './animalJara'

describe('animal jara', () => {
  it('builds 48 tiles with four copies of every animal', () => {
    const wall = createAnimalJaraWall(() => 0.42)
    expect(wall).toHaveLength(48)
    for (const emblem of ANIMAL_JARA_EMBLEMS) {
      expect(wall.filter((id) => id === emblem.id)).toHaveLength(4)
    }
  })

  it('deals eight tiles to four seats and leaves sixteen in the wall', () => {
    const deal = dealAnimalJara(createAnimalJaraWall(() => 0.31))
    expect(deal.hands).toHaveLength(4)
    expect(deal.hands.every((hand) => hand.length === 8)).toBe(true)
    expect(deal.wall).toHaveLength(16)
  })

  it('accepts same-animal trios and distinct same-habitat teams', () => {
    expect(isValidAnimalJaraSet(['cat', 'cat', 'cat'])).toBe(true)
    expect(isValidAnimalJaraSet(['cat', 'rabbit', 'fox'])).toBe(true)
    expect(isValidAnimalJaraSet(['cat', 'rabbit', 'whale'])).toBe(false)
    expect(isValidAnimalJaraSet(['cat', 'cat', 'rabbit'])).toBe(false)
  })

  it('finds complete nine-tile hands without relying on set order', () => {
    const hand = ['cat', 'whale', 'owl', 'cat', 'shark', 'parrot', 'cat', 'pufferfish', 'eagle']
    expect(isWinningAnimalJaraHand(hand)).toBe(true)
    expect(findAnimalJaraWinningSets(hand)).toHaveLength(3)
    expect(isWinningAnimalJaraHand([...hand.slice(0, 8), 'rabbit'])).toBe(false)
  })

  it('consumes exactly one wall tile per draw and returns to eight after discard', () => {
    const deal = dealAnimalJara(createAnimalJaraWall(() => 0.73))
    const drawn = drawAnimalJaraTile(deal.hands[0], deal.wall)
    expect(drawn?.hand).toHaveLength(9)
    expect(drawn?.wall).toHaveLength(15)
    const discardIndex = suggestAnimalJaraDiscard(drawn?.hand ?? [])
    const discarded = discardAnimalJaraTile(drawn?.hand ?? [], discardIndex)
    expect(discarded?.hand).toHaveLength(8)
    expect(discarded?.discarded).toBeTruthy()
  })

  it('cannot draw forever after the finite wall is exhausted', () => {
    const deal = dealAnimalJara(createAnimalJaraWall(() => 0.19))
    let hand = deal.hands[0]
    let wall = deal.wall
    let turns = 0
    while (wall.length > 0) {
      const drawn = drawAnimalJaraTile(hand, wall)
      expect(drawn).not.toBeNull()
      if (!drawn) break
      wall = drawn.wall
      const discarded = discardAnimalJaraTile(drawn.hand, suggestAnimalJaraDiscard(drawn.hand))
      expect(discarded).not.toBeNull()
      if (!discarded) break
      hand = discarded.hand
      turns += 1
    }
    expect(turns).toBe(16)
    expect(wall).toHaveLength(0)
    expect(drawAnimalJaraTile(hand, wall)).toBeNull()
  })
})
