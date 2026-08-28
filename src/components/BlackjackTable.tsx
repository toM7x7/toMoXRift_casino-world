import { Text } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import {
  useInstanceState,
  useServerClock,
  useTeleport,
  useUsers,
  useWorldStorage,
} from '@xrift/world-components'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  compareHands,
  createShuffledDeck,
  handValue,
  isBlackjack,
  playDealer,
  type BlackjackOutcome,
  type Card,
} from '../game/blackjack'
import { CASINO_BALANCE, blackjackTotalReturn } from '../game/casinoBalance'
import {
  BLACKJACK_SEATS,
  worldSeatPosition,
} from '../game/seatLayout'
import {
  connectedHumanCount,
  createEmptySeats,
  findSeatByUser,
  type HumanSeat,
  type SeatList,
} from '../game/tableSession'
import { releasePointerLock, useSeatLock } from '../ui/useSeatedMode'
import { useCasinoEconomy } from './CasinoEconomy'
import {
  CasinoButton,
  CasinoNpc,
  CasinoSeat,
  JapanesePanel,
} from './CasinoPrimitives'

const BET = CASINO_BALANCE.blackjack.roundBet
const SESSION_KEY = 'casino.blackjack.table.v14'

type BlackjackPhase = 'lobby' | 'playing' | 'settled'

interface BlackjackPlayer extends HumanSeat {
  seatIndex: number
  hand: Card[]
  stood: boolean
  outcome: BlackjackOutcome | null
  wager: number
  doubled: boolean
}

interface BlackjackEntry {
  amount: number
  paidAt: number
}

interface BlackjackTableState {
  phase: BlackjackPhase
  roundId: number
  roundStartedAt: number
  seats: SeatList
  entries: Record<string, BlackjackEntry>
  players: BlackjackPlayer[]
  deck: Card[]
  dealer: Card[]
  activeSeat: number | null
  message: string
}

const EMPTY_SESSION: BlackjackTableState = {
  phase: 'lobby',
  roundId: 0,
  roundStartedAt: 0,
  seats: createEmptySeats(),
  entries: {},
  players: [],
  deck: [],
  dealer: [],
  activeSeat: null,
  message: '着席は無料・2枚でラウンド参加',
}

function outcomeText(outcome: BlackjackOutcome | null): string {
  const labels: Record<BlackjackOutcome, string> = {
    blackjack: 'ブラックジャック',
    win: '勝ち',
    push: '引き分け',
    lose: '負け',
    bust: '21を超えました',
  }
  return outcome ? labels[outcome] : 'プレイ'
}

function settleTable(state: BlackjackTableState): BlackjackTableState {
  const dealerResult = playDealer(state.deck, state.dealer)
  return {
    ...state,
    phase: 'settled',
    deck: dealerResult.deck,
    dealer: dealerResult.hand,
    activeSeat: null,
    players: state.players.map((player) => ({
      ...player,
      stood: true,
      outcome: player.outcome ?? compareHands(player.hand, dealerResult.hand),
    })),
    message: `精算完了・ディーラー合計 ${handValue(dealerResult.hand)}`,
  }
}

function advanceTurn(
  state: BlackjackTableState,
  currentSeat: number,
): BlackjackTableState {
  const ordered = [...state.players].sort((a, b) => a.seatIndex - b.seatIndex)
  for (let offset = 1; offset <= 4; offset += 1) {
    const candidateSeat = (currentSeat + offset) % 4
    const candidate = ordered.find((player) => player.seatIndex === candidateSeat)
    if (candidate && !candidate.stood) {
      return {
        ...state,
        activeSeat: candidateSeat,
        message: `${candidate.displayName}の番です`,
      }
    }
  }
  return settleTable(state)
}

function CardShoe() {
  return (
    <group position={[-2.28, 1.12, -1.25]} rotation={[0, -0.28, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.42, 1.02]} />
        <meshStandardMaterial color="#172033" metalness={0.38} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.23, 0.12]}>
        <boxGeometry args={[0.56, 0.09, 0.7]} />
        <meshStandardMaterial color="#fff7e6" />
      </mesh>
    </group>
  )
}

