export const CASINO_PLAYER_STATS_KEY = 'casino.player-stats.v1'
export const CASINO_PLAYER_REGISTRY_KEY = 'casino.player-registry.v1'

export const CASINO_WAGERED_TOTAL_KEY = 'casino.flow.wagered.v1'
export const CASINO_PAYOUT_TOTAL_KEY = 'casino.flow.payout.v1'
export const CASINO_REFUND_TOTAL_KEY = 'casino.flow.refund.v1'
export const CASINO_RELIEF_TOTAL_KEY = 'casino.flow.relief.v1'
export const CASINO_TRANSACTION_TOTAL_KEY = 'casino.flow.transaction-count.v1'

export const MAX_REGISTERED_CASINO_PLAYERS = 200

export type CasinoLedgerCategory = 'wager' | 'payout' | 'refund' | 'relief' | 'rif-exchange'

export interface CasinoPlayerStats {
  version: 1
  wagered: number
  payouts: number
  refunds: number
  relief: number
  rifMinted: number
  transactions: number
}

export interface RegisteredCasinoPlayer {
  id: string
  name: string
}

export const EMPTY_CASINO_PLAYER_STATS: CasinoPlayerStats = {
  version: 1,
  wagered: 0,
  payouts: 0,
  refunds: 0,
  relief: 0,
  rifMinted: 0,
  transactions: 0,
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0
}

export function parseCasinoPlayerStats(value: unknown): CasinoPlayerStats {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_CASINO_PLAYER_STATS }
  const candidate = value as Partial<CasinoPlayerStats>
  return {
    version: 1,
    wagered: safeCount(candidate.wagered),
    payouts: safeCount(candidate.payouts),
    refunds: safeCount(candidate.refunds),
    relief: safeCount(candidate.relief),
    rifMinted: safeCount(candidate.rifMinted),
    transactions: safeCount(candidate.transactions),
  }
}

export function classifyCasinoTransaction(delta: number, reason: string): CasinoLedgerCategory | null {
  if (!Number.isFinite(delta) || delta === 0) return null
  if (reason.includes('救済')) return 'relief'
  if (reason.includes('RIF交換')) return 'rif-exchange'
  if (reason.includes('返却')) return 'refund'
  return delta < 0 ? 'wager' : 'payout'
}

export function applyCasinoPlayerEvent(
  current: CasinoPlayerStats,
  category: CasinoLedgerCategory,
  amount: number,
): CasinoPlayerStats {
  const value = safeCount(Math.abs(amount))
  const parsed = parseCasinoPlayerStats(current)
  const next = { ...parsed, transactions: parsed.transactions + 1 }
  if (category === 'wager') next.wagered += value
  if (category === 'payout') next.payouts += value
  if (category === 'refund') next.refunds += value
  if (category === 'relief') next.relief += value
  if (category === 'rif-exchange') next.rifMinted += value
  return next
}

export function parseCasinoPlayerRegistry(value: unknown): RegisteredCasinoPlayer[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const players: RegisteredCasinoPlayer[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const candidate = item as Partial<RegisteredCasinoPlayer>
    if (typeof candidate.id !== 'string' || candidate.id.length < 1 || seen.has(candidate.id)) continue
    const name = typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim().slice(0, 40)
      : '名称未設定'
    seen.add(candidate.id)
    players.push({ id: candidate.id.slice(0, 96), name })
  }
  return players.slice(-MAX_REGISTERED_CASINO_PLAYERS)
}

export function mergeCasinoPlayerRegistry(
  current: unknown,
  player: RegisteredCasinoPlayer,
): RegisteredCasinoPlayer[] {
  const players = parseCasinoPlayerRegistry(current)
  const normalized = {
    id: player.id.slice(0, 96),
    name: player.name.trim().slice(0, 40) || '名称未設定',
  }
  const existingIndex = players.findIndex((entry) => entry.id === normalized.id)
  if (existingIndex >= 0) players[existingIndex] = normalized
  else players.push(normalized)
  return players.slice(-MAX_REGISTERED_CASINO_PLAYERS)
}

export function gmNetCoins({
  wagered,
  payouts,
  refunds,
  relief,
}: {
  wagered: number
  payouts: number
  refunds: number
  relief: number
}): number {
  return safeCount(wagered) - safeCount(payouts) - safeCount(refunds) - safeCount(relief)
}
