import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import {
  useUsers,
  useServerClock,
  useWorldStorage,
  WorldStorageError,
  type User,
} from '@xrift/world-components'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  applyBonusDelta,
  applyLegacyRifDeposit,
  applyRifDeposit,
  applyRifWithdrawalDebit,
  CASINO_WALLET_KEY,
  createCasinoWallet,
  exchangeUsageForDay,
  jstExchangeDay,
  parseCasinoWallet,
  placeCasinoWager,
  refundCasinoWager,
  settleCasinoWager,
  totalCasinoCoins,
  type CasinoWallet,
} from '../game/casinoWallet'
import {
  canClaimRelief,
  COIN_KEY,
  receptionGrantFor,
  STARTING_COINS,
} from '../game/economy'
import {
  applyCasinoPlayerEvent,
  CASINO_PAYOUT_TOTAL_KEY,
  CASINO_PLAYER_REGISTRY_KEY,
  CASINO_PLAYER_STATS_KEY,
  CASINO_REFUND_TOTAL_KEY,
  CASINO_RELIEF_TOTAL_KEY,
  CASINO_TRANSACTION_TOTAL_KEY,
  CASINO_WAGERED_TOTAL_KEY,
  mergeCasinoPlayerRegistry,
  parseCasinoPlayerStats,
  type CasinoLedgerCategory,
} from '../game/casinoLedger'
import {
  createExchangeTransactionId,
  EXCHANGE_COIN_TOTAL_KEY,
  EXCHANGE_COIN_REDEEMED_TOTAL_KEY,
  EXCHANGE_COUNT_KEY,
  EXCHANGE_LAST_RECEIPT_KEY,
  EXCHANGE_PENDING_KEY,
  EXCHANGE_RIF_TOTAL_KEY,
  EXCHANGE_RIF_OUT_TOTAL_KEY,
  EXCHANGE_WITHDRAWAL_COUNT_KEY,
  isPendingRifExchange,
  isLegacyPendingRifExchange,
  LEGACY_EXCHANGE_PENDING_KEY,
  minimumConvertibleRifAmount,
  quoteCasinoWithdrawal,
  quoteRifExchange,
  RIF_EXCHANGE_CONFIG,
  type PendingRifExchange,
  type RifExchangeReceipt,
} from '../game/rifExchange'
import { XRiftCurrency, XRiftCurrencyError } from '../integrations/rifcoin'
import { getScreenProfile, screenCenter } from '../ui/responsive'

type EconomySource = 'world-storage' | 'local-preview'

interface CasinoEconomyValue {
  coins: number
  bonusCoins: number
  redeemableCoins: number
  ready: boolean
  busy: boolean
  notice: string
  source: EconomySource
  rifBalance: number | null
  rifReady: boolean
  exchangeNotice: string
  pendingExchangeAmount: number | null
  pendingExchangeDirection: 'RIF_TO_CASINO' | 'CASINO_TO_RIF' | null
  dailyRifIn: number
  dailyRifOut: number
  claimRelief: () => Promise<number | null>
  refreshRifBalance: () => Promise<number | null>
  convertRifToCasino: (rifAmount: number) => Promise<number | null>
  convertCasinoToRif: (casinoCoinAmount: number) => Promise<number | null>
  placeWager: (wagerId: string, amount: number, reason: string) => Promise<number | null>
  refundWager: (wagerId: string, reason: string) => Promise<number | null>
  settleWager: (wagerId: string, totalReturn: number, reason: string) => Promise<number | null>
}

const CasinoEconomyContext = createContext<CasinoEconomyValue | null>(null)

const rifCurrency = new XRiftCurrency({
  apiBaseUrl: RIF_EXCHANGE_CONFIG.apiBaseUrl,
  worldId: RIF_EXCHANGE_CONFIG.worldId,
})
const minimumExchangeRif = minimumConvertibleRifAmount() ?? RIF_EXCHANGE_CONFIG.minimumRif

function exchangeErrorMessage(error: unknown): string {
  if (!(error instanceof XRiftCurrencyError)) {
    return '通信結果を確認できません。同じ金額で再試行してください'
  }
  if (error.code === 'INSUFFICIENT_BALANCE') return 'RIF残高が不足しています'
  if (error.code === 'WORLD_DISABLED') return '現在このワールドからのRIF交換は停止中です'
  if (error.code === 'INVALID_RESPONSE') return 'RIFCoinから不正な応答を受信しました'
  return 'RIFCoinとの通信に失敗しました。同じ金額で再試行してください'
}

function isStorageUnavailable(error: unknown): boolean {
  if (error instanceof WorldStorageError) {
    return error.code === 'UNAUTHORIZED' || error.code === 'NOT_IN_WORLD'
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code)
    return code === 'UNAUTHORIZED' || code === 'NOT_IN_WORLD'
  }
  return false
}

