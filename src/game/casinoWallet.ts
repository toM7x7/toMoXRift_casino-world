export const CASINO_WALLET_KEY = 'casino.wallet.v2'

export function createCasinoWagerId(game: string, userId: string): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${game}:${userId.slice(0, 24)}:${randomPart}`.slice(0, 128)
}

export interface WalletAllocation {
  bonus: number
  redeemable: number
}

export interface CasinoWager extends WalletAllocation {
  amount: number
  createdAt: number
}

export interface DailyExchangeUsage {
  day: string
  rifIn: number
  rifOut: number
}

export interface CasinoWallet extends WalletAllocation {
  version: 2
  wagers: Record<string, CasinoWager>
  dailyExchange: DailyExchangeUsage
  appliedExchangeIds: string[]
  closedWagerIds: string[]
}

export const EMPTY_DAILY_EXCHANGE: DailyExchangeUsage = {
  day: '',
  rifIn: 0,
  rifOut: 0,
}

const MAX_APPLIED_EXCHANGE_IDS = 64

function whole(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function parseAllocation(value: unknown): WalletAllocation | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<WalletAllocation>
  const bonus = whole(candidate.bonus)
  const redeemable = whole(candidate.redeemable)
  return bonus === null || redeemable === null ? null : { bonus, redeemable }
}

export function createCasinoWallet(legacyCoins = 0): CasinoWallet {
  return {
    version: 2,
    bonus: Math.max(0, Math.floor(legacyCoins)),
    redeemable: 0,
    wagers: {},
    dailyExchange: { ...EMPTY_DAILY_EXCHANGE },
    appliedExchangeIds: [],
    closedWagerIds: [],
  }
}

export function parseCasinoWallet(value: unknown, legacyCoins = 0): CasinoWallet {
  if (typeof value !== 'object' || value === null) return createCasinoWallet(legacyCoins)
  const candidate = value as Partial<CasinoWallet>
  const allocation = parseAllocation(candidate)
  if (candidate.version !== 2 || !allocation) return createCasinoWallet(legacyCoins)

  const wagers: Record<string, CasinoWager> = {}
  if (typeof candidate.wagers === 'object' && candidate.wagers !== null) {
    for (const [key, wager] of Object.entries(candidate.wagers)) {
      const parsed = parseAllocation(wager)
      const amount = whole((wager as Partial<CasinoWager>).amount)
      const createdAt = whole((wager as Partial<CasinoWager>).createdAt)
      if (parsed && amount !== null && amount > 0 && createdAt !== null
        && parsed.bonus + parsed.redeemable === amount) {
        wagers[key] = { ...parsed, amount, createdAt }
      }
    }
  }

  const daily = candidate.dailyExchange
  const parsedDaily = typeof daily === 'object' && daily !== null
    && typeof daily.day === 'string'
    && whole(daily.rifIn) !== null
    && whole(daily.rifOut) !== null
    ? { day: daily.day, rifIn: whole(daily.rifIn)!, rifOut: whole(daily.rifOut)! }
    : { ...EMPTY_DAILY_EXCHANGE }

  const appliedExchangeIds = Array.isArray(candidate.appliedExchangeIds)
    ? candidate.appliedExchangeIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(-MAX_APPLIED_EXCHANGE_IDS)
    : []
  const closedWagerIds = Array.isArray(candidate.closedWagerIds)
    ? candidate.closedWagerIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(-MAX_APPLIED_EXCHANGE_IDS)
    : []

  return {
    version: 2,
    ...allocation,
    wagers,
    dailyExchange: parsedDaily,
    appliedExchangeIds,
    closedWagerIds,
  }
}

export function totalCasinoCoins(wallet: WalletAllocation): number {
  return wallet.bonus + wallet.redeemable
}

export function exchangeUsageForDay(wallet: CasinoWallet, day: string): DailyExchangeUsage {
  return wallet.dailyExchange.day === day
    ? wallet.dailyExchange
    : { day, rifIn: 0, rifOut: 0 }
}

function rememberExchange(wallet: CasinoWallet, clientTransactionId: string): string[] {
  if (wallet.appliedExchangeIds.includes(clientTransactionId)) return wallet.appliedExchangeIds
  return [...wallet.appliedExchangeIds, clientTransactionId].slice(-MAX_APPLIED_EXCHANGE_IDS)
}

export function applyBonusDelta(wallet: CasinoWallet, delta: number): CasinoWallet | null {
  if (!Number.isSafeInteger(delta) || delta === 0 || wallet.bonus + delta < 0) return null
  return { ...wallet, bonus: wallet.bonus + delta }
}

export function placeCasinoWager(
  wallet: CasinoWallet,
  wagerId: string,
  amount: number,
  createdAt: number,
): CasinoWallet | null {
  if (!wagerId || wallet.closedWagerIds.includes(wagerId)
    || !Number.isSafeInteger(amount) || amount <= 0 || totalCasinoCoins(wallet) < amount) return null
  const bonus = Math.min(wallet.bonus, amount)
  const redeemable = amount - bonus
  const existing = wallet.wagers[wagerId]
  const wager: CasinoWager = existing
    ? {
        bonus: existing.bonus + bonus,
        redeemable: existing.redeemable + redeemable,
        amount: existing.amount + amount,
        createdAt: existing.createdAt,
      }
    : { bonus, redeemable, amount, createdAt }
  return {
    ...wallet,
    bonus: wallet.bonus - bonus,
    redeemable: wallet.redeemable - redeemable,
    wagers: { ...wallet.wagers, [wagerId]: wager },
  }
}

export function refundCasinoWager(wallet: CasinoWallet, wagerId: string): CasinoWallet | null {
  if (wallet.closedWagerIds.includes(wagerId)) return wallet
  const wager = wallet.wagers[wagerId]
  if (!wager) return null
  const wagers = { ...wallet.wagers }
  delete wagers[wagerId]
  return {
    ...wallet,
    bonus: wallet.bonus + wager.bonus,
    redeemable: wallet.redeemable + wager.redeemable,
    wagers,
    closedWagerIds: [...wallet.closedWagerIds, wagerId].slice(-MAX_APPLIED_EXCHANGE_IDS),
  }
}

export function settleCasinoWager(
  wallet: CasinoWallet,
  wagerId: string,
  totalReturn: number,
): CasinoWallet | null {
  if (wallet.closedWagerIds.includes(wagerId)) return wallet
  const wager = wallet.wagers[wagerId]
  if (!wager || !Number.isSafeInteger(totalReturn) || totalReturn < 0) return null
  const wagers = { ...wallet.wagers }
  delete wagers[wagerId]

  // Mixed-source returns round redeemable coins down. The sub-coin remainder
  // becomes bonus, so repeated mixed bets can never manufacture redeemable value.
  const redeemableReturn = wager.redeemable === wager.amount
    ? totalReturn
    : Math.floor(totalReturn * wager.redeemable / wager.amount)
  return {
    ...wallet,
    bonus: wallet.bonus + totalReturn - redeemableReturn,
    redeemable: wallet.redeemable + redeemableReturn,
    wagers,
    closedWagerIds: [...wallet.closedWagerIds, wagerId].slice(-MAX_APPLIED_EXCHANGE_IDS),
  }
}

export function applyRifDeposit(
  wallet: CasinoWallet,
  input: {
    clientTransactionId: string
    rifAmount: number
    casinoCoinAmount: number
    day: string
    dailyLimitRif: number
  },
): CasinoWallet | null {
  if (wallet.appliedExchangeIds.includes(input.clientTransactionId)) return wallet
  const usage = exchangeUsageForDay(wallet, input.day)
  if (!Number.isSafeInteger(input.rifAmount) || input.rifAmount <= 0
    || !Number.isSafeInteger(input.casinoCoinAmount) || input.casinoCoinAmount <= 0
    || usage.rifIn + usage.rifOut + input.rifAmount > input.dailyLimitRif) return null
  return {
    ...wallet,
    redeemable: wallet.redeemable + input.casinoCoinAmount,
    dailyExchange: { ...usage, rifIn: usage.rifIn + input.rifAmount },
    appliedExchangeIds: rememberExchange(wallet, input.clientTransactionId),
  }
}

export function applyLegacyRifDeposit(
  wallet: CasinoWallet,
  clientTransactionId: string,
  bonusCoinAmount: number,
): CasinoWallet | null {
  if (wallet.appliedExchangeIds.includes(clientTransactionId)) return wallet
  if (!clientTransactionId || !Number.isSafeInteger(bonusCoinAmount) || bonusCoinAmount <= 0) return null
  return {
    ...wallet,
    bonus: wallet.bonus + bonusCoinAmount,
    appliedExchangeIds: rememberExchange(wallet, clientTransactionId),
  }
}

export function applyRifWithdrawalDebit(
  wallet: CasinoWallet,
  input: {
    clientTransactionId: string
    rifAmount: number
    casinoCoinAmount: number
    day: string
    dailyLimitRif: number
  },
): CasinoWallet | null {
  if (wallet.appliedExchangeIds.includes(input.clientTransactionId)) return wallet
  const usage = exchangeUsageForDay(wallet, input.day)
  if (!Number.isSafeInteger(input.rifAmount) || input.rifAmount <= 0
    || !Number.isSafeInteger(input.casinoCoinAmount) || input.casinoCoinAmount <= 0
    || wallet.redeemable < input.casinoCoinAmount
    || usage.rifIn + usage.rifOut + input.rifAmount > input.dailyLimitRif) return null
  return {
    ...wallet,
    redeemable: wallet.redeemable - input.casinoCoinAmount,
    dailyExchange: { ...usage, rifOut: usage.rifOut + input.rifAmount },
    appliedExchangeIds: rememberExchange(wallet, input.clientTransactionId),
  }
}

export function jstExchangeDay(serverTimeMs: number): string {
  return new Date(serverTimeMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
