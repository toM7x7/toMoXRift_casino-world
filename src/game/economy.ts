export const COIN_KEY = 'casino.coins.v1'
export const STARTING_COINS = 10
export const MINIMUM_GAME_COINS = 1

export function canClaimRelief(
  casinoBalance: number,
  rifBalance: number | null = null,
  rifCheckComplete = true,
  minimumConvertibleRif = 1,
): boolean {
  if (!rifCheckComplete || casinoBalance >= MINIMUM_GAME_COINS) return false
  // null means RIF cannot currently be used (guest, preview, or API outage),
  // so a player with no playable casino coin is never locked out.
  return rifBalance === null || rifBalance < minimumConvertibleRif
}

export function receptionGrantFor(
  casinoBalance: number,
  rifBalance: number | null = null,
  rifCheckComplete = true,
  minimumConvertibleRif = 1,
): number {
  return canClaimRelief(
    casinoBalance,
    rifBalance,
    rifCheckComplete,
    minimumConvertibleRif,
  ) ? STARTING_COINS : 0
}