export function CasinoEconomyProvider({
  children,
  previewCoins,
}: {
  children: ReactNode
  previewCoins?: number
}) {
  const storage = useWorldStorage()
  const { localUser } = useUsers()
  const serverClock = useServerClock()
  const [wallet, setWallet] = useState<CasinoWallet>(() => createCasinoWallet(STARTING_COINS))
  const [coins, setCoins] = useState(STARTING_COINS)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('コイン情報を読み込み中')
  const [source, setSource] = useState<EconomySource>('world-storage')
  const [rifBalance, setRifBalance] = useState<number | null>(null)
  const [rifReady, setRifReady] = useState(false)
  const [exchangeNotice, setExchangeNotice] = useState('RIF残高を確認中')
  const [pendingExchangeAmount, setPendingExchangeAmount] = useState<number | null>(null)
  const [pendingExchangeDirection, setPendingExchangeDirection] = useState<'RIF_TO_CASINO' | 'CASINO_TO_RIF' | null>(null)
  const [exchangeDay, setExchangeDay] = useState(() => jstExchangeDay(serverClock.now()))
  const coinsRef = useRef(STARTING_COINS)
  const walletRef = useRef(wallet)
  const initializedForRef = useRef<string | null>(null)
  const operationRef = useRef(false)
  const pendingExchangeRef = useRef<PendingRifExchange | null>(null)

  useEffect(() => {
    const refreshDay = () => setExchangeDay(jstExchangeDay(serverClock.now()))
    refreshDay()
    const timer = window.setInterval(refreshDay, 30_000)
    return () => window.clearInterval(timer)
  }, [serverClock.now, serverClock.timeJumpCount])

  const commitWallet = useCallback((next: CasinoWallet) => {
    walletRef.current = next
    setWallet(next)
    const total = totalCasinoCoins(next)
    coinsRef.current = total
    setCoins(total)
  }, [])

  const persistWallet = useCallback(async (next: CasinoWallet) => {
    if (source === 'world-storage') {
      await storage.player.set(CASINO_WALLET_KEY, next)
    }
    commitWallet(next)
    return totalCasinoCoins(next)
  }, [commitWallet, source, storage])

  const recordLedgerEvent = useCallback(async (
    category: CasinoLedgerCategory,
    amount: number,
  ) => {
    if (!localUser || localUser.isGuest || source !== 'world-storage') return
    const sharedAmountKey = category === 'wager'
      ? CASINO_WAGERED_TOTAL_KEY
      : category === 'payout'
        ? CASINO_PAYOUT_TOTAL_KEY
        : category === 'refund'
          ? CASINO_REFUND_TOTAL_KEY
          : category === 'relief'
            ? CASINO_RELIEF_TOTAL_KEY
            : null
    try {
      const current = parseCasinoPlayerStats(await storage.player.get(CASINO_PLAYER_STATS_KEY))
      const next = applyCasinoPlayerEvent(current, category, amount)
      const writes: Array<Promise<unknown>> = [
        storage.player.set(CASINO_PLAYER_STATS_KEY, next),
        storage.shared.increment(CASINO_TRANSACTION_TOTAL_KEY, 1),
      ]
      if (sharedAmountKey) writes.push(storage.shared.increment(sharedAmountKey, Math.abs(amount)))
      const results = await Promise.allSettled(writes)
      if (results.some((result) => result.status === 'rejected')) {
        console.warn('Casino circulation ledger was only partially updated.')
      }
    } catch (error) {
      console.warn('Casino circulation ledger update failed.', error)
    }
  }, [localUser, source, storage])

  useEffect(() => {
    const initializationKey = previewCoins !== undefined
      ? `preview:${Math.max(0, Math.floor(previewCoins))}`
      : localUser
        ? `user:${localUser.id}`
        : 'anonymous-preview'
    if (initializedForRef.current === initializationKey) return
    initializedForRef.current = initializationKey
    setReady(false)

    const initialize = async () => {
      if (previewCoins !== undefined) {
        setSource('local-preview')
        commitWallet(createCasinoWallet(Math.max(0, Math.floor(previewCoins))))
        setNotice('ローカル遊技レビュー用コイン')
        setReady(true)
        return
      }
      if (!localUser) {
        setSource('local-preview')
        commitWallet(createCasinoWallet(STARTING_COINS))
        setNotice('ローカル確認用コイン')
        setReady(true)
        return
      }
      if (localUser.isGuest) {
        setSource('local-preview')
        commitWallet(createCasinoWallet(STARTING_COINS))
        setNotice('ゲスト: このセッションのみ保存')
        setReady(true)
        return
      }
      setSource('world-storage')
      try {
        const [storedWallet, storedLegacy] = await Promise.all([
          storage.player.get(CASINO_WALLET_KEY),
          storage.player.get(COIN_KEY),
        ])
        const legacyCoins = typeof storedLegacy === 'number' && Number.isFinite(storedLegacy)
          ? Math.max(0, Math.floor(storedLegacy))
          : 0
        const next = parseCasinoWallet(storedWallet, legacyCoins)
        commitWallet(next)
        if (storedWallet === undefined) {
          await storage.player.set(CASINO_WALLET_KEY, next)
        }
        setNotice(totalCasinoCoins(next) === 0
          ? '残高0枚です。GM受付で10枚受け取れます'
          : next.redeemable > 0
            ? `残高を読込・両替可能${next.redeemable}枚`
            : '旧残高を遊技用ボーナスとして移行しました')
      } catch (error) {
        if (!isStorageUnavailable(error)) {
          console.warn('World Storage initialization failed; using local preview wallet.', error)
        }
        setSource('local-preview')
        commitWallet(createCasinoWallet(STARTING_COINS))
        setNotice(localUser?.isGuest ? 'ゲスト: このセッションのみ保存' : 'ローカル確認用コイン')
      } finally {
        setReady(true)
      }
    }

    void initialize()
  }, [commitWallet, localUser, previewCoins, storage])

  useEffect(() => {
    if (!ready || !localUser || localUser.isGuest || source !== 'world-storage') return
    let active = true
    const register = async () => {
      try {
        const current = await storage.shared.get(CASINO_PLAYER_REGISTRY_KEY)
        if (!active) return
        const next = mergeCasinoPlayerRegistry(current, {
          id: localUser.id,
          name: localUser.displayName,
        })
        await storage.shared.set(CASINO_PLAYER_REGISTRY_KEY, next)
      } catch (error) {
        console.warn('Casino player registry update failed.', error)
      }
    }
    void register()
    const timer = window.setInterval(() => void register(), 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [localUser, ready, source, storage])

  const refreshRifBalance = useCallback(async (): Promise<number | null> => {
    if (!localUser || localUser.isGuest || previewCoins !== undefined) {
      setRifBalance(null)
      setRifReady(true)
      setExchangeNotice(previewCoins !== undefined
        ? 'ローカル確認ではRIF交換を実行しません'
        : 'RIF交換にはXRiftへのログインが必要です')
      return null
    }
    try {
      const next = await rifCurrency.getBalance(localUser.id)
      setRifBalance(next)
      setExchangeNotice('RIF残高を読み込みました')
      return next
    } catch (error) {
      console.warn('RIFCoin balance refresh failed.', error)
      setRifBalance(null)
      setExchangeNotice('RIF残高を取得できません。盤面の更新を押してください')
      return null
    } finally {
      setRifReady(true)
    }
  }, [localUser, previewCoins])

  useEffect(() => {
    if (!ready) return
    pendingExchangeRef.current = null
    setPendingExchangeAmount(null)
    setPendingExchangeDirection(null)
    setRifReady(false)
    void refreshRifBalance()

    if (!localUser || localUser.isGuest || previewCoins !== undefined) return
    let active = true
    const restorePending = async () => {
      try {
        const saved = await storage.player.get(EXCHANGE_PENDING_KEY)
        if (!active) return
        if (isPendingRifExchange(saved)) {
          pendingExchangeRef.current = saved
          setPendingExchangeAmount(saved.rifAmount)
          setPendingExchangeDirection(saved.direction)
          setExchangeNotice(saved.direction === 'RIF_TO_CASINO'
            ? `未完了の入金 ${saved.rifAmount} RIFがあります。同額で再試行してください`
            : `未完了の出金 ${saved.casinoCoinAmount}枚があります。同額で再試行してください`)
          return
        }

        const legacy = await storage.player.get(LEGACY_EXCHANGE_PENDING_KEY)
        if (!active || !isLegacyPendingRifExchange(legacy) || operationRef.current) return
        operationRef.current = true
        setBusy(true)
        setExchangeNotice(`旧レートの未完了交換 ${legacy.rifAmount} RIFを復旧しています…`)
        try {
          const result = await rifCurrency.pay({
            userId: localUser.id,
            amount: legacy.rifAmount,
            reason: 'casino_coin_exchange_in',
            clientTransactionId: legacy.clientTransactionId,
            metadata: {
              schemaVersion: 1,
              direction: 'RIF_TO_CASINO',
              rateVersion: legacy.rateVersion,
              rifUnits: 1,
              casinoCoinUnits: 1,
              rifAmount: legacy.rifAmount,
              casinoCoinAmount: legacy.casinoCoinAmount,
            },
          })
          const nextWallet = applyLegacyRifDeposit(walletRef.current, legacy.clientTransactionId, legacy.casinoCoinAmount)
          if (!nextWallet) throw new Error('Legacy exchange recovery was rejected by the wallet')
          await persistWallet(nextWallet)
          await storage.player.delete(LEGACY_EXCHANGE_PENDING_KEY)
          setRifBalance(result.balance)
          setNotice(`旧交換を遊技用ボーナスへ復旧 +${legacy.casinoCoinAmount}枚`)
          setExchangeNotice('旧1:1交換の復旧が完了しました。新規交換は1:50です')
        } finally {
          operationRef.current = false
          setBusy(false)
        }
      } catch (error) {
        console.warn('Pending RIF exchange restore failed.', error)
        setExchangeNotice('未完了交換の復旧に失敗しました。再入場後も同じIDで再試行します')
      }
    }
    void restorePending()
    return () => {
      active = false
    }
  }, [localUser, persistWallet, previewCoins, ready, refreshRifBalance, storage])

  const placeWager = useCallback(async (wagerId: string, amount: number, reason: string): Promise<number | null> => {
    if (!ready || operationRef.current) return null
    const nextWallet = placeCasinoWager(walletRef.current, wagerId, amount, serverClock.now())
    if (!nextWallet) {
      setNotice(`コインが${amount}枚必要です`)
      return null
    }
    operationRef.current = true
    setBusy(true)
    try {
      const next = await persistWallet(nextWallet)
      await recordLedgerEvent('wager', amount)
      setNotice(`${reason} −${amount}枚`)
      return next
    } catch (error) {
      console.error('Casino wager failed.', error)
      setNotice('BETの保存に失敗しました。もう一度お試しください')
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [persistWallet, ready, recordLedgerEvent, serverClock.now])

  const refundWager = useCallback(async (wagerId: string, reason: string): Promise<number | null> => {
    if (!ready || operationRef.current) return null
    const wager = walletRef.current.wagers[wagerId]
    const nextWallet = refundCasinoWager(walletRef.current, wagerId)
    if (!nextWallet) return null
    if (!wager) return totalCasinoCoins(walletRef.current)
    operationRef.current = true
    setBusy(true)
    try {
      const next = await persistWallet(nextWallet)
      await recordLedgerEvent('refund', wager.amount)
      setNotice(`${reason} +${wager.amount}枚`)
      return next
    } catch (error) {
      console.error('Casino wager refund failed.', error)
      setNotice('返却の保存に失敗しました。もう一度お試しください')
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [persistWallet, ready, recordLedgerEvent])

  const settleWager = useCallback(async (wagerId: string, totalReturn: number, reason: string): Promise<number | null> => {
    if (!ready || operationRef.current) return null
    if (walletRef.current.closedWagerIds.includes(wagerId)) return totalCasinoCoins(walletRef.current)
    const nextWallet = settleCasinoWager(walletRef.current, wagerId, totalReturn)
    if (!nextWallet) return null
    operationRef.current = true
    setBusy(true)
    try {
      const next = await persistWallet(nextWallet)
      if (totalReturn > 0) await recordLedgerEvent('payout', totalReturn)
      setNotice(totalReturn > 0 ? `${reason} +${totalReturn}枚` : `${reason}・払戻なし`)
      return next
    } catch (error) {
      console.error('Casino wager settlement failed.', error)
      setNotice('精算の保存に失敗しました。自動で再試行します')
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [persistWallet, ready, recordLedgerEvent])

  const claimRelief = useCallback(async (): Promise<number | null> => {
    if (!ready || operationRef.current) return null
    const usage = exchangeUsageForDay(walletRef.current, jstExchangeDay(serverClock.now()))
    const effectiveMinimumRif = usage.rifIn + usage.rifOut >= RIF_EXCHANGE_CONFIG.dailyLimitRif
      ? Number.POSITIVE_INFINITY
      : minimumExchangeRif
    if (!canClaimRelief(coinsRef.current, rifBalance, rifReady, effectiveMinimumRif)) {
      setNotice(rifReady && rifBalance !== null && rifBalance > 0
        ? '先にRIF交換所を利用できます'
        : '救済コインはゲームもRIF交換もできないときに受け取れます')
      return null
    }

    operationRef.current = true
    setBusy(true)
    try {
      const grant = receptionGrantFor(coinsRef.current, rifBalance, rifReady, effectiveMinimumRif)
      const nextWallet = applyBonusDelta(walletRef.current, grant)
      if (!nextWallet) return null
      const next = await persistWallet(nextWallet)
      await recordLedgerEvent('relief', grant)
      setNotice('GM受付で10枚受け取りました')
      return next
    } catch (error) {
      console.error('Relief coin claim failed.', error)
      setNotice('受付コインの受取に失敗しました')
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [persistWallet, ready, recordLedgerEvent, rifBalance, rifReady, serverClock.now])

  const convertRifToCasino = useCallback(async (rifAmount: number): Promise<number | null> => {
    const quote = quoteRifExchange(rifAmount)
    if (!quote) {
      setExchangeNotice(`交換額は${RIF_EXCHANGE_CONFIG.minimumRif}〜${RIF_EXCHANGE_CONFIG.maximumRif}の整数で指定してください`)
      return null
    }
    if (!ready || !rifReady || operationRef.current) return null
    if (!localUser || localUser.isGuest || source !== 'world-storage') {
      setExchangeNotice('RIF交換はログイン済みの本番ワールドで利用できます')
      return null
    }
    if (rifBalance === null) {
      setExchangeNotice('先にRIF残高を更新してください')
      return null
    }
    if (rifBalance < quote.rifAmount) {
      setExchangeNotice(`RIF残高が${quote.rifAmount - rifBalance}不足しています`)
      return null
    }

    const exchangeDay = jstExchangeDay(serverClock.now())
    const usage = exchangeUsageForDay(walletRef.current, exchangeDay)
    if (usage.rifIn + usage.rifOut + quote.rifAmount > RIF_EXCHANGE_CONFIG.dailyLimitRif) {
      setExchangeNotice(`本日の交換残りは${Math.max(0, RIF_EXCHANGE_CONFIG.dailyLimitRif - usage.rifIn - usage.rifOut)} RIFです`)
      return null
    }

    const savedPending = pendingExchangeRef.current
    if (savedPending && (savedPending.direction !== quote.direction || savedPending.rifAmount !== quote.rifAmount)) {
      setExchangeNotice('先に未完了の交換を同じ方向・金額で再試行してください')
      return null
    }

    operationRef.current = true
    setBusy(true)
    let pending = savedPending
    try {
      if (!pending) {
        pending = {
          ...quote,
          clientTransactionId: createExchangeTransactionId(localUser.id, quote.direction),
          stage: 'created',
          createdAt: new Date().toISOString(),
          exchangeDay,
        }
        await storage.player.set(EXCHANGE_PENDING_KEY, pending)
        pendingExchangeRef.current = pending
        setPendingExchangeAmount(pending.rifAmount)
        setPendingExchangeDirection(pending.direction)
      }

      setExchangeNotice(`${quote.rifAmount} RIFを決済しています…`)
      const result = await rifCurrency.pay({
        userId: localUser.id,
        amount: quote.rifAmount,
        reason: 'casino_coin_exchange_in',
        clientTransactionId: pending.clientTransactionId,
        metadata: {
          schemaVersion: 2,
          direction: 'RIF_TO_CASINO',
          rateVersion: quote.rateVersion,
          rifUnits: RIF_EXCHANGE_CONFIG.rifUnits,
          casinoCoinUnits: RIF_EXCHANGE_CONFIG.casinoCoinUnits,
          rifAmount: quote.rifAmount,
          casinoCoinAmount: quote.casinoCoinAmount,
        },
      })
      if (result.amount !== -quote.rifAmount) {
        throw new XRiftCurrencyError('INVALID_RESPONSE', 'RIFCoin amount mismatch', 200)
      }

      pending = {
        ...pending,
        stage: 'rif-paid',
        rifTransactionId: result.transactionId,
      }
      await storage.player.set(EXCHANGE_PENDING_KEY, pending)
      pendingExchangeRef.current = pending

      const nextWallet = applyRifDeposit(walletRef.current, {
        clientTransactionId: pending.clientTransactionId,
        rifAmount: quote.rifAmount,
        casinoCoinAmount: quote.casinoCoinAmount,
        day: pending.exchangeDay,
        dailyLimitRif: RIF_EXCHANGE_CONFIG.dailyLimitRif,
      })
      if (!nextWallet) throw new Error('Casino wallet rejected the approved RIF deposit')
      const next = await persistWallet(nextWallet)
      const receipt: RifExchangeReceipt = {
        ...quote,
        clientTransactionId: pending.clientTransactionId,
        rifTransactionId: result.transactionId,
        completedAt: new Date().toISOString(),
        exchangeDay: pending.exchangeDay,
        rifBalanceAfter: result.balance,
        casinoBalanceAfter: next,
      }
      await storage.player.set(EXCHANGE_LAST_RECEIPT_KEY, receipt)
      await storage.player.delete(EXCHANGE_PENDING_KEY)

      await recordLedgerEvent('rif-exchange', quote.casinoCoinAmount)
      setRifBalance(result.balance)
      pendingExchangeRef.current = null
      setPendingExchangeAmount(null)
      setPendingExchangeDirection(null)
      setNotice(`RIF交換 +${quote.casinoCoinAmount}枚`)
      setExchangeNotice(`${quote.rifAmount} RIFを${quote.casinoCoinAmount}枚へ交換しました`)

      void Promise.allSettled([
        storage.shared.increment(EXCHANGE_RIF_TOTAL_KEY, quote.rifAmount),
        storage.shared.increment(EXCHANGE_COIN_TOTAL_KEY, quote.casinoCoinAmount),
        storage.shared.increment(EXCHANGE_COUNT_KEY, 1),
      ]).then((results) => {
        if (results.some((resultItem) => resultItem.status === 'rejected')) {
          console.warn('Best-effort casino circulation counters were not fully updated.')
        }
      })
      return next
    } catch (error) {
      console.error('RIF to casino coin exchange failed.', error)
      if (error instanceof XRiftCurrencyError && error.balance !== undefined) {
        setRifBalance(error.balance)
      }
      if (error instanceof XRiftCurrencyError
        && (error.code === 'INSUFFICIENT_BALANCE' || error.code === 'WORLD_DISABLED')) {
        await storage.player.delete(EXCHANGE_PENDING_KEY).catch(() => undefined)
        pendingExchangeRef.current = null
        setPendingExchangeAmount(null)
        setPendingExchangeDirection(null)
      }
      setExchangeNotice(pending?.stage === 'rif-paid'
        ? 'RIF決済は完了しています。同じ金額でカジノコイン反映を再試行してください'
        : exchangeErrorMessage(error))
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [localUser, persistWallet, ready, recordLedgerEvent, rifBalance, rifReady, serverClock.now, source, storage])

  const convertCasinoToRif = useCallback(async (casinoCoinAmount: number): Promise<number | null> => {
    const quote = quoteCasinoWithdrawal(casinoCoinAmount)
    if (!quote) {
      setExchangeNotice('出金は50枚単位、1日最大250枚で指定してください')
      return null
    }
    if (!ready || !rifReady || operationRef.current) return null
    if (!localUser || localUser.isGuest || source !== 'world-storage') {
      setExchangeNotice('RIF出金はログイン済みの本番ワールドで利用できます')
      return null
    }
    const exchangeDay = jstExchangeDay(serverClock.now())
    const usage = exchangeUsageForDay(walletRef.current, exchangeDay)
    if (usage.rifIn + usage.rifOut + quote.rifAmount > RIF_EXCHANGE_CONFIG.dailyLimitRif) {
      setExchangeNotice(`本日の交換残りは${Math.max(0, RIF_EXCHANGE_CONFIG.dailyLimitRif - usage.rifIn - usage.rifOut)} RIFです`)
      return null
    }
    if (walletRef.current.redeemable < quote.casinoCoinAmount) {
      setExchangeNotice(`両替可能コインが${quote.casinoCoinAmount - walletRef.current.redeemable}枚不足しています`)
      return null
    }

    const savedPending = pendingExchangeRef.current
    if (savedPending && (savedPending.direction !== quote.direction || savedPending.casinoCoinAmount !== quote.casinoCoinAmount)) {
      setExchangeNotice('先に未完了の交換を同じ方向・金額で再試行してください')
      return null
    }

    operationRef.current = true
    setBusy(true)
    let pending = savedPending
    try {
      if (!pending) {
        pending = {
          ...quote,
          clientTransactionId: createExchangeTransactionId(localUser.id, quote.direction),
          stage: 'created',
          createdAt: new Date().toISOString(),
          exchangeDay,
        }
        await storage.player.set(EXCHANGE_PENDING_KEY, pending)
        pendingExchangeRef.current = pending
        setPendingExchangeAmount(pending.rifAmount)
        setPendingExchangeDirection(pending.direction)
      }

      if (pending.stage === 'created') {
        const nextWallet = applyRifWithdrawalDebit(walletRef.current, {
          clientTransactionId: pending.clientTransactionId,
          rifAmount: quote.rifAmount,
          casinoCoinAmount: quote.casinoCoinAmount,
          day: pending.exchangeDay,
          dailyLimitRif: RIF_EXCHANGE_CONFIG.dailyLimitRif,
        })
        if (!nextWallet) throw new Error('Casino wallet rejected the approved RIF withdrawal')
        await persistWallet(nextWallet)
        pending = { ...pending, stage: 'casino-debited' }
        await storage.player.set(EXCHANGE_PENDING_KEY, pending)
        pendingExchangeRef.current = pending
      }

      setExchangeNotice(`${quote.casinoCoinAmount}枚を${quote.rifAmount} RIFへ出金しています…`)
      const result = await rifCurrency.grant({
        userId: localUser.id,
        amount: quote.rifAmount,
        reason: 'casino_coin_exchange_out',
        clientTransactionId: pending.clientTransactionId,
        metadata: {
          schemaVersion: 2,
          direction: 'CASINO_TO_RIF',
          rateVersion: quote.rateVersion,
          rifUnits: RIF_EXCHANGE_CONFIG.rifUnits,
          casinoCoinUnits: RIF_EXCHANGE_CONFIG.casinoCoinUnits,
          rifAmount: quote.rifAmount,
          casinoCoinAmount: quote.casinoCoinAmount,
        },
      })
      if (result.amount !== quote.rifAmount) {
        throw new XRiftCurrencyError('INVALID_RESPONSE', 'RIFCoin amount mismatch', 200)
      }

      pending = { ...pending, stage: 'rif-granted', rifTransactionId: result.transactionId }
      await storage.player.set(EXCHANGE_PENDING_KEY, pending)
      const receipt: RifExchangeReceipt = {
        ...quote,
        clientTransactionId: pending.clientTransactionId,
        rifTransactionId: result.transactionId,
        completedAt: new Date().toISOString(),
        exchangeDay: pending.exchangeDay,
        rifBalanceAfter: result.balance,
        casinoBalanceAfter: totalCasinoCoins(walletRef.current),
      }
      await storage.player.set(EXCHANGE_LAST_RECEIPT_KEY, receipt)
      await storage.player.delete(EXCHANGE_PENDING_KEY)

      setRifBalance(result.balance)
      pendingExchangeRef.current = null
      setPendingExchangeAmount(null)
      setPendingExchangeDirection(null)
      setNotice(`RIF出金 −${quote.casinoCoinAmount}枚`)
      setExchangeNotice(`${quote.casinoCoinAmount}枚を${quote.rifAmount} RIFへ出金しました`)
      void Promise.allSettled([
        storage.shared.increment(EXCHANGE_RIF_OUT_TOTAL_KEY, quote.rifAmount),
        storage.shared.increment(EXCHANGE_COIN_REDEEMED_TOTAL_KEY, quote.casinoCoinAmount),
        storage.shared.increment(EXCHANGE_WITHDRAWAL_COUNT_KEY, 1),
      ]).then((results) => {
        if (results.some((item) => item.status === 'rejected')) console.warn('RIF withdrawal counters were only partially updated.')
      })
      return totalCasinoCoins(walletRef.current)
    } catch (error) {
      console.error('Casino coin to RIF exchange failed.', error)
      if (error instanceof XRiftCurrencyError && error.balance !== undefined) setRifBalance(error.balance)
      setExchangeNotice(pending?.stage === 'casino-debited' || pending?.stage === 'rif-granted'
        ? 'カジノコインは出金処理中です。同じ枚数で安全に再試行してください'
        : exchangeErrorMessage(error))
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [localUser, persistWallet, ready, rifReady, serverClock.now, source, storage])

  const currentUsage = exchangeUsageForDay(wallet, exchangeDay)

  const value = useMemo(
    () => ({
      coins,
      bonusCoins: wallet.bonus,
      redeemableCoins: wallet.redeemable,
      ready,
      busy,
      notice,
      source,
      rifBalance,
      rifReady,
      exchangeNotice,
      exchangeDay,
      pendingExchangeAmount,
      pendingExchangeDirection,
      dailyRifIn: currentUsage.rifIn,
      dailyRifOut: currentUsage.rifOut,
      placeWager,
      refundWager,
      settleWager,
      claimRelief,
      refreshRifBalance,
      convertRifToCasino,
      convertCasinoToRif,
    }),
    [
      busy,
      claimRelief,
      coins,
      convertCasinoToRif,
      convertRifToCasino,
      exchangeNotice,
      notice,
      pendingExchangeAmount,
      pendingExchangeDirection,
      placeWager,
      ready,
      refreshRifBalance,
      rifBalance,
      rifReady,
      refundWager,
      settleWager,
      source,
      wallet,
    ],
  )

  return <CasinoEconomyContext.Provider value={value}>{children}</CasinoEconomyContext.Provider>
}

export function useCasinoEconomy(): CasinoEconomyValue {
  const value = useContext(CasinoEconomyContext)
  if (!value) throw new Error('useCasinoEconomy must be used within CasinoEconomyProvider')
  return value
}

interface RosterEntry {
  id: string
  name: string
  coins: number | null
}

export function CasinoHud() {
  const { coins, bonusCoins, redeemableCoins, notice, ready, source } = useCasinoEconomy()
  const { localUser, remoteUsers } = useUsers()
  const { width: screenWidth, height: screenHeight } = useThree((state) => state.size)
  const storage = useWorldStorage()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [rosterOpen, setRosterOpen] = useState(false)
  const screen = getScreenProfile(screenWidth, screenHeight)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const entries = await Promise.all(remoteUsers.map(async (user: User) => {
        try {
          const [walletValue, legacyValue] = await Promise.all([
            storage.player.get(CASINO_WALLET_KEY, { userId: user.id }),
            storage.player.get(COIN_KEY, { userId: user.id }),
          ])
          const legacyCoins = typeof legacyValue === 'number' && Number.isFinite(legacyValue)
            ? Math.max(0, Math.floor(legacyValue))
            : 0
          const playerWallet = parseCasinoWallet(walletValue, legacyCoins)
          return {
            id: user.id,
            name: user.displayName,
            coins: walletValue !== undefined || typeof legacyValue === 'number'
              ? totalCasinoCoins(playerWallet)
              : null,
          }
        } catch {
          return { id: user.id, name: user.displayName, coins: null }
        }
      }))
      if (active) setRoster(entries)
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [remoteUsers, storage])

  const fontFamily = '"Noto Sans JP", "Yu Gothic UI", "Segoe UI", sans-serif'
  const frame = {
    border: '3px solid #69717d',
    borderRadius: 2,
    background: 'rgba(17,24,39,.94)',
    boxShadow: '0 6px 0 rgba(38,49,61,.55)',
  } as const

  return (
    <Html
      fullscreen
      calculatePosition={screenCenter}
      style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
    >
      <div style={{
        position: 'absolute',
        top: screen.narrow ? screen.topSafe + 48 : screen.topSafe,
        left: screen.sideSafe,
        color: '#fff7e6',
        width: screen.narrow
          ? Math.min(210, screenWidth - screen.sideSafe * 2)
          : screen.compact ? 210 : 224,
      }}>
        <div style={{ ...frame, padding: '9px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: '#f6c453', boxShadow: 'inset -5px -5px 0 #c78d24' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>コイン</div>
              <div style={{ color: '#f6c453', fontSize: 24, lineHeight: 1, fontWeight: 900 }}>
                {ready ? coins : '—'}<span style={{ color: '#fff7e6', fontSize: 12, marginLeft: 4 }}>枚</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {localUser?.displayName ?? 'ローカル確認'} ・ {source === 'world-storage' ? '保存済み' : 'このセッションのみ'}
          </div>
          <div style={{ marginTop: 3, fontSize: 10, color: '#fff1b8' }}>
            両替可能 {redeemableCoins} ／ 遊技用 {bonusCoins}
          </div>
        </div>

        <div style={{
          ...frame,
          marginTop: 8,
          padding: '7px 9px',
          fontSize: 11,
          color: '#fff1b8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {notice}
        </div>

        <button
          type="button"
          onClick={() => setRosterOpen((open) => !open)}
          style={{
            ...frame,
            pointerEvents: 'auto',
            marginTop: 8,
            width: '100%',
            padding: '7px 9px',
            color: '#fff7e6',
            textAlign: 'left',
            fontFamily,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          参加プレイヤー {roster.length + 1}人 {rosterOpen ? '▲' : '▼'}
        </button>
        {rosterOpen && (
          <div style={{ ...frame, marginTop: 4, padding: '8px 9px', fontSize: 11, maxHeight: '34vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span>{localUser?.displayName ?? 'あなた'}</span>
              <span style={{ color: '#f6c453' }}>{ready ? coins : '—'}枚</span>
            </div>
            {roster.map((player) => (
              <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 5 }}>
                <span>{player.name}</span>
                <span style={{ color: '#f6c453' }}>{player.coins ?? '—'}枚</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        ...frame,
        position: 'absolute',
        top: screen.topSafe,
        left: '50%',
        transform: 'translateX(-50%)',
        width: screen.narrow ? `calc(100vw - ${screen.sideSafe * 2}px)` : 'auto',
        boxSizing: 'border-box',
        padding: screen.narrow ? '8px 10px' : '8px 18px',
        color: '#fff7e6',
        fontSize: screen.narrow ? 11 : 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        <span style={{ color: '#c955a5' }}>{screen.narrow ? '← BJ' : '← カード酒場'}</span>
        <span style={{ color: '#f6c453', margin: screen.narrow ? '0 14px' : '0 20px' }}>
          {screen.narrow ? '受付' : '交換所'}
        </span>
        <span style={{ color: '#3dbfbc' }}>{screen.narrow ? 'MJ β →' : '無料麻雀β →'}</span>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 18,
        left: 18,
        display: screen.compact ? 'none' : 'flex',
        gap: 5,
        padding: 6,
        background: 'rgba(17,24,39,.94)',
        border: '3px solid #69717d',
      }}>
        {[
          ['◆', 'コイン'],
          ['?', '遊び方'],
          ['人', '参加者'],
          ['10', '交換所'],
        ].map(([icon, label], index) => (
          <div key={label} style={{
            width: 54,
            height: 48,
            border: index === 0 ? '3px solid #f6c453' : '2px solid #fff7e6',
            background: '#243247',
            display: 'grid',
            placeItems: 'center',
            color: index === 0 ? '#f6c453' : '#fff7e6',
            fontSize: 16,
            fontWeight: 900,
          }}>
            <span>{icon}</span>
            <span style={{ fontSize: 7, marginTop: -8 }}>{label}</span>
          </div>
        ))}
      </div>
    </Html>
  )
}
