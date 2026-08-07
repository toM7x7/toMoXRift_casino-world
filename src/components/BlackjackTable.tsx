import { Text } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import {
  useInstanceState,
  useTeleport,
  useUsers,
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

const BET = 2
const SESSION_KEY = 'casino.blackjack.table.v13'

type BlackjackPhase = 'lobby' | 'playing' | 'settled'

interface BlackjackPlayer extends HumanSeat {
  seatIndex: number
  hand: Card[]
  stood: boolean
  outcome: BlackjackOutcome | null
}

interface BlackjackTableState {
  phase: BlackjackPhase
  roundId: number
  seats: SeatList
  players: BlackjackPlayer[]
  deck: Card[]
  dealer: Card[]
  activeSeat: number | null
  message: string
}

const EMPTY_SESSION: BlackjackTableState = {
  phase: 'lobby',
  roundId: 0,
  seats: createEmptySeats(),
  players: [],
  deck: [],
  dealer: [],
  activeSeat: null,
  message: '椅子を選んでENTRYしてください',
}

function payoutFor(outcome: BlackjackOutcome | null): number {
  if (outcome === 'blackjack') return 5
  if (outcome === 'win') return 4
  if (outcome === 'push') return 2
  return 0
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
    message: `精算完了・GM ${handValue(dealerResult.hand)}`,
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
  return (
    <group>
      {state.dealer.map((card, index) => (
        <Card3D
          key={`dealer-card-${index}`}
          card={card}
          hidden={state.phase === 'playing' && index === 1}
          position={[-0.28 + index * 0.56, 1.035, -0.32]}
          rotation={[-Math.PI / 2, 0, 0]}
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
  onHit,
  onStand,
  onNext,
  onLeave,
}: {
  state: BlackjackTableState
  localSeat: number
  busy: boolean
  onStart: () => void
  onHit: () => void
  onStand: () => void
  onNext: () => void
  onLeave: () => void
}) {
  const seat = BLACKJACK_SEATS[localSeat]
  const localPlayer = state.players.find((player) => player.seatIndex === localSeat)
  const isHost = state.seats.findIndex(Boolean) === localSeat
  const isMyTurn = state.phase === 'playing' && state.activeSeat === localSeat
  const cards = localPlayer?.hand ?? []

  return (
    <group position={seat.controlPosition} rotation={seat.controlRotation} scale={0.82}>
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
      {state.phase === 'lobby' && isHost && (
        <CasinoButton
          id="blackjack-start"
          label="ゲーム開始"
          detail={`${connectedHumanCount(state.seats)}人で遊ぶ`}
          position={[-0.1, -0.15, 0.035]}
          width={1.05}
          height={0.28}
          color="#c58b22"
          enabled={!busy && connectedHumanCount(state.seats) > 0}
          onPress={onStart}
        />
      )}
      {state.phase === 'lobby' && !isHost && (
        <JapanesePanel
          position={[-0.1, -0.15, 0.035]}
          width={1.05}
          height={0.28}
          title="開始待ち"
          lines={['ホストの開始待ち']}
          accent={0x69717d}
        />
      )}
      {state.phase === 'playing' && (
        <>
          <CasinoButton
            id={`blackjack-hit-${localSeat}`}
            label="1枚引く"
            position={[-0.5, -0.16, 0.035]}
            width={0.48}
            height={0.26}
            color="#c955a5"
            enabled={isMyTurn && !busy}
            onPress={onHit}
          />
          <CasinoButton
            id={`blackjack-stand-${localSeat}`}
            label="止める"
            position={[0.04, -0.16, 0.035]}
            width={0.48}
            height={0.26}
            color="#c58b22"
            enabled={isMyTurn && !busy}
            onPress={onStand}
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
        label="離席 X"
        position={[0.66, -0.16, 0.035]}
        width={0.42}
        height={0.26}
        color="#5b6575"
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
  const { teleport } = useTeleport()
  const [state, setState] = useInstanceState<BlackjackTableState>(SESSION_KEY, EMPTY_SESSION)
  const payoutRoundRef = useRef(-1)
  const autoStartedRef = useRef(false)
  const leavingRef = useRef(false)
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
      || coins < BET
    ) return
    const paid = await transact(-BET, 'ブラックジャックENTRY')
    if (paid === null) return
    setState((current) => {
      if (current.phase !== 'lobby' || current.seats[seatIndex] !== null) return current
      const seats = [...current.seats]
      seats[seatIndex] = { userId: localUserId, displayName: localName }
      return {
        ...current,
        seats,
        message: `${localName}さんがENTRY ${seatIndex + 1}へ着席`,
      }
    })
    sitCamera(seatIndex)
  }, [coins, localName, localUserId, setState, sitCamera, state.phase, state.seats, transact])

  const leaveTable = useCallback(async () => {
    if (localSeat < 0 || leavingRef.current) return
    leavingRef.current = true
    releaseSeatLock()
    const shouldRefund = state.phase === 'lobby'
    setState((current) => {
      const seats = [...current.seats]
      seats[localSeat] = null
      const players = current.players.map((player) => (
        player.seatIndex === localSeat ? { ...player, stood: true } : player
      ))
      if (connectedHumanCount(seats) === 0) {
        return { ...EMPTY_SESSION, roundId: current.roundId }
      }
      if (current.phase === 'playing' && current.activeSeat === localSeat) {
        return advanceTurn({ ...current, seats, players }, localSeat)
      }
      return { ...current, seats, players, message: `${localName}さんが離席しました` }
    })
    if (shouldRefund) await transact(BET, '開始前ENTRY返却')
    teleport({ position: [position[0], position[1], position[2] + 4.35], yaw: 0 })
  }, [localName, localSeat, position, releaseSeatLock, setState, state.phase, teleport, transact])

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
    if (state.seats.findIndex(Boolean) !== localSeat) return
    setState((current) => {
      const seatedPlayers = current.seats
        .map((seat, seatIndex) => seat ? { ...seat, seatIndex } : null)
        .filter((seat): seat is HumanSeat & { seatIndex: number } => seat !== null)
      if (seatedPlayers.length === 0) return current
      const deck = createShuffledDeck()
      const players: BlackjackPlayer[] = seatedPlayers.map((seat) => ({
        ...seat,
        hand: [],
        stood: false,
        outcome: null,
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
        players,
        deck,
        dealer,
        activeSeat: firstActive,
        message: firstActive === null
          ? '全員BLACKJACK・GM精算'
          : `${players.find((player) => player.seatIndex === firstActive)?.displayName}の番です`,
      }
      return firstActive === null ? settleTable(next) : next
    })
  }, [localSeat, setState, state.phase, state.seats])

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

  const prepareNext = useCallback(() => {
    if (localSeat < 0 || state.phase !== 'settled') return
    if (state.seats.findIndex(Boolean) !== localSeat) return
    setState((current) => ({
      ...EMPTY_SESSION,
      roundId: current.roundId,
      seats: current.seats,
      message: 'ENTRYを維持しました。任意のタイミングでゲーム開始',
    }))
  }, [localSeat, setState, state.phase, state.seats])

  const localResult = useMemo(
    () => state.players.find((player) => player.userId === localUserId)?.outcome ?? null,
    [localUserId, state.players],
  )

  useEffect(() => {
    if (state.phase !== 'settled' || payoutRoundRef.current === state.roundId) return
    payoutRoundRef.current = state.roundId
    const payout = payoutFor(localResult)
    if (payout > 0) void transact(payout, `ブラックジャック配当・${outcomeText(localResult)}`)
  }, [localResult, state.phase, state.roundId, transact])

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !ready || busy) return
    if (!seated) {
      autoStartedRef.current = true
      void joinTable(0)
    }
  }, [autoStart, busy, joinTable, ready, seated])

  useEffect(() => {
    if (!autoStart || !seated || state.phase !== 'lobby') return
    const timer = window.setTimeout(startRound, 160)
    return () => window.clearTimeout(timer)
  }, [autoStart, seated, startRound, state.phase])

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
        if (
          current.phase === 'playing'
          && current.activeSeat !== null
          && departedSeats.includes(current.activeSeat)
        ) {
          return advanceTurn({ ...current, seats, players }, current.activeSeat)
        }
        return { ...current, seats, players, message: '退出プレイヤーのENTRYを解放' }
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
        name="ジャック"
        role="GM・ディーラー"
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
            && coins >= BET
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
          onHit={hit}
          onStand={stand}
          onNext={prepareNext}
          onLeave={() => void leaveTable()}
        />
      )}
    </group>
  )
}
