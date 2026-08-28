import { describe, expect, it } from 'vitest'
import {
  canAccessCasinoAdmin,
  CASINO_ADMIN_DECK_CENTER,
  CASINO_ADMIN_DECK_ROTATION_Y,
  CASINO_ADMIN_DESTINATION,
  CASINO_RECEPTION_DESTINATION,
} from './casinoAdminAccess'

describe('casino admin access', () => {
  it('allows the world owner', () => {
    expect(canAccessCasinoAdmin({
      userId: 'owner',
      ownerId: 'owner',
      isGuest: false,
      additionalUserIds: [],
    })).toBe(true)
  })

  it('allows an explicitly approved operator', () => {
    expect(canAccessCasinoAdmin({
      userId: 'operator',
      ownerId: 'owner',
      isGuest: false,
      additionalUserIds: ['operator'],
    })).toBe(true)
  })

  it('fails closed for guests and unknown users', () => {
    expect(canAccessCasinoAdmin({
      userId: 'operator',
      ownerId: 'owner',
      isGuest: true,
      additionalUserIds: ['operator'],
    })).toBe(false)
    expect(canAccessCasinoAdmin({
      userId: 'visitor',
      ownerId: 'owner',
      isGuest: false,
      additionalUserIds: [],
    })).toBe(false)
  })

  it('lands inside the raised deck and returns in front of reception', () => {
    const [centerX, centerY, centerZ] = CASINO_ADMIN_DECK_CENTER
    const [arrivalX, arrivalY, arrivalZ] = CASINO_ADMIN_DESTINATION.position
    expect(Math.abs(arrivalX - centerX)).toBeLessThan(9)
    expect(arrivalY).toBeGreaterThan(centerY + 0.3)
    expect(Math.abs(arrivalZ - centerZ)).toBeLessThan(5.5)
    expect(arrivalZ).toBeLessThan(centerZ)
    expect(CASINO_ADMIN_DESTINATION.yaw).toBe(0)
    expect(CASINO_ADMIN_DECK_ROTATION_Y).toBe(Math.PI)
    expect(CASINO_RECEPTION_DESTINATION.position).toEqual([0, 0.55, -9.3])
  })
})
