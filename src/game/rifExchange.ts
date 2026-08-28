import { CASINO_BALANCE } from './casinoBalance'

export const RIF_EXCHANGE_CONFIG = {
  apiBaseUrl: 'https://rif-coin.com',
  worldId: '04f41fd3-3e59-45ee-9133-fd905a899ef3',
  rateVersion: 'rif-to-casino-v1',
  rifUnits: CASINO_BALANCE.exchange.rifToCasino.rifUnits,
  casinoCoinUnits: CASINO_BALANCE.exchange.rifToCasino.casinoUnits,
  rounding: 'reject-fraction',
  minimumRif: 1,
  maximumRif: 1_000_000,
  reverseExchangeEnabled: false,
} as const

export const EXCHANGE_PENDING_KEY = 'casino.exchange.pending.v1'
export const EXCHANGE_LAST_RECEIPT_KEY = 'casino.exchange.last.v1'
export const EXCHANGE_RIF_TOTAL_KEY = 'casino.flow.rif-in.v1'
export const EXCHANGE_COIN_TOTAL_KEY = 'casino.flow.coin-minted.v1'
export const EXCHANGE_COUNT_KEY = 'casino.flow.exchange-count.v1'

export interface RifExchangeQuote {
  rifAmount: number
  casinoCoinAmount: number
  rateVersion: string
}

export interface RifExchangeRate {
  rateVersion: string
  rifUnits: number
  casinoCoinUnits: number
  minimumRif: number
  maximumRif: number
}

export interface PendingRifExchange extends RifExchangeQuote {
  clientTransactionId: string
  stage: 'created' | 'rif-paid'
  createdAt: string
  rifTransactionId?: string
}

export interface RifExchangeReceipt extends RifExchangeQuote {
  clientTransactionId: string
  rifTransactionId: string
  completedAt: string
  rifBalanceAfter: number
  casinoBalanceAfter: number
}

export function isValidRifAmount(amount: number): boolean {
  return Number.isInteger(amount)
    && amount >= RIF_EXCHANGE_CONFIG.minimumRif
    && amount <= RIF_EXCHANGE_CONFIG.maximumRif
}

export function quoteRifExchangeAtRate(
  rifAmount: number,
  rate: RifExchangeRate,
): RifExchangeQuote | null {
  if (!Number.isInteger(rifAmount)
    || rifAmount < rate.minimumRif
    || rifAmount > rate.maximumRif
    || !Number.isInteger(rate.rifUnits)
    || !Number.isInteger(rate.casinoCoinUnits)
    || rate.rifUnits <= 0
    || rate.casinoCoinUnits <= 0) return null
  const scaledAmount = rifAmount * rate.casinoCoinUnits
  // Future non-1:1 rates never hide fractional loss. The user adjusts the
  // input until it maps to a whole casino coin amount.
  if (!Number.isSafeInteger(scaledAmount) || scaledAmount % rate.rifUnits !== 0) return null
  const casinoCoinAmount = scaledAmount / rate.rifUnits
  if (!Number.isSafeInteger(casinoCoinAmount) || casinoCoinAmount <= 0) return null
  return {
    rifAmount,
    casinoCoinAmount,
    rateVersion: rate.rateVersion,
  }
}

export function quoteRifExchange(rifAmount: number): RifExchangeQuote | null {
  return quoteRifExchangeAtRate(rifAmount, RIF_EXCHANGE_CONFIG)
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left)
  let b = Math.abs(right)
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

export function minimumConvertibleRifAmount(
  rate: RifExchangeRate = RIF_EXCHANGE_CONFIG,
): number | null {
  if (!Number.isInteger(rate.rifUnits)
    || !Number.isInteger(rate.casinoCoinUnits)
    || rate.rifUnits <= 0
    || rate.casinoCoinUnits <= 0) return null
  const step = rate.rifUnits / greatestCommonDivisor(rate.rifUnits, rate.casinoCoinUnits)
  const amount = Math.ceil(rate.minimumRif / step) * step
  return amount <= rate.maximumRif ? amount : null
}

export function isPendingRifExchange(value: unknown): value is PendingRifExchange {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PendingRifExchange>
  return typeof candidate.clientTransactionId === 'string'
    && candidate.clientTransactionId.length > 0
    && (candidate.stage === 'created' || candidate.stage === 'rif-paid')
    && typeof candidate.createdAt === 'string'
    && candidate.rateVersion === RIF_EXCHANGE_CONFIG.rateVersion
    && quoteRifExchange(candidate.rifAmount ?? Number.NaN)?.casinoCoinAmount === candidate.casinoCoinAmount
}

export function createExchangeTransactionId(userId: string): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `casino-exchange-${userId.slice(0, 24)}-${randomPart}`.slice(0, 128)
}
