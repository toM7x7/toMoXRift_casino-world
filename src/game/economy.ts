export const COIN_KEY = 'casino.coins.v1'
export const STARTING_COINS = 10

export function receptionGrantFor(balance: number): number {
  return balance === 0 ? STARTING_COINS : 0
}

export function canClaimRelief(balance: number): boolean {
  return receptionGrantFor(balance) > 0
}
