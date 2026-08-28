// Adapted from N-JELLY/RIFCoin-dev public client SDK, commit
// 86c5bbdeb0e806deaa0fb5e9a020ef45e6a6287e (2026-08-17).
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface XRiftCurrencyOptions {
  apiBaseUrl: string
  worldId: string
  fetch?: typeof fetch
}

export interface CurrencyChange {
  userId: string
  amount: number
  reason: string
  metadata?: JsonValue
  clientTransactionId: string
}

export interface TransactionResult {
  success: true
  transactionId: string
  previousBalance: number
  amount: number
  balance: number
}

export interface RequestOptions {
  signal?: AbortSignal
}

export class XRiftCurrencyError extends Error {
  readonly code: string
  readonly status: number
  readonly balance: number | undefined

  constructor(code: string, message: string, status: number, balance?: number) {
    super(message)
    this.name = 'XRiftCurrencyError'
    this.code = code
    this.status = status
    this.balance = balance
  }
}

function requireString(value: string, name: string): void {
  if (!value.trim()) throw new TypeError(`${name} is required`)
}

function requirePositiveInteger(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new TypeError('amount must be a positive integer')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireTransactionResult(value: unknown, status: number): TransactionResult {
  if (!isRecord(value)
    || value.success !== true
    || typeof value.transactionId !== 'string'
    || typeof value.previousBalance !== 'number'
    || !Number.isInteger(value.previousBalance)
    || value.previousBalance < 0
    || typeof value.amount !== 'number'
    || !Number.isInteger(value.amount)
    || typeof value.balance !== 'number'
    || !Number.isInteger(value.balance)
    || value.balance < 0) {
    throw new XRiftCurrencyError('INVALID_RESPONSE', 'RIFCoin returned an invalid transaction result', status)
  }
  return {
    success: true,
    transactionId: value.transactionId,
    previousBalance: value.previousBalance,
    amount: value.amount,
    balance: value.balance,
  }
}

export class XRiftCurrency {
  private readonly apiBaseUrl: string
  private readonly worldId: string
  private readonly request: typeof fetch

  constructor(options: XRiftCurrencyOptions) {
    requireString(options.apiBaseUrl, 'apiBaseUrl')
    requireString(options.worldId, 'worldId')
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/+$/u, '')
    this.worldId = options.worldId
    this.request = options.fetch ?? fetch
  }

  async getBalance(userId: string, options: RequestOptions = {}): Promise<number> {
    requireString(userId, 'userId')
    const result = await this.getJson(
      `/api/v1/users/${encodeURIComponent(userId)}/balance`,
      { signal: options.signal },
    )
    if (!isRecord(result)
      || typeof result.balance !== 'number'
      || !Number.isInteger(result.balance)
      || result.balance < 0) {
      throw new XRiftCurrencyError('INVALID_RESPONSE', 'RIFCoin returned an invalid balance', 200)
    }
    return result.balance
  }

  async pay(input: CurrencyChange, options: RequestOptions = {}): Promise<TransactionResult> {
    requireString(input.userId, 'userId')
    requireString(input.reason, 'reason')
    requireString(input.clientTransactionId, 'clientTransactionId')
    requirePositiveInteger(input.amount)

    const result = await this.getJson('/api/v1/transactions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: input.userId,
        worldId: this.worldId,
        amount: -input.amount,
        reason: input.reason,
        clientTransactionId: input.clientTransactionId,
        ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      }),
      signal: options.signal,
    })
    return requireTransactionResult(result, 200)
  }

  private async getJson(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    const response = await this.request(`${this.apiBaseUrl}${path}`, { ...init, headers })

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new XRiftCurrencyError('INVALID_RESPONSE', 'RIFCoin returned invalid JSON', response.status)
    }

    if (!response.ok) {
      const record = isRecord(data) ? data : {}
      throw new XRiftCurrencyError(
        typeof record.error === 'string' ? record.error : 'REQUEST_FAILED',
        typeof record.message === 'string' ? record.message : 'request failed',
        response.status,
        typeof record.balance === 'number' ? record.balance : undefined,
      )
    }
    return data
  }
}
