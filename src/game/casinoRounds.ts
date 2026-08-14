export const CASINO_BET_OPTIONS = [1, 3, 5] as const
export const MAX_ROUND_PLAYERS = 8

export interface CasinoRoundBet {
  userId: string
  userName: string
  choice: number
  amount: number
}

export function isValidBetAmount(amount: number) {
  return CASINO_BET_OPTIONS.includes(amount as (typeof CASINO_BET_OPTIONS)[number])
}

export function canJoinRound(
  bets: Record<string, CasinoRoundBet>,
  userId: string,
) {
  return Boolean(bets[userId]) || Object.keys(bets).length < MAX_ROUND_PLAYERS
}

export function seededResult(seed: number, choiceCount: number) {
  if (!Number.isInteger(choiceCount) || choiceCount <= 0) return 0
  let value = seed | 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return Math.abs(value | 0) % choiceCount
}

export function totalReturn(
  bet: CasinoRoundBet | undefined,
  result: number,
  choiceCount: number,
) {
  if (!bet || bet.choice !== result || choiceCount <= 0) return 0
  return bet.amount * choiceCount
}

export function choiceBetTotals(
  bets: Record<string, CasinoRoundBet>,
  choiceCount: number,
) {
  const totals = Array.from({ length: Math.max(0, choiceCount) }, () => 0)
  Object.values(bets).forEach((bet) => {
    if (bet.choice >= 0 && bet.choice < totals.length) {
      totals[bet.choice] += bet.amount
    }
  })
  return totals
}

export function roundToken(game: 'fate' | 'derby', roundId: number, startedAt: number) {
  return `${game}:${roundId}:${startedAt}`
}