function ChipStacks() {
  return (
    <group position={[2.18, 1.13, -1.12]}>
      {['#f6c453', '#52d6d3', '#d96ccb'].map((color, stack) => (
        <group key={color} position={[-0.38 + stack * 0.38, 0, 0]}>
          {Array.from({ length: 4 }, (_, index) => (
            <mesh key={index} position={[0, index * 0.075, 0]} castShadow>
              <boxGeometry args={[0.28, 0.07, 0.28]} />
              <meshStandardMaterial color={color} roughness={0.82} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Card3D({
  card,
  hidden = false,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  card: Card
  hidden?: boolean
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  const red = card.suit === '♥' || card.suit === '♦'
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.48, 0.7, 0.055]} />
        <meshStandardMaterial
          color={hidden ? '#493526' : '#fff7e6'}
          roughness={0.7}
        />
      </mesh>
      <Text
        position={[0, 0, 0.031]}
        fontSize={hidden ? 0.24 : 0.2}
        color={hidden ? '#f6c453' : red ? '#c2413b' : '#172033'}
        anchorX="center"
        anchorY="middle"
      >
        {hidden ? '◆' : `${card.rank}${card.suit}`}
      </Text>
    </group>
  )
}

function DealerCards({ state }: { state: BlackjackTableState }) {
  if (state.phase === 'lobby') return null
  const displayWidth = Math.max(1.75, state.dealer.length * 0.62 + 0.36)
  return (
    <group position={[0, 3.02, -2.7]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[displayWidth, 1.16, 0.12]} />
        <meshStandardMaterial color="#172033" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <boxGeometry args={[displayWidth - 0.1, 1.06, 0.035]} />
        <meshStandardMaterial color="#3f2a3d" emissive="#d96ccb" emissiveIntensity={0.08} roughness={0.72} />
      </mesh>
      <Text
        position={[0, 0.43, 0.095]}
        fontSize={0.14}
        color="#fff1b8"
        anchorX="center"
        anchorY="middle"
      >
        {state.phase === 'settled' ? `ディーラー手札・合計${handValue(state.dealer)}` : 'ディーラー手札・1枚は伏せ札'}
      </Text>
      {state.dealer.map((card, index) => (
        <Card3D
          key={`dealer-card-${index}`}
          card={card}
          hidden={state.phase === 'playing' && index === 1}
          position={[-((state.dealer.length - 1) * 0.26) + index * 0.52, -0.08, 0.105]}
          scale={0.76}
        />
      ))}
    </group>
  )
}

function LocalBlackjackControls({
  state,
  localSeat,
  busy,
  onStart,
  onEnter,
  onCancelEntry,
  onHit,
  onStand,
  onDouble,
  onNext,
  onLeave,
}: {
  state: BlackjackTableState
  localSeat: number
  busy: boolean
  onStart: () => void
  onEnter: () => void
  onCancelEntry: () => void
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onNext: () => void
  onLeave: () => void
}) {
  const seat = BLACKJACK_SEATS[localSeat]
  const localPlayer = state.players.find((player) => player.seatIndex === localSeat)
  const isHost = state.seats.findIndex(Boolean) === localSeat
  const localSeatUser = state.seats[localSeat]
  const localEntry = localSeatUser ? state.entries[localSeatUser.userId] : undefined
  const enteredCount = Object.keys(state.entries).length
  const roundStarterSeat = state.seats.findIndex((occupiedSeat) => (
    Boolean(occupiedSeat && state.entries[occupiedSeat.userId])
  ))
  const isRoundStarter = roundStarterSeat === localSeat
  const isMyTurn = state.phase === 'playing' && state.activeSeat === localSeat
  const cards = localPlayer?.hand ?? []

  return (
    <group position={seat.controlPosition} rotation={seat.controlRotation} scale={0.7}>
      <mesh position={[0, 0.01, -0.075]}>
        <boxGeometry args={[1.92, 0.66, 0.1]} />
        <meshStandardMaterial color="#493526" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.01, -0.018]}>
        <boxGeometry args={[1.82, 0.56, 0.08]} />
        <meshStandardMaterial color="#172033" roughness={0.82} />
      </mesh>
      <Text
        position={[0, 0.24, 0.03]}
        fontSize={0.085}
        maxWidth={1.65}
        color="#fff1b8"
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {state.phase === 'playing'
          ? state.activeSeat === localSeat
            ? `あなたの番・合計${localPlayer ? handValue(localPlayer.hand) : '—'}`
            : state.message
          : state.message}
      </Text>
      {cards.map((card, index) => (
        <Card3D
          key={`private-card-${index}`}
          card={card}
          scale={0.31}
          position={[-((cards.length - 1) * 0.1) + index * 0.2, 0.07, 0.035]}
        />
      ))}
      {state.phase === 'lobby' && !localEntry && (
        <CasinoButton
          id="blackjack-enter-round"
          label="ラウンド参加"
          detail={`${BET}枚を支払う`}
          position={[-0.16, -0.15, 0.035]}
          width={1.05}
          height={0.28}
          color="#c58b22"
          enabled={!busy}
          onPress={onEnter}
        />
      )}
      {state.phase === 'lobby' && localEntry && isRoundStarter && (
        <CasinoButton
          id="blackjack-start"
          label="ゲーム開始"
          detail={`${enteredCount}人参加・支払済`}
          position={[-0.28, -0.15, 0.035]}
          width={0.8}
          height={0.28}
          color="#c58b22"
          enabled={!busy && enteredCount > 0}
          onPress={onStart}
        />
      )}
      {state.phase === 'lobby' && localEntry && !isRoundStarter && (
        <JapanesePanel
          position={[-0.28, -0.15, 0.035]}
          width={0.8}
          height={0.28}
          title="参加確定"
          lines={[`${BET}枚支払済・開始待ち`]}
          accent={0xc58b22}
        />
      )}
      {state.phase === 'lobby' && localEntry && (
        <CasinoButton
          id={`blackjack-cancel-entry-${localSeat}`}
          label="取消"
          detail="2枚返却"
          position={[0.34, -0.16, 0.035]}
          width={0.35}
          height={0.28}
          labelFontSize={0.095}
          color="#69717d"
          enabled={!busy}
          onPress={onCancelEntry}
        />
      )}
      {state.phase === 'playing' && (
        <>
          <CasinoButton
            id={`blackjack-hit-${localSeat}`}
            label="引く"
            detail="もう1枚"
            position={[-0.57, -0.16, 0.035]}
            width={0.36}
            height={0.28}
            color="#c955a5"
            enabled={isMyTurn && !busy}
            onPress={onHit}
          />
          <CasinoButton
            id={`blackjack-stand-${localSeat}`}
            label="止める"
            detail="この手で勝負"
            position={[-0.17, -0.16, 0.035]}
            width={0.36}
            height={0.28}
            color="#c58b22"
            enabled={isMyTurn && !busy}
            onPress={onStand}
          />
          <CasinoButton
            id={`blackjack-double-${localSeat}`}
            label="倍掛け"
            detail="1枚引いて止める"
            position={[0.23, -0.16, 0.035]}
            width={0.36}
            height={0.28}
            labelFontSize={0.09}
            color="#5378c8"
            enabled={isMyTurn && cards.length === 2 && !localPlayer?.doubled && !busy}
            onPress={onDouble}
          />
        </>
      )}
      {state.phase === 'settled' && isHost && (
        <CasinoButton
          id="blackjack-next"
          label="次のゲーム"
          detail={outcomeText(localPlayer?.outcome ?? null)}
          position={[-0.12, -0.16, 0.035]}
          width={1.0}
          height={0.27}
          color="#c58b22"
          enabled={!busy}
          onPress={onNext}
        />
      )}
      <CasinoButton
        id={`blackjack-leave-${localSeat}`}
        label="離席する"
        position={[0.7, -0.16, 0.035]}
        width={0.38}
        height={0.28}
        labelFontSize={0.105}
        color="#9b3a45"
        enabled
        onPress={onLeave}
      />
    </group>
  )
}

export function BlackjackTable({
  position = [0, 0, 0],
  autoStart = false,
}: {
  position?: [number, number, number]
  autoStart?: boolean
}) {
  const { coins, ready, busy, transact } = useCasinoEconomy()
  const { localUser, remoteUsers } = useUsers()
  const clock = useServerClock({ require: 'motion' })
  const storage = useWorldStorage()
  const { teleport } = useTeleport()
  const [state, setState] = useInstanceState<BlackjackTableState>(SESSION_KEY, EMPTY_SESSION)
  const payoutRoundRef = useRef(new Set<string>())
  const payoutInFlightRef = useRef(new Set<string>())
  const autoStartedRef = useRef(false)
  const leavingRef = useRef(false)
  const entryInFlightRef = useRef(false)
  const localUserId = localUser?.id ?? 'local-preview-user'
  const localName = localUser?.displayName ?? 'あなた'
  const localSeat = findSeatByUser(state.seats, localUserId)
  const seated = localSeat >= 0
  const targetSeat = useMemo(
    () => seated ? worldSeatPosition(position, BLACKJACK_SEATS[localSeat]) : null,
    [localSeat, position, seated],
  )
  const targetYaw = seated ? BLACKJACK_SEATS[localSeat].yaw : 0
  const { releaseSeatLock } = useSeatLock(seated, targetSeat, targetYaw)

  const sitCamera = useCallback((seatIndex: number) => {
    const seat = BLACKJACK_SEATS[seatIndex]
    leavingRef.current = false
    releasePointerLock()
    teleport({ position: worldSeatPosition(position, seat), yaw: seat.yaw })
  }, [position, teleport])

  const joinTable = useCallback(async (seatIndex: number) => {
    const existingSeat = findSeatByUser(state.seats, localUserId)
    if (existingSeat >= 0) {
      sitCamera(existingSeat)
      return
    }
    if (
      state.phase !== 'lobby'
      || state.seats[seatIndex] !== null
    ) return
    setState((current) => {
      if (current.phase !== 'lobby' || current.seats[seatIndex] !== null) return current
      const seats = [...current.seats]
      seats[seatIndex] = { userId: localUserId, displayName: localName }
      return {
        ...current,
        seats,
        message: `${localName}さんが無料着席・参加ボタンを押してください`,
      }
    })
    sitCamera(seatIndex)
  }, [localName, localUserId, setState, sitCamera, state.phase, state.seats])

  const enterRound = useCallback(async () => {
    if (
      localSeat < 0
      || state.phase !== 'lobby'
      || state.entries[localUserId]
      || coins < BET
      || entryInFlightRef.current
    ) return
    entryInFlightRef.current = true
    try {
      const paid = await transact(-BET, 'ブラックジャック・ラウンド参加')
      if (paid === null) return
      setState((current) => {
        if (
          current.phase !== 'lobby'
          || findSeatByUser(current.seats, localUserId) < 0
          || current.entries[localUserId]
        ) return current
        return {
          ...current,
          entries: {
            ...current.entries,
            [localUserId]: { amount: BET, paidAt: clock.now() },
          },
          message: `${localName}さん参加確定・${BET}枚支払済`,
        }
      })
    } finally {
      entryInFlightRef.current = false
    }
  }, [clock.now, coins, localName, localSeat, localUserId, setState, state.entries, state.phase, transact])

  const cancelEntry = useCallback(async () => {
    if (
      localSeat < 0
      || state.phase !== 'lobby'
      || !state.entries[localUserId]
      || entryInFlightRef.current
    ) return
    entryInFlightRef.current = true
    try {
      setState((current) => {
        if (current.phase !== 'lobby' || !current.entries[localUserId]) return current
        const entries = { ...current.entries }
        delete entries[localUserId]
        return { ...current, entries, message: `${localName}さん参加取消・${BET}枚返却` }
      })
      await transact(BET, 'ブラックジャック・開始前取消')
    } finally {
      entryInFlightRef.current = false
    }
  }, [localName, localSeat, localUserId, setState, state.entries, state.phase, transact])

  const leaveTable = useCallback(async () => {
    if (localSeat < 0 || leavingRef.current) return
    leavingRef.current = true
    releaseSeatLock()
    const shouldRefund = state.phase === 'lobby' && Boolean(state.entries[localUserId])
    setState((current) => {
      const seats = [...current.seats]
      seats[localSeat] = null
      const players = current.players.map((player) => (
        player.seatIndex === localSeat ? { ...player, stood: true } : player
      ))
      const entries = { ...current.entries }
      delete entries[localUserId]
      if (connectedHumanCount(seats) === 0) {
        return { ...EMPTY_SESSION, roundId: current.roundId }
      }
      if (current.phase === 'playing' && current.activeSeat === localSeat) {
        return advanceTurn({ ...current, seats, entries, players }, localSeat)
      }
      return { ...current, seats, entries, players, message: `${localName}さんが離席しました` }
    })
    if (shouldRefund) await transact(BET, '開始前ラウンド参加返却')
    teleport({ position: [position[0], position[1], position[2] + 4.35], yaw: 0 })
  }, [localName, localSeat, localUserId, position, releaseSeatLock, setState, state.entries, state.phase, teleport, transact])

  useEffect(() => {
    if (seated) return
    leavingRef.current = false
  }, [seated])

  useEffect(() => {
    if (!seated || typeof window === 'undefined') return
    const handleLeaveShortcut = (event: KeyboardEvent) => {
      if (event.code !== 'KeyX' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      void leaveTable()
    }
    window.addEventListener('keydown', handleLeaveShortcut, true)
    return () => window.removeEventListener('keydown', handleLeaveShortcut, true)
  }, [leaveTable, seated])

  const startRound = useCallback(() => {
    if (localSeat < 0 || state.phase !== 'lobby') return
    const starterSeat = state.seats.findIndex((seat) => (
      Boolean(seat && state.entries[seat.userId])
    ))
    if (starterSeat !== localSeat) return
    setState((current) => {
      const currentStarterSeat = current.seats.findIndex((seat) => (
        Boolean(seat && current.entries[seat.userId])
      ))
      if (currentStarterSeat !== localSeat) return current
      const seatedPlayers = current.seats
        .map((seat, seatIndex) => seat ? { ...seat, seatIndex } : null)
        .filter((seat): seat is HumanSeat & { seatIndex: number } => seat !== null)
        .filter((seat) => Boolean(current.entries[seat.userId]))
      if (seatedPlayers.length === 0) return current
      const deck = createShuffledDeck()
      const players: BlackjackPlayer[] = seatedPlayers.map((seat) => ({
        ...seat,
        hand: [],
        stood: false,
        outcome: null,
        wager: current.entries[seat.userId]?.amount ?? BET,
        doubled: false,
      }))
      const dealer: Card[] = []
      for (let deal = 0; deal < 2; deal += 1) {
        players.forEach((player) => {
          const card = deck.pop()
          if (card) player.hand.push(card)
        })
        const dealerCard = deck.pop()
        if (dealerCard) dealer.push(dealerCard)
      }
      players.forEach((player) => {
        if (isBlackjack(player.hand)) player.stood = true
      })
      const firstActive = players.find((player) => !player.stood)?.seatIndex ?? null
      const next: BlackjackTableState = {
        ...current,
        phase: 'playing',
        roundId: current.roundId + 1,
        roundStartedAt: clock.now(),
        players,
        deck,
        dealer,
        activeSeat: firstActive,
        message: firstActive === null
          ? '全員BLACKJACK・ディーラー判定'
          : `${players.find((player) => player.seatIndex === firstActive)?.displayName}の番です`,
      }
      return firstActive === null ? settleTable(next) : next
    })
  }, [clock.now, localSeat, setState, state.entries, state.phase, state.seats])

  const hit = useCallback(() => {
    if (state.phase !== 'playing' || state.activeSeat !== localSeat) return
    setState((current) => {
      if (current.phase !== 'playing' || current.activeSeat !== localSeat) return current
      const deck = [...current.deck]
      const players = current.players.map((player) => ({ ...player, hand: [...player.hand] }))
      const player = players.find((candidate) => candidate.seatIndex === localSeat)
      const card = deck.pop()
      if (!player || !card) return current
      player.hand.push(card)
      if (handValue(player.hand) > 21) {
        player.stood = true
        player.outcome = 'bust'
        return advanceTurn({ ...current, deck, players }, localSeat)
      }
      return {
        ...current,
        deck,
        players,
        message: `${player.displayName}が1枚引く・現在${handValue(player.hand)}`,
      }
    })
  }, [localSeat, setState, state.activeSeat, state.phase])

  const stand = useCallback(() => {
    if (state.phase !== 'playing' || state.activeSeat !== localSeat) return
    setState((current) => {
      if (current.phase !== 'playing' || current.activeSeat !== localSeat) return current
      const players = current.players.map((player) => (
        player.seatIndex === localSeat ? { ...player, stood: true } : player
      ))
      return advanceTurn({ ...current, players }, localSeat)
    })
  }, [localSeat, setState, state.activeSeat, state.phase])

  const doubleDown = useCallback(async () => {
    const localPlayer = state.players.find((player) => player.seatIndex === localSeat)
    if (
      state.phase !== 'playing'
      || state.activeSeat !== localSeat
      || !localPlayer
      || localPlayer.hand.length !== 2
      || localPlayer.doubled
      || coins < localPlayer.wager
      || entryInFlightRef.current
    ) return
    entryInFlightRef.current = true
    try {
      const paid = await transact(-localPlayer.wager, 'ブラックジャック・ダブルダウン')
      if (paid === null) return
      setState((current) => {
        if (current.phase !== 'playing' || current.activeSeat !== localSeat) return current
        const deck = [...current.deck]
        const players = current.players.map((player) => ({ ...player, hand: [...player.hand] }))
        const player = players.find((candidate) => candidate.seatIndex === localSeat)
        const card = deck.pop()
        if (!player || !card || player.hand.length !== 2 || player.doubled) return current
        player.hand.push(card)
        player.wager *= 2
        player.doubled = true
        player.stood = true
        if (handValue(player.hand) > 21) player.outcome = 'bust'
        return advanceTurn({ ...current, deck, players }, localSeat)
      })
    } finally {
      entryInFlightRef.current = false
    }
  }, [coins, localSeat, setState, state.activeSeat, state.phase, state.players, transact])

  const prepareNext = useCallback(() => {
    if (localSeat < 0 || state.phase !== 'settled') return
    if (state.seats.findIndex(Boolean) !== localSeat) return
    setState((current) => ({
      ...EMPTY_SESSION,
      roundId: current.roundId,
      seats: current.seats,
      message: '着席を維持しました。次のラウンド参加は2枚です',
    }))
  }, [localSeat, setState, state.phase, state.seats])

  const localRoundPlayer = useMemo(
    () => state.players.find((player) => player.userId === localUserId),
    [localUserId, state.players],
  )

  useEffect(() => {
    if (state.phase !== 'settled' || !localRoundPlayer || state.roundStartedAt <= 0) return
    const token = `blackjack:${state.roundId}:${state.roundStartedAt}`
    if (payoutRoundRef.current.has(token) || payoutInFlightRef.current.has(token)) return
    payoutInFlightRef.current.add(token)
    const settle = async () => {
      const markerKey = 'casino.blackjack.settled.v3'
      try {
        try {
          const savedToken = await storage.player.get(markerKey)
          if (savedToken === token) {
            payoutRoundRef.current.add(token)
            return
          }
          await storage.player.set(markerKey, token)
        } catch {
          // Local preview and guests use the in-memory marker.
        }
        const natural = localRoundPlayer.outcome === 'blackjack'
        const normalizedOutcome = localRoundPlayer.outcome === 'blackjack'
          ? 'win'
          : localRoundPlayer.outcome === 'bust'
            ? 'lose'
            : localRoundPlayer.outcome
        const payout = normalizedOutcome
          ? blackjackTotalReturn({
            wager: localRoundPlayer.wager,
            outcome: normalizedOutcome,
            natural,
          })
          : 0
        if (payout > 0) {
          const next = await transact(
            payout,
            `ブラックジャック配当・${outcomeText(localRoundPlayer.outcome)}`,
          )
          if (next === null) {
            await storage.player.delete(markerKey).catch(() => undefined)
            return
          }
        }
        payoutRoundRef.current.add(token)
      } finally {
        payoutInFlightRef.current.delete(token)
      }
    }
    void settle()
  }, [localRoundPlayer, state.phase, state.roundId, state.roundStartedAt, storage, transact])

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !ready || busy) return
    if (!seated) {
      autoStartedRef.current = true
      void joinTable(0)
    }
  }, [autoStart, busy, joinTable, ready, seated])

  useEffect(() => {
    if (!autoStart || !seated || state.phase !== 'lobby') return
    if (!state.entries[localUserId]) {
      void enterRound()
      return
    }
    const timer = window.setTimeout(startRound, 160)
    return () => window.clearTimeout(timer)
  }, [autoStart, enterRound, localUserId, seated, startRound, state.entries, state.phase])

  useEffect(() => {
    const currentHostSeat = state.seats.findIndex(Boolean)
    if (currentHostSeat < 0 || currentHostSeat !== localSeat) return
    const connectedIds = new Set([localUserId, ...remoteUsers.map((user) => user.id)])
    const timer = window.setTimeout(() => {
      setState((current) => {
        const departedSeats = current.seats
          .map((seat, seatIndex) => seat && !connectedIds.has(seat.userId) ? seatIndex : -1)
          .filter((seatIndex) => seatIndex >= 0)
        if (departedSeats.length === 0) return current
        const seats = current.seats.map((seat, seatIndex) => (
          departedSeats.includes(seatIndex) ? null : seat
        ))
        if (connectedHumanCount(seats) === 0) {
          return { ...EMPTY_SESSION, roundId: current.roundId }
        }
        const players = current.players.map((player) => (
          departedSeats.includes(player.seatIndex) ? { ...player, stood: true } : player
        ))
        const entries = { ...current.entries }
        departedSeats.forEach((seatIndex) => {
          const departed = current.seats[seatIndex]
          if (departed) delete entries[departed.userId]
        })
        if (
          current.phase === 'playing'
          && current.activeSeat !== null
          && departedSeats.includes(current.activeSeat)
        ) {
          return advanceTurn({ ...current, seats, entries, players }, current.activeSeat)
        }
        return { ...current, seats, entries, players, message: '退出プレイヤーの席を解放' }
      })
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [localSeat, localUserId, remoteUsers, setState, state.seats])

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.8}>
        <mesh position={[0, 0.82, 0]} scale={[1, 1, 0.63]} castShadow receiveShadow>
          <cylinderGeometry args={[2.7, 2.7, 0.24, 8]} />
          <meshStandardMaterial color="#493526" roughness={0.86} flatShading />
        </mesh>
        <mesh position={[0, 0.41, 0]} castShadow>
          <boxGeometry args={[1.6, 0.82, 1.2]} />
          <meshStandardMaterial color="#805a3b" roughness={0.88} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 0.955, 0]} scale={[1, 1, 0.61]}>
        <cylinderGeometry args={[2.52, 2.52, 0.035, 8]} />
        <meshStandardMaterial color="#c955a5" roughness={0.82} flatShading />
      </mesh>

      <CasinoNpc
        position={[0, 0, -2.85]}
        color="#7c3aed"
        name="ディーラー・ジャック"
        role="公式ディーラー"
        accent={0xd96ccb}
        animation={
          state.phase === 'playing'
            ? '08_Action_One-Handed_Low'
            : state.phase === 'settled'
              ? '18_Success_Celebration'
              : '02_Idle_2'
        }
        repeatAnimation={state.phase === 'lobby'}
        animationKey={`${state.roundId}-${state.message}`}
        showLabel={false}
      />
      <CardShoe />
      <ChipStacks />
      <DealerCards state={state} />
      <JapanesePanel
        position={[3.75, 2.25, -1.65]}
        rotation={[0, -0.28, 0]}
        width={2.9}
        height={1.85}
        title="BJ 基本ルール"
        lines={[
          '着席無料・参加2枚',
          'ディーラーは17以上を目指す',
          '合計16以下では必ず1枚引く',
          '通常2倍・BJ2.5倍・倍掛け可',
        ]}
        accent={0xd96ccb}
      />

      {BLACKJACK_SEATS.map((seat, index) => (
        <CasinoSeat
          key={`blackjack-chair-${index}`}
          id={`blackjack-chair-${index}`}
          position={seat.position}
          enabled={
            state.phase === 'lobby'
            && !seated
            && state.seats[index] === null
            && ready
            && !busy
          }
          occupied={state.seats[index] !== null}
          onSit={() => void joinTable(index)}
        />
      ))}

      {seated && (
        <LocalBlackjackControls
          state={state}
          localSeat={localSeat}
          busy={busy}
          onStart={startRound}
          onEnter={() => void enterRound()}
          onCancelEntry={() => void cancelEntry()}
          onHit={hit}
          onStand={stand}
          onDouble={() => void doubleDown()}
          onNext={prepareNext}
          onLeave={() => void leaveTable()}
        />
      )}
    </group>
  )
}
