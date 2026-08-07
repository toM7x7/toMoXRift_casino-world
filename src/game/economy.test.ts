import { describe, expect, it } from 'vitest'
import { canClaimRelief, receptionGrantFor } from './economy'

describe('casino relief rule', () => {
  it('allows a reception claim only when the balance is exactly zero', () => {
    expect(canClaimRelief(0)).toBe(true)
    expect(canClaimRelief(1)).toBe(false)
    expect(canClaimRelief(10)).toBe(false)
  })

  it('grants exactly ten coins when claimed at zero balance', () => {
    expect(receptionGrantFor(0)).toBe(10)
    expect(receptionGrantFor(1)).toBe(0)
  })
})
