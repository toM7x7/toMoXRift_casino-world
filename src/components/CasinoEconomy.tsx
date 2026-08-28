import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import {
  useUsers,
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
  classifyCasinoTransaction,
  mergeCasinoPlayerRegistry,
  parseCasinoPlayerStats,
  type CasinoLedgerCategory,
} from '../game/casinoLedger'
import {
  createExchangeTransactionId,
  EXCHANGE_COIN_TOTAL_KEY,
  EXCHANGE_COUNT_KEY,
  EXCHANGE_LAST_RECEIPT_KEY,
  EXCHANGE_PENDING_KEY,
  EXCHANGE_RIF_TOTAL_KEY,
  isPendingRifExchange,
  minimumConvertibleRifAmount,
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
  ready: boolean
  busy: boolean
  notice: string
  source: EconomySource
  rifBalance: number | null
  rifReady: boolean
  exchangeNotice: string
  pendingExchangeAmount: number | null
  transact: (delta: number, reason: string) => Promise<number | null>
  claimRelief: () => Promise<number | null>
  refreshRifBalance: () => Promise<number | null>
  convertRifToCasino: (rifAmount: number) => Promise<number | null>
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
  const [coins, setCoins] = useState(STARTING_COINS)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('コイン情報を読み込み中')
  const [source, setSource] = useState<EconomySource>('world-storage')
  const [rifBalance, setRifBalance] = useState<number | null>(null)
  const [rifReady, setRifReady] = useState(false)
  const [exchangeNotice, setExchangeNotice] = useState('RIF残高を確認中')
  const [pendingExchangeAmount, setPendingExchangeAmount] = useState<number | null>(null)
  const coinsRef = useRef(STARTING_COINS)
  const initializedRef = useRef(false)
  const operationRef = useRef(false)
  const pendingExchangeRef = useRef<PendingRifExchange | null>(null)

  const commitCoins = useCallback((next: number) => {
    coinsRef.current = next
    setCoins(next)
  }, [])

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
    if (initializedRef.current) return
    initializedRef.current = true

    const initialize = async () => {
      if (previewCoins !== undefined) {
        setSource('local-preview')
        commitCoins(Math.max(0, Math.floor(previewCoins)))
        setNotice('ローカル遊技レビュー用コイン')
        setReady(true)
        return
      }
      try {
        const stored = await storage.player.get(COIN_KEY)
        if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) {
          const savedCoins = Math.floor(stored)
          commitCoins(savedCoins)
          setNotice(savedCoins === 0
            ? '残高0枚です。GM受付で10枚受け取れます'
            : 'コイン残高を読み込みました')
          return
        }

        // A missing wallet begins at zero. The player deliberately receives
        // the first ten coins from the animated GM reception, just like later
        // relief claims, instead of being granted coins on world load.
        commitCoins(0)
        setNotice('初回コインはGM受付で10枚受け取れます')
      } catch (error) {
        if (!isStorageUnavailable(error)) {
          console.warn('World Storage initialization failed; using local preview wallet.', error)
        }
        setSource('local-preview')
        commitCoins(STARTING_COINS)
        setNotice(localUser?.isGuest ? 'ゲスト: このセッションのみ保存' : 'ローカル確認用コイン')
      } finally {
        setReady(true)
      }
    }

    void initialize()
  }, [commitCoins, localUser?.isGuest, previewCoins, storage])

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
    pendingExchangeRef.current = null
    setPendingExchangeAmount(null)
    setRifReady(false)
    void refreshRifBalance()

    if (!localUser || localUser.isGuest || previewCoins !== undefined) return
    let active = true
    const restorePending = async () => {
      try {
        const saved = await storage.player.get(EXCHANGE_PENDING_KEY)
        if (!active || !isPendingRifExchange(saved)) return
        pendingExchangeRef.current = saved
        setPendingExchangeAmount(saved.rifAmount)
        setExchangeNotice(saved.stage === 'rif-paid'
          ? `RIF決済済みです。${saved.rifAmount} RIFで反映を再試行してください`
          : `未完了の${saved.rifAmount} RIF交換があります。同額で再試行してください`)
      } catch (error) {
        console.warn('Pending RIF exchange restore failed.', error)
      }
    }
    void restorePending()
    return () => {
      active = false
    }
  }, [localUser, previewCoins, refreshRifBalance, storage])

  const transact = useCallback(async (delta: number, reason: string): Promise<number | null> => {
    if (!ready || operationRef.current || delta === 0) return null
    if (delta < 0 && coinsRef.current < Math.abs(delta)) {
      setNotice(`コインが${Math.abs(delta)}枚必要です`)
      return null
    }

    operationRef.current = true
    setBusy(true)
    try {
      let next: number
      if (source === 'local-preview') {
        next = coinsRef.current + delta
      } else {
        try {
          next = await storage.player.increment(COIN_KEY, delta)
        } catch (error) {
          if (!isStorageUnavailable(error)) throw error
          setSource('local-preview')
          next = coinsRef.current + delta
        }
      }

      commitCoins(next)
      const category = classifyCasinoTransaction(delta, reason)
      if (category) await recordLedgerEvent(category, Math.abs(delta))
      setNotice(next === 0
        ? `${reason}・残高0枚です。GM受付へお越しください`
        : `${reason} ${delta > 0 ? '+' : ''}${delta}枚`)
      return next
    } catch (error) {
      console.error('Coin transaction failed.', error)
      setNotice('コイン更新に失敗しました。もう一度お試しください')
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [commitCoins, ready, recordLedgerEvent, source, storage])

  const claimRelief = useCallback(async (): Promise<number | null> => {
    if (!ready || operationRef.current) return null
    if (!canClaimRelief(coinsRef.current, rifBalance, rifReady, minimumExchangeRif)) {
      setNotice(rifReady && rifBalance !== null && rifBalance > 0
        ? '先にRIF交換所を利用できます'
        : '救済コインはゲームもRIF交換もできないときに受け取れます')
      return null
    }

    operationRef.current = true
    setBusy(true)
    try {
      const grant = receptionGrantFor(coinsRef.current, rifBalance, rifReady, minimumExchangeRif)
      let next: number
      if (source === 'local-preview') {
        next = coinsRef.current + grant
      } else {
        try {
          const saved = await storage.player.get(COIN_KEY)
          if (typeof saved === 'number' && saved !== 0) {
            next = Math.max(0, Math.floor(saved))
            commitCoins(next)
            setNotice('保存済みの残高を読み直しました')
            return next
          }
          next = await storage.player.increment(COIN_KEY, grant)
        } catch (error) {
          if (!isStorageUnavailable(error)) throw error
          setSource('local-preview')
          next = coinsRef.current + grant
        }
      }

      commitCoins(next)
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
  }, [commitCoins, ready, recordLedgerEvent, rifBalance, rifReady, source, storage])

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

    const savedPending = pendingExchangeRef.current
    if (savedPending && savedPending.rifAmount !== quote.rifAmount) {
      setExchangeNotice(`未完了の${savedPending.rifAmount} RIF交換を同じ金額で再試行してください`)
      return null
    }

    operationRef.current = true
    setBusy(true)
    let pending = savedPending
    try {
      if (!pending) {
        pending = {
          ...quote,
          clientTransactionId: createExchangeTransactionId(localUser.id),
          stage: 'created',
          createdAt: new Date().toISOString(),
        }
        await storage.player.set(EXCHANGE_PENDING_KEY, pending)
        pendingExchangeRef.current = pending
        setPendingExchangeAmount(pending.rifAmount)
      }

      setExchangeNotice(`${quote.rifAmount} RIFを決済しています…`)
      const result = await rifCurrency.pay({
        userId: localUser.id,
        amount: quote.rifAmount,
        reason: 'casino_coin_exchange_in',
        clientTransactionId: pending.clientTransactionId,
        metadata: {
          schemaVersion: 1,
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

      const previousReceipt = await storage.player.get(EXCHANGE_LAST_RECEIPT_KEY)
      if (typeof previousReceipt === 'object'
        && previousReceipt !== null
        && 'rifTransactionId' in previousReceipt
        && previousReceipt.rifTransactionId === result.transactionId) {
        setRifBalance(result.balance)
        await storage.player.delete(EXCHANGE_PENDING_KEY)
        pendingExchangeRef.current = null
        setPendingExchangeAmount(null)
        setExchangeNotice('この交換はすでにカジノコインへ反映済みです')
        return coinsRef.current
      }

      const next = await storage.player.increment(COIN_KEY, quote.casinoCoinAmount)
      const receipt: RifExchangeReceipt = {
        ...quote,
        clientTransactionId: pending.clientTransactionId,
        rifTransactionId: result.transactionId,
        completedAt: new Date().toISOString(),
        rifBalanceAfter: result.balance,
        casinoBalanceAfter: next,
      }
      await storage.player.set(EXCHANGE_LAST_RECEIPT_KEY, receipt)
      await storage.player.delete(EXCHANGE_PENDING_KEY)

      commitCoins(next)
      await recordLedgerEvent('rif-exchange', quote.casinoCoinAmount)
      setRifBalance(result.balance)
      pendingExchangeRef.current = null
      setPendingExchangeAmount(null)
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
      }
      setExchangeNotice(pending?.stage === 'rif-paid'
        ? 'RIF決済は完了しています。同じ金額でカジノコイン反映を再試行してください'
        : exchangeErrorMessage(error))
      return null
    } finally {
      operationRef.current = false
      setBusy(false)
    }
  }, [commitCoins, localUser, ready, recordLedgerEvent, rifBalance, rifReady, source, storage])

  const value = useMemo(
    () => ({
      coins,
      ready,
      busy,
      notice,
      source,
      rifBalance,
      rifReady,
      exchangeNotice,
      pendingExchangeAmount,
      transact,
      claimRelief,
      refreshRifBalance,
      convertRifToCasino,
    }),
    [
      busy,
      claimRelief,
      coins,
      convertRifToCasino,
      exchangeNotice,
      notice,
      pendingExchangeAmount,
      ready,
      refreshRifBalance,
      rifBalance,
      rifReady,
      source,
      transact,
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
  const { coins, notice, ready, source } = useCasinoEconomy()
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
          const value = await storage.player.get(COIN_KEY, { userId: user.id })
          return {
            id: user.id,
            name: user.displayName,
            coins: typeof value === 'number' ? value : null,
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
        <span style={{ color: '#3dbfbc' }}>{screen.narrow ? 'MJ →' : '牌工房 →'}</span>
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
