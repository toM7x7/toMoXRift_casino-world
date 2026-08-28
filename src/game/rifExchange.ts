import { CASINO_BALANCE } from './casinoBalance'

export const RIF_EXCHANGE_CONFIG = {
  apiBaseUrl: 'https://rif-coin.com',
  worldId: '04f41fd3-3e59-45ee-9133-fd905a899ef3',
  rateVersion: 'rif-casino-mutual-v2',
  rifUnits: CASINO_BALANCE.exchange.rifToCasino.rifUnits,
  casinoCoinUnits: CASINO_BALANCE.exchange.rifToCasino.casinoUnits,
  minimumRif: 1,
  maximumRif: CASINO_BALANCE.exchange.dailyLimitRif,
  dailyLimitRif: CASINO_BALANCE.exchange.dailyLimitRif,
  reverseExchangeEnabled: true,
  dayBoundary: 'Asia/Tokyo',
} as const

export const EXCHANGE_PENDING_KEY = 'casino.exchange.pending.v2'
export const LEGACY_EXCHANGE_PENDING_KEY = 'casino.exchange.pending.v1'
export const EXCHANGE_LAST_RECEIPT_KEY = 'casino.exchange.last.v2'
export const EXCHANGE_RIF_TOTAL_KEY = 'casino.flow.rif-in.v1'
export const EXCHANGE_COIN_TOTAL_KEY = 'casino.flow.coin-minted.v1'
export const EXCHANGE_COUNT_KEY = 'casino.flow.exchange-count.v1'
export const EXCHANGE_RIF_OUT_TOTAL_KEY = 'casino.flow.rif-out.v2'
export const EXCHANGE_COIN_REDEEMED_TOTAL_KEY = 'casino.flow.coin-redeemed.v2'
export const EXCHANGE_WITHDRAWAL_COUNT_KEY = 'casino.flow.withdrawal-count.v2'

export type ExchangeDirection = 'RIF_TO_CASINO' | 'CASINO_TO_RIF'

export interface RifExchangeQuote {
  direction: ExchangeDirection
  rifAmount: number
  casinoCoinAmount: number
  rateVersion: string
}

export interface PendingRifExchange extends RifExchangeQuote {
  clientTransactionId: string
  stage: 'created' | 'rif-paid' | 'casino-debited' | 'rif-granted'
  createdAt: string
  exchangeDay: string
  rifTransactionId?: string
}

export interface RifExchangeReceipt extends RifExchangeQuote {
  clientTransactionId: string
  rifTransactionId: string
  completedAt: string
  exchangeDay: string
  rifBalanceAfter: number
  casinoBalanceAfter: number
}

export interface LegacyPendingRifExchange {
  rifAmount: number
  casinoCoinAmount: number
  rateVersion: 'rif-to-casino-v1'
  clientTransactionId: string
  stage: 'created' | 'rif-paid'
  createdAt: string
  rifTransactionId?: string
}

export function quoteRifExchange(rifAmount: number): RifExchangeQuote | null {
  if (!Number.isSafeInteger(rifAmount)
    || rifAmount < RIF_EXCHANGE_CONFIG.minimumRif
    || rifAmount > RIF_EXCHANGE_CONFIG.maximumRif) return null
  return {
    direction: 'RIF_TO_CASINO',
    rifAmount,
    casinoCoinAmount: rifAmount * RIF_EXCHANGE_CONFIG.casinoCoinUnits,
    rateVersion: RIF_EXCHANGE_CONFIG.rateVersion,
  }
}

export function quoteCasinoWithdrawal(casinoCoinAmount: number): RifExchangeQuote | null {
  if (!Number.isSafeInteger(casinoCoinAmount)
    || casinoCoinAmount < RIF_EXCHANGE_CONFIG.casinoCoinUnits
    || casinoCoinAmount > RIF_EXCHANGE_CONFIG.dailyLimitRif * RIF_EXCHANGE_CONFIG.casinoCoinUnits
    || casinoCoinAmount % RIF_EXCHANGE_CONFIG.casinoCoinUnits !== 0) return null
  return {
    direction: 'CASINO_TO_RIF',
    rifAmount: casinoCoinAmount / RIF_EXCHANGE_CONFIG.casinoCoinUnits,
    casinoCoinAmount,
    rateVersion: RIF_EXCHANGE_CONFIG.rateVersion,
  }
}

export function minimumConvertibleRifAmount(): number {
  return RIF_EXCHANGE_CONFIG.minimumRif
}

export function isPendingRifExchange(value: unknown): value is PendingRifExchange {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PendingRifExchange>
  const quote = candidate.direction === 'CASINO_TO_RIF'
    ? quoteCasinoWithdrawal(candidate.casinoCoinAmount ?? Number.NaN)
    : quoteRifExchange(candidate.rifAmount ?? Number.NaN)
  const validStages = candidate.direction === 'CASINO_TO_RIF'
    ? ['created', 'casino-debited', 'rif-granted']
    : ['created', 'rif-paid']
  return typeof candidate.clientTransactionId === 'string'
    && candidate.clientTransactionId.length > 0
    && typeof candidate.exchangeDay === 'string'
    && typeof candidate.createdAt === 'string'
    && validStages.includes(candidate.stage ?? '')
    && quote?.rateVersion === candidate.rateVersion
    && quote?.rifAmount === candidate.rifAmount
    && quote?.casinoCoinAmount === candidate.casinoCoinAmount
}

export function isLegacyPendingRifExchange(value: unknown): value is LegacyPendingRifExchange {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LegacyPendingRifExchange>
  return candidate.rateVersion === 'rif-to-casino-v1'
    && (candidate.stage === 'created' || candidate.stage === 'rif-paid')
    && typeof candidate.clientTransactionId === 'string'
    && candidate.clientTransactionId.length > 0
    && typeof candidate.createdAt === 'string'
    && Number.isSafeInteger(candidate.rifAmount)
    && (candidate.rifAmount ?? 0) > 0
    && candidate.casinoCoinAmount === candidate.rifAmount
}

export function createExchangeTransactionId(userId: string, direction: ExchangeDirection): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const prefix = direction === 'RIF_TO_CASINO' ? 'deposit' : 'withdraw'
  return `casino-${prefix}-${userId.slice(0, 24)}-${randomPart}`.slice(0, 128)
}
