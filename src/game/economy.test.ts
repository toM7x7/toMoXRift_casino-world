import { describe, expect, it } from 'vitest'
import { canClaimRelief, MINIMUM_GAME_COINS, receptionGrantFor } from './economy'

describe('casino relief rule', () => {
  it('allows a reception claim only when no game or RIF exchange is available', () => {
    expect(MINIMUM_GAME_COINS).toBe(1)
    expect(canClaimRelief(0, 0, true)).toBe(true)
    expect(canClaimRelief(0, null, true)).toBe(true)
    expect(canClaimRelief(0, 1, true)).toBe(false)
    expect(canClaimRelief(0, 1, true, 2)).toBe(true)
    expect(canClaimRelief(0, 2, true, 2)).toBe(false)
    expect(canClaimRelief(0, 0, false)).toBe(false)
    expect(canClaimRelief(1)).toBe(false)
    expect(canClaimRelief(10)).toBe(false)
  })

  it('grants exactly ten coins when the player would otherwise be locked out', () => {
    expect(receptionGrantFor(0, 0, true)).toBe(10)
    expect(receptionGrantFor(0, 1, true)).toBe(0)
    expect(receptionGrantFor(1)).toBe(0)
  })
})
