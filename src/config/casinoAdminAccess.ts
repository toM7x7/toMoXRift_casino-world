export const CASINO_WORLD_ID = '04f41fd3-3e59-45ee-9133-fd905a899ef3'

// World owner fallback plus explicitly approved operators.
// User IDs are identifiers, not secrets. Changes require a reviewed world release.
export const CASINO_ADMIN_USER_IDS = [
  'd84d700c-6b11-4497-8f2d-9abd4323e598',
] as const

export const CASINO_ADMIN_DECK_CENTER: [number, number, number] = [0, 7, -48]
export const CASINO_ADMIN_DECK_ROTATION_Y = Math.PI
export const CASINO_ADMIN_DESTINATION = {
  position: [0, 7.8, -52.5] as [number, number, number],
  yaw: 0,
} as const
export const CASINO_RECEPTION_DESTINATION = {
  position: [0, 0.55, -9.3] as [number, number, number],
  yaw: 180,
} as const

export function canAccessCasinoAdmin({
  userId,
  isGuest,
  ownerId,
  additionalUserIds = CASINO_ADMIN_USER_IDS,
}: {
  userId: string | null | undefined
  isGuest: boolean
  ownerId: string | null | undefined
  additionalUserIds?: readonly string[]
}): boolean {
  if (!userId || isGuest) return false
  return userId === ownerId || additionalUserIds.includes(userId)
}
