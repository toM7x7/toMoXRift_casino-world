export type BalancedExactChoiceGame = 'fate' | 'derby'

export type DicePokerHand = 'three-kind' | 'straight' | 'pair' | 'high'

export const CASINO_BALANCE = {
  schemaVersion: 1,
  exchange: {
    rifToCasino: { enabled: true, rifUnits: 1, casinoUnits: 50, feeBps: 0 },
    casinoToRif: { enabled: true, casinoUnits: 50, rifUnits: 1, feeBps: 0 },
    dailyLimitRif: 5,
  },
  blackjack: {
    roundBet: 2,
    dealerStandsOn: 17,
    dealerHitsSoft17: false,
    blackjackReturn: 5,
    allowDoubleDown: true,
  },
  fate: {
    choices: 8,
    betOptions: [1, 3, 5] as const,
    returnByBet: { 1: 7, 3: 22, 5: 37 } as Record<number, number>,
    theoreticalRtpByBet: { 1: 0.875, 3: 22 / 24, 5: 37 / 40 },
  },
  derby: {
    choices: 4,
    betOptions: [1, 3, 5] as const,
    returnByBet: { 1: 3, 3: 11, 5: 19 } as Record<number, number>,
    theoreticalRtpByBet: { 1: 3 / 4, 3: 11 / 12, 5: 19 / 20 },
  },
  dicePoker: {
    betOptions: [2, 4, 6] as const,
    symbols: ['錨', '羅針', '宝箱', '大砲', '船', '王冠'] as const,
    // Total-return multipliers. Pair 1.5x, straight 2x, three-kind 4x.
    // Across all 216 outcomes this produces 95.83% theoretical RTP.
    returnNumerators: {
      high: 0,
      pair: 3,
      straight: 4,
      'three-kind': 8,
    } as Record<DicePokerHand, number>,
    returnDenominator: 2,
  },
} as const

export function balancedExactChoiceReturn(
  game: BalancedExactChoiceGame,
  amount: number,
  selectedChoice: number,
  resultChoice: number,
) {
  if (selectedChoice !== resultChoice) return 0
  return CASINO_BALANCE[game].returnByBet[amount] ?? 0
}

export function classifyDicePoker(dice: readonly number[]): DicePokerHand {
  if (dice.length !== 3 || dice.some((value) => !Number.isInteger(value) || value < 0 || value > 5)) {
    return 'high'
  }
  const sorted = [...dice].sort((a, b) => a - b)
  if (sorted[0] === sorted[2]) return 'three-kind'
  if (sorted[0] === sorted[1] || sorted[1] === sorted[2]) return 'pair'
  if (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) return 'straight'
  return 'high'
}

export function dicePokerTotalReturn(amount: number, dice: readonly number[]) {
  if (!CASINO_BALANCE.dicePoker.betOptions.includes(amount as 2 | 4 | 6)) return 0
  const hand = classifyDicePoker(dice)
  return amount
    * CASINO_BALANCE.dicePoker.returnNumerators[hand]
    / CASINO_BALANCE.dicePoker.returnDenominator
}

export function blackjackTotalReturn({
  wager,
  outcome,
  natural = false,
}: {
  wager: number
  outcome: 'win' | 'lose' | 'push'
  natural?: boolean
}) {
  if (wager <= 0 || outcome === 'lose') return 0
  if (outcome === 'push') return wager
  if (natural) return wager + wager * 1.5
  return wager * 2
}
