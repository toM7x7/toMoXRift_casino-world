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

export type CasinoRoundGame = 'fate' | 'derby' | 'dice-poker'

export function roundToken(game: CasinoRoundGame, roundId: number, startedAt: number) {
  return `${game}:${roundId}:${startedAt}`
}

export function countdownSeconds(startedAt: number, now: number) {
  if (startedAt <= now) return 0
  return Math.ceil((startedAt - now) / 1000)
}

export function roundProgress(
  startedAt: number,
  durationMs: number,
  now: number,
  durationFactor = 1,
) {
  if (startedAt <= 0 || durationMs <= 0 || durationFactor <= 0) return 0
  return Math.min(1, Math.max(0, (now - startedAt) / (durationMs * durationFactor)))
}

function normalizePositive(value: number) {
  const twoPi = Math.PI * 2
  return ((value % twoPi) + twoPi) % twoPi
}

function easeOutQuint(value: number) {
  return 1 - (1 - value) ** 5
}

export function synchronizedWheelAngle({
  roundId,
  resultIndex,
  choiceCount,
  startedAt,
  durationMs,
  now,
  turns = 5,
}: {
  roundId: number
  resultIndex: number
  choiceCount: number
  startedAt: number
  durationMs: number
  now: number
  turns?: number
}) {
  if (choiceCount <= 0) return 0
  const sectorAngle = (Math.PI * 2) / choiceCount
  const startIndex = ((roundId * 3) % choiceCount + choiceCount) % choiceCount
  const startAngle = startIndex * sectorAngle
  const desiredAngle = Math.PI / 2 - (resultIndex + 0.5) * sectorAngle
  const correction = normalizePositive(desiredAngle - startAngle)
  const progress = roundProgress(startedAt, durationMs, now)
  return startAngle + easeOutQuint(progress) * (Math.PI * 2 * turns + correction)
}

export function finishOrder(winner: number, choiceCount: number) {
  if (!Number.isInteger(choiceCount) || choiceCount <= 0) return []
  const normalizedWinner = ((winner % choiceCount) + choiceCount) % choiceCount
  return Array.from({ length: choiceCount }, (_, index) => (normalizedWinner + index) % choiceCount)
}
