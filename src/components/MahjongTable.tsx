import { Text } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import {
  useInstanceState,
  useTeleport,
  useUsers,
} from '@xrift/world-components'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  analyzeDiscard,
  chooseNpcDiscard,
  dealMahjong,
  isWinningHand,
  sortTiles,
  TILE_LABELS,
  winningTiles,
  type Tile,
} from '../game/mahjong'
import {
  MAHJONG_SEATS,
  worldSeatPosition,
} from '../game/seatLayout'
import {
  connectedHumanCount,
  createEmptySeats,
  findSeatByUser,
  seatLabel,
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

const SESSION_KEY = 'casino.mahjong.table.v13'
const NPC_NAMES = ['ミオ', 'アカリ', 'レン', 'ユイ'] as const
const WIND_NAMES = ['東', '南', '西', '北'] as const

function compactTileLabel(tile: Tile): string {
  if (tile < 9) return `${tile + 1}萬`
  if (tile < 18) return `${tile - 8}筒`
  if (tile < 27) return `${tile - 17}索`
  return TILE_LABELS[tile]
}

type MahjongPhase = 'lobby' | 'playing' | 'settled'

interface MahjongTableState {
  phase: MahjongPhase
  roundId: number
  seats: SeatList
  hands: Tile[][]
  wall: Tile[]
  discards: Tile[][]
  currentSeat: number | null
  winnerSeat: number | null
  message: string
}

const EMPTY_SESSION: MahjongTableState = {
  phase: 'lobby',
  roundId: 0,
  seats: createEmptySeats(),
  hands: [[], [], [], []],
  wall: [],
  discards: [[], [], [], []],
  currentSeat: null,
  winnerSeat: null,
  message: '無料研究卓です。椅子を選んで参加してください',
}

const NPC_TRANSFORMS = [
  { position: [0, 0, 2.8], rotation: [0, Math.PI, 0], color: '#c58b22' },
  { position: [-3.15, 0, 0], rotation: [0, Math.PI / 2, 0], color: '#c2415d' },
  { position: [0, 0, -2.8], rotation: [0, 0, 0], color: '#7c3aed' },
  { position: [3.15, 0, 0], rotation: [0, -Math.PI / 2, 0], color: '#19875d' },
] as const

function drawForSeat(state: MahjongTableState, seatIndex: number): MahjongTableState {
  const wall = [...state.wall]
  const hands = state.hands.map((hand) => [...hand])
  const tile = wall.pop()
  if (tile === undefined) {
    return {
      ...state,
      phase: 'settled',
      currentSeat: null,
      winnerSeat: null,
      message: '山がなくなり流局です',
    }
  }
  const concealedTiles = sortTiles([...hands[seatIndex]])
  hands[seatIndex] = [...concealedTiles, tile]
  return {
    ...state,
    wall,
    hands,
    currentSeat: seatIndex,
    message: `${seatLabel(state.seats, seatIndex, NPC_NAMES)}の番です`,
  }
}

function discardAndAdvance(
  state: MahjongTableState,
  seatIndex: number,
  tileIndex: number,
): MahjongTableState {
  if (
    state.phase !== 'playing'
    || state.currentSeat !== seatIndex
    || state.hands[seatIndex].length !== 14
  ) {
    return state
  }
  const hands = state.hands.map((hand) => [...hand])
  const discards = state.discards.map((pile) => [...pile])
  const [discarded] = hands[seatIndex].splice(tileIndex, 1)
  if (discarded === undefined) return state
  discards[seatIndex].push(discarded)
  const nextSeat = (seatIndex + 1) % 4
  return drawForSeat({ ...state, hands, discards }, nextSeat)
}

function TileWall() {
  const blocks = Array.from({ length: 14 }, (_, index) => index)
  return (
    <group>
      {blocks.map((index) => (
        <mesh key={`wall-n-${index}`} position={[-2.02 + index * 0.31, 1.05, -1.2]} castShadow>
          <boxGeometry args={[0.28, 0.24, 0.42]} />
          <meshStandardMaterial color="#fff7e6" roughness={0.5} />
        </mesh>
      ))}
      {blocks.map((index) => (
        <mesh key={`wall-s-${index}`} position={[-2.02 + index * 0.31, 1.05, 1.2]} castShadow>
          <boxGeometry args={[0.28, 0.24, 0.42]} />
          <meshStandardMaterial color="#fff7e6" roughness={0.5} />
        </mesh>
      ))}
      {blocks.slice(0, 10).map((index) => (
        <mesh key={`wall-w-${index}`} position={[-2.14, 1.05, -1.08 + index * 0.24]} castShadow>
          <boxGeometry args={[0.42, 0.24, 0.21]} />
          <meshStandardMaterial color="#fff7e6" roughness={0.5} />
        </mesh>
      ))}
      {blocks.slice(0, 10).map((index) => (
        <mesh key={`wall-e-${index}`} position={[2.14, 1.05, -1.08 + index * 0.24]} castShadow>
          <boxGeometry args={[0.42, 0.24, 0.21]} />
          <meshStandardMaterial color="#fff7e6" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function MahjongNpcSeats({ state }: { state: MahjongTableState }) {
  if (state.phase === 'lobby') return null
  return (
    <>
      {state.seats.map((seat, index) => {
        if (seat !== null) return null
        const transform = NPC_TRANSFORMS[index]
        return (
          <group
            key={`mahjong-npc-${index}`}
            position={[...transform.position]}
            rotation={[...transform.rotation]}
          >
            <CasinoNpc
              position={[0, 0, 0]}
              color={transform.color}
              name={NPC_NAMES[index]}
              role={`${WIND_NAMES[index]}家・NPC`}
              accent={0x52d6d3}
              animation={
                state.phase === 'settled' && state.winnerSeat === index
                  ? '18_Success_Celebration'
                  : state.phase === 'playing' && state.currentSeat === index
                    ? '08_Action_One-Handed_Low'
                    : '01_Idle_1'
              }
              repeatAnimation={
                state.phase !== 'settled'
                && !(state.phase === 'playing' && state.currentSeat === index)
              }
              animationKey={`${state.roundId}-${state.message}`}
              modelScale={2.42}
              showLabel={false}
            />
          </group>
        )
      })}
    </>
  )
}

function DiscardField({ state }: { state: MahjongTableState }) {
  return (
    <group>
      {state.discards.map((pile, seatIndex) => (
        <group key={`discard-seat-${seatIndex}`} rotation={[0, seatIndex * Math.PI / 2, 0]}>
          {pile.slice(-6).map((tile, index) => (
            <group
              key={`discard-${seatIndex}-${index}-${tile}`}
              position={[-0.65 + (index % 3) * 0.46, 1.01, 0.18 + Math.floor(index / 3) * 0.5]}
            >
              <mesh>
                <boxGeometry args={[0.4, 0.045, 0.46]} />
                <meshStandardMaterial color="#fff7e6" roughness={0.64} />
              </mesh>
              <Text
                position={[0, 0.025, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.12}
                color={tile >= 27 ? '#c2413b' : '#172033'}
                anchorX="center"
                anchorY="middle"
              >
                {TILE_LABELS[tile]}
              </Text>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

function LocalMahjongControls({
  state,
  localSeat,
  busy,
  waits,
  onStart,
  onDiscard,
  onAutoDiscard,
  onTsumo,
  onNext,
  onLeave,
}: {
  state: MahjongTableState
  localSeat: number
  busy: boolean
  waits: Tile[]
  onStart: () => void
  onDiscard: (index: number) => void
  onAutoDiscard: () => void
  onTsumo: () => void
  onNext: () => void
  onLeave: () => void
}) {
  const seat = MAHJONG_SEATS[localSeat]
  const hand = state.hands[localSeat] ?? []
  const isHost = state.seats.findIndex(Boolean) === localSeat
  const isMyTurn = state.phase === 'playing' && state.currentSeat === localSeat
  const winning = isMyTurn && isWinningHand(hand)

  return (
    <group position={seat.controlPosition} rotation={seat.controlRotation} scale={0.78}>
      <mesh position={[0, 0.02, -0.075]}>
        <boxGeometry args={[2.68, 0.78, 0.1]} />
        <meshStandardMaterial color="#493526" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.02, -0.018]}>
        <boxGeometry args={[2.56, 0.68, 0.08]} />
        <meshStandardMaterial color="#172033" roughness={0.82} />
      </mesh>
      <Text
        position={[0, 0.3, 0.035]}
        fontSize={0.085}
        maxWidth={2.35}
        color="#fff1b8"
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {state.phase === 'playing'
          ? state.currentSeat === localSeat ? 'あなたの番です・牌を1枚選択' : state.message
          : state.message}
      </Text>
      {state.phase === 'lobby' && isHost && (
        <CasinoButton
          id="mahjong-start"
          label="対局開始"
          detail={`${connectedHumanCount(state.seats)}人＋NPCで開始`}
          position={[-0.18, -0.16, 0.035]}
          width={1.55}
          height={0.28}
          color="#c58b22"
          enabled={!busy}
          onPress={onStart}
        />
      )}
      {state.phase === 'lobby' && !isHost && (
        <JapanesePanel
          position={[-0.18, -0.16, 0.035]}
          width={1.55}
          height={0.28}
          title="開始待ち"
          lines={['ホストの開始待ち']}
          accent={0x69717d}
        />
      )}
      {state.phase === 'playing' && hand.map((tile, index) => {
        const x = index === 13 ? 1.1 : -1.08 + index * 0.155
        return (
          <CasinoButton
            key={`private-tile-${index}-${tile}`}
            id={`mahjong-tile-${localSeat}-${index}`}
            label={compactTileLabel(tile)}
            position={[x, 0.08, 0.035]}
            width={0.135}
            height={0.31}
            labelFontSize={0.058}
            color={index === 13 ? '#c58b22' : '#3dbfbc'}
            enabled={isMyTurn && !winning && !busy}
            onPress={() => onDiscard(index)}
          />
        )
      })}
      {state.phase === 'playing' && (
        <>
          <CasinoButton
            id={`mahjong-auto-discard-${localSeat}`}
            label="おすすめ"
            position={[-0.58, -0.2, 0.035]}
            width={0.62}
            height={0.24}
            color="#c58b22"
            enabled={isMyTurn && !winning && !busy}
            onPress={onAutoDiscard}
          />
          <CasinoButton
            id={`mahjong-tsumo-${localSeat}`}
            label="ツモ！"
            position={[0.11, -0.2, 0.035]}
            width={0.52}
            height={0.24}
            color="#c58b22"
            enabled={winning && !busy}
            onPress={onTsumo}
          />
          {waits.length > 0 && (
            <Text position={[0, 0.43, 0.03]} fontSize={0.085} color="#fff1b8" anchorX="center">
              {`待ち ${waits.map((tile) => TILE_LABELS[tile]).join('・')}`}
            </Text>
          )}
        </>
      )}
      {state.phase === 'settled' && isHost && (
        <CasinoButton
          id="mahjong-next"
          label="次の対局"
          detail={state.winnerSeat === null ? '流局' : `${seatLabel(state.seats, state.winnerSeat, NPC_NAMES)} ツモ`}
          position={[-0.18, -0.18, 0.035]}
          width={1.18}
          height={0.27}
          color="#c58b22"
          enabled={!busy}
          onPress={onNext}
        />
      )}
      <CasinoButton
        id={`mahjong-leave-${localSeat}`}
        label="離席 X"
        position={[0.9, -0.2, 0.035]}
        width={0.48}
        height={0.24}
        color="#5b6575"
        enabled
        onPress={onLeave}
      />
    </group>
  )
}

export function MahjongTable({
  position = [0, 0, 0],
  autoStart = false,
}: {
  position?: [number, number, number]
  autoStart?: boolean
}) {
  const { ready, busy } = useCasinoEconomy()
  const { localUser, remoteUsers } = useUsers()
  const { teleport } = useTeleport()
  const [state, setState] = useInstanceState<MahjongTableState>(SESSION_KEY, EMPTY_SESSION)
  const autoStartedRef = useRef(false)
  const leavingRef = useRef(false)
  const localUserId = localUser?.id ?? 'local-preview-user'
  const localName = localUser?.displayName ?? 'あなた'
  const localSeat = findSeatByUser(state.seats, localUserId)
  const seated = localSeat >= 0
  const hostSeat = state.seats.findIndex(Boolean)
  const isHost = hostSeat === localSeat
  const targetSeat = useMemo(
    () => seated ? worldSeatPosition(position, MAHJONG_SEATS[localSeat]) : null,
    [localSeat, position, seated],
  )
  const targetYaw = seated ? MAHJONG_SEATS[localSeat].yaw : 0
  const { releaseSeatLock } = useSeatLock(seated, targetSeat, targetYaw)

  const sitCamera = useCallback((seatIndex: number) => {
    const seat = MAHJONG_SEATS[seatIndex]
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
        message: `${localName}さんが${WIND_NAMES[seatIndex]}家へ無料参加`,
      }
    })
    sitCamera(seatIndex)
  }, [localName, localUserId, setState, sitCamera, state.phase, state.seats])

  const leaveTable = useCallback(async () => {
    if (localSeat < 0 || leavingRef.current) return
    leavingRef.current = true
    releaseSeatLock()
    setState((current) => {
      const seats = [...current.seats]
      seats[localSeat] = null
      if (connectedHumanCount(seats) === 0) {
        return { ...EMPTY_SESSION, roundId: current.roundId }
      }
      return {
        ...current,
        seats,
        message: current.phase === 'playing'
          ? `${localName}さんの席をNPCが引き継ぎました`
          : `${localName}さんが離席しました`,
      }
    })
    teleport({ position: [position[0], position[1], position[2] + 4.55], yaw: 0 })
  }, [localName, localSeat, position, releaseSeatLock, setState, state.phase, teleport])

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
    if (!isHost || state.phase !== 'lobby') return
    setState((current) => {
      if (connectedHumanCount(current.seats) === 0) return current
      const deal = dealMahjong()
      return drawForSeat({
        ...current,
        phase: 'playing',
        roundId: current.roundId + 1,
        hands: deal.hands,
        wall: deal.wall,
        discards: [[], [], [], []],
        currentSeat: 0,
        winnerSeat: null,
        message: '東家から開始します',
      }, 0)
    })
  }, [isHost, setState, state.phase])

  const discard = useCallback((tileIndex: number) => {
    if (state.currentSeat !== localSeat || state.phase !== 'playing') return
    setState((current) => discardAndAdvance(current, localSeat, tileIndex))
  }, [localSeat, setState, state.currentSeat, state.phase])

  const tsumo = useCallback(() => {
    if (
      state.phase !== 'playing'
      || state.currentSeat !== localSeat
      || !isWinningHand(state.hands[localSeat] ?? [])
    ) return
    setState((current) => ({
      ...current,
      phase: 'settled',
      currentSeat: null,
      winnerSeat: localSeat,
      message: `${localName}さんがツモしました！`,
    }))
  }, [localName, localSeat, setState, state.currentSeat, state.hands, state.phase])

  const discardSuggestion = useCallback(() => {
    if (state.phase !== 'playing' || state.currentSeat !== localSeat) return
    setState((current) => {
      const hand = current.hands[localSeat] ?? []
      if (
        current.phase !== 'playing'
        || current.currentSeat !== localSeat
        || hand.length !== 14
        || isWinningHand(hand)
      ) return current
      return discardAndAdvance(current, localSeat, analyzeDiscard(hand).tileIndex)
    })
  }, [localSeat, setState, state.currentSeat, state.phase])

  const prepareNext = useCallback(() => {
    if (!isHost || state.phase !== 'settled') return
    setState((current) => ({
      ...EMPTY_SESSION,
      roundId: current.roundId,
      seats: current.seats,
      message: '無料参加席を維持しました。任意のタイミングで対局開始',
    }))
  }, [isHost, setState, state.phase])

  const localWaits = useMemo(() => {
    const hand = state.hands[localSeat] ?? []
    return hand.length === 13 ? winningTiles(hand) : []
  }, [localSeat, state.hands])

  useEffect(() => {
    if (
      state.phase !== 'playing'
      || state.currentSeat === null
      || state.seats[state.currentSeat] !== null
      || !isHost
    ) return
    const seatIndex = state.currentSeat
    const revisionRound = state.roundId
    const timer = window.setTimeout(() => {
      setState((current) => {
        if (
          current.phase !== 'playing'
          || current.roundId !== revisionRound
          || current.currentSeat !== seatIndex
          || current.seats[seatIndex] !== null
        ) return current
        const hand = current.hands[seatIndex]
        if (isWinningHand(hand)) {
          return {
            ...current,
            phase: 'settled',
            currentSeat: null,
            winnerSeat: seatIndex,
            message: `${NPC_NAMES[seatIndex]}がツモしました`,
          }
        }
        const discardTile = chooseNpcDiscard(hand)
        return discardAndAdvance(current, seatIndex, hand.indexOf(discardTile))
      })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [isHost, setState, state.currentSeat, state.phase, state.roundId, state.seats])

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
    if (!isHost) return
    const connectedIds = new Set([localUserId, ...remoteUsers.map((user) => user.id)])
    const timer = window.setTimeout(() => {
      setState((current) => {
        const seats = current.seats.map((seat) => (
          seat && !connectedIds.has(seat.userId) ? null : seat
        ))
        const changed = seats.some((seat, index) => seat !== current.seats[index])
        if (!changed) return current
        if (connectedHumanCount(seats) === 0) {
          return { ...EMPTY_SESSION, roundId: current.roundId }
        }
        return {
          ...current,
          seats,
          message: current.phase === 'playing'
            ? '退出プレイヤーの席をNPCが引き継ぎました'
            : '退出プレイヤーのENTRYを解放しました',
        }
      })
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [isHost, localUserId, remoteUsers, setState, state.seats])

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.85}>
        <mesh position={[0, 0.82, 0]} scale={[1, 1, 0.917]} castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 2.4, 0.24, 8]} />
          <meshStandardMaterial color="#69717d" roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 0.41, 0]} castShadow>
          <boxGeometry args={[1.6, 0.82, 1.6]} />
          <meshStandardMaterial color="#493526" roughness={0.88} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 0.955, 0]} scale={[1, 1, 0.917]}>
        <cylinderGeometry args={[2.24, 2.24, 0.035, 8]} />
        <meshStandardMaterial color="#3dbfbc" roughness={0.82} flatShading />
      </mesh>
      <TileWall />
      <DiscardField state={state} />
      <MahjongNpcSeats state={state} />

      {MAHJONG_SEATS.map((seat, index) => (
        <CasinoSeat
          key={`mahjong-chair-${index}`}
          id={`mahjong-chair-${index}`}
          position={seat.position}
          rotation={seat.controlRotation}
          enabled={
            state.phase === 'lobby'
            && !seated
            && state.seats[index] === null
            && ready
            && !busy
            && ready
          }
          occupied={state.seats[index] !== null}
          onSit={() => void joinTable(index)}
        />
      ))}

      {seated && (
        <LocalMahjongControls
          state={state}
          localSeat={localSeat}
          busy={busy}
          waits={localWaits}
          onStart={startRound}
          onDiscard={discard}
          onAutoDiscard={discardSuggestion}
          onTsumo={tsumo}
          onNext={prepareNext}
          onLeave={() => void leaveTable()}
        />
      )}
    </group>
  )
}
