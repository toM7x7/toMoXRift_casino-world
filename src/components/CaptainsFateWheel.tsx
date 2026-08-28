import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useInstanceState, useServerClock, useUsers } from '@xrift/world-components'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  canJoinRound,
  CASINO_BET_OPTIONS,
  choiceBetTotals,
  countdownSeconds,
  seededResult,
  synchronizedWheelAngle,
  type CasinoRoundBet,
} from '../game/casinoRounds'
import { balancedExactChoiceReturn } from '../game/casinoBalance'
import { createCasinoWagerId } from '../game/casinoWallet'
import { useCasinoAudio } from './CasinoAudio'
import {
  GroundActionPad,
  GroundChoicePad,
  GroundStakePad,
} from './GroundBettingPrimitives'
import { JapanesePanel } from './CasinoPrimitives'
import { useCasinoEconomy } from './CasinoEconomy'
import {
  roundIsComplete,
  scheduleAtServerTime,
  useCasinoRoundSettlement,
  useRoundClock,
  type FormalCasinoRoundState,
} from './useCasinoRound'

type Vec3 = [number, number, number]

interface FateWheelState extends FormalCasinoRoundState {}

const SESSION_KEY = 'casino.fate-wheel.round.v4'
const COUNTDOWN_MS = 5000
const RESULT_HOLD_MS = 6500
const WHEEL_GROUND_Z = -2.2
const FATE_KIOSK_RADIUS = 5.8
const FATE_KIOSK_ANGLES = [-42, -30, -18, -6, 6, 18, 30, 42].map((degrees) => degrees * Math.PI / 180)
const EMPTY_STATE: FateWheelState = {
  roundId: 1,
  phase: 'betting',
  startedAt: 0,
  durationMs: 5200,
  resultIndex: 0,
  bets: {},
}

const SECTORS = [
  { color: '#ef476f', label: '赤' },
  { color: '#ffd166', label: '黄' },
  { color: '#06d6a0', label: '緑' },
  { color: '#118ab2', label: '青' },
  { color: '#9b5de5', label: '紫' },
  { color: '#f78c6b', label: '橙' },
  { color: '#45b7d1', label: '水' },
  { color: '#d7ad42', label: '金' },
]

function FateWheelFace({
  state,
  now,
  complete,
  serverNow,
}: {
  state: FateWheelState
  now: number
  complete: boolean
  serverNow: () => number
}) {
  const wheelRef = useRef<Group>(null)

  useFrame(() => {
    if (!wheelRef.current || state.phase !== 'running' || state.startedAt <= 0) return
    wheelRef.current.rotation.z = synchronizedWheelAngle({
      roundId: state.roundId,
      resultIndex: state.resultIndex,
      choiceCount: SECTORS.length,
      startedAt: state.startedAt,
      durationMs: state.durationMs,
      now: serverNow(),
    })
  })

  return (
    <group ref={wheelRef}>
      {SECTORS.map((sector, index) => {
        const previewIndex = state.phase === 'running' && now < state.startedAt
          ? Math.floor(now / 240) % SECTORS.length
          : -1
        const highlighted = previewIndex === index || (complete && state.resultIndex === index)
        return (
        <mesh key={sector.label} position={[0, 0, index * 0.001]} castShadow>
          <ringGeometry args={[0.24, 3.1, 4, 1, index * (Math.PI / 4), Math.PI / 4]} />
          <meshStandardMaterial color={sector.color} emissive={sector.color} emissiveIntensity={highlighted ? 0.62 : 0.04} roughness={0.7} metalness={0.04} />
        </mesh>
        )
      })}
      {SECTORS.map((sector, index) => (
        <group key={`spoke-${sector.label}`} rotation={[0, 0, index * (Math.PI / 4)]}>
          <mesh position={[1.55, 0, 0.08]}>
            <boxGeometry args={[3.05, 0.08, 0.09]} />
            <meshStandardMaterial color="#35251d" roughness={0.84} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.42, 12]} />
        <meshStandardMaterial color="#f6c453" roughness={0.42} metalness={0.28} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <torusGeometry args={[3.13, 0.16, 8, 40]} />
        <meshStandardMaterial color="#493526" roughness={0.72} />
      </mesh>
    </group>
  )
}

export function CaptainsFateWheel({ position }: { position: Vec3 }) {
  const [state, setState] = useInstanceState<FateWheelState>(SESSION_KEY, EMPTY_STATE)
  const { localUser } = useUsers()
  const clock = useServerClock({ require: 'motion' })
  const { coins, ready, busy, placeWager } = useCasinoEconomy()
  const { play } = useCasinoAudio()
  const [selectedColor, setSelectedColor] = useState(0)
  const [betAmount, setBetAmount] = useState<number>(1)
  const now = useRoundClock()
  const complete = roundIsComplete(state, now)
  const playerCount = Object.keys(state.bets).length
  const betTotals = choiceBetTotals(state.bets, SECTORS.length)
  const localBet = localUser ? state.bets[localUser.id] : undefined
  const audioPlayedRef = useRef(new Set<string>())
  const countdown = state.phase === 'running' ? countdownSeconds(state.startedAt, now) : 0
  const selectedReturn = balancedExactChoiceReturn(
    'fate',
    localBet?.amount ?? betAmount,
    localBet?.choice ?? selectedColor,
    localBet?.choice ?? selectedColor,
  )

  useCasinoRoundSettlement({
    game: 'fate',
    state,
    choiceCount: SECTORS.length,
    winReason: '運命盤的中',
    fixedPayout: localBet
      ? balancedExactChoiceReturn('fate', localBet.amount, localBet.choice, state.resultIndex)
      : 0,
  })

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0) return
    const token = `${state.roundId}:${state.startedAt}`
    const cancel: Array<() => void> = []
    const countdownAt = state.startedAt - 3000
    const countdownToken = `${token}:countdown`
    if (clock.now() <= countdownAt + 250 && !audioPlayedRef.current.has(countdownToken)) {
      cancel.push(scheduleAtServerTime(countdownAt, clock.now, () => {
        if (audioPlayedRef.current.has(countdownToken)) return
        audioPlayedRef.current.add(countdownToken)
        play('countdown')
      }))
    }
    const wheelToken = `${token}:wheel`
    if (clock.now() <= state.startedAt + 250 && !audioPlayedRef.current.has(wheelToken)) {
      cancel.push(scheduleAtServerTime(state.startedAt, clock.now, () => {
        if (audioPlayedRef.current.has(wheelToken)) return
        audioPlayedRef.current.add(wheelToken)
        play('wheel')
      }))
    }
    return () => cancel.forEach((stop) => stop())
  }, [clock.now, clock.timeJumpCount, play, state.phase, state.roundId, state.startedAt])

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0) return
    const roundId = state.roundId
    return scheduleAtServerTime(state.startedAt + state.durationMs + RESULT_HOLD_MS, clock.now, () => {
      setState((previous) => previous.roundId === roundId && roundIsComplete(previous, clock.now())
        ? { ...EMPTY_STATE, roundId: roundId + 1 }
        : previous)
    })
  }, [clock.now, clock.timeJumpCount, setState, state.durationMs, state.phase, state.roundId, state.startedAt])

  const selectColor = (index: number) => {
    if (state.phase !== 'betting' || localBet) return
    setSelectedColor(index)
    play('select')
  }

  const placeBet = async () => {
    if (!localUser || state.phase !== 'betting' || localBet) return
    if (!canJoinRound(state.bets, localUser.id) || coins < betAmount) return
    const wagerId = createCasinoWagerId('fate', localUser.id)
    const next = await placeWager(
      wagerId,
      betAmount,
      `運命盤・${SECTORS[selectedColor].label}にBET`,
    )
    if (next === null) return
    const bet: CasinoRoundBet = {
      userId: localUser.id,
      userName: localUser.displayName,
      choice: selectedColor,
      amount: betAmount,
      wagerId,
    }
    setState((previous) => previous.phase === 'betting'
      ? { ...previous, bets: { ...previous.bets, [localUser.id]: bet } }
      : previous)
    play('bet')
  }

  const advanceRound = () => {
    if (complete) {
      setState({
        ...EMPTY_STATE,
        roundId: state.roundId + 1,
      })
      play('select')
      return
    }
    if (state.phase !== 'betting' || playerCount === 0) return
    const startedAt = clock.now() + COUNTDOWN_MS
    setState({
      ...state,
      phase: 'running',
      startedAt,
      resultIndex: seededResult(startedAt ^ (state.roundId * 7919), SECTORS.length),
    })
  }

  const receiptMain = complete
    ? `結果 ${SECTORS[state.resultIndex].label}`
    : localBet
      ? `${SECTORS[localBet.choice].label}に ${localBet.amount}枚・的中${selectedReturn}枚`
      : `${SECTORS[selectedColor].label}に ${betAmount}枚（的中${selectedReturn}枚）`
  const statusLines = complete
    ? [`結果：${SECTORS[state.resultIndex].label}　払戻確認中`, `${Math.ceil(RESULT_HOLD_MS / 1000)}秒後に受付へ自動復帰`]
    : countdown > 0
      ? [`注目！ 抽選まで ${countdown}`, 'BET締切・円盤のライト演出中']
      : state.phase === 'running'
        ? ['正式抽選中', '白い針が止まった色が当たり']
        : [`受付中 ${playerCount}/8人・色 → 枚数 → BET確定`, receiptMain]

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.92}>
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[12, 0.1, 13]} />
          <meshStandardMaterial color="#3c3025" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.11, 0]} receiveShadow>
          <boxGeometry args={[11.5, 0.04, 12.5]} />
          <meshStandardMaterial color="#74455d" roughness={0.9} />
        </mesh>
      </RigidBody>

      <group position={[0, 3.9, WHEEL_GROUND_Z]}>
        <FateWheelFace state={state} now={now} complete={complete} serverNow={clock.now} />
        <mesh position={[-3.65, -1.25, -0.22]} castShadow>
          <boxGeometry args={[0.46, 5.8, 0.7]} />
          <meshStandardMaterial color="#493526" roughness={0.88} />
        </mesh>
        <mesh position={[3.65, -1.25, -0.22]} castShadow>
          <boxGeometry args={[0.46, 5.8, 0.7]} />
          <meshStandardMaterial color="#493526" roughness={0.88} />
        </mesh>
        <mesh position={[0, -4.03, -0.22]} castShadow>
          <boxGeometry args={[7.8, 0.42, 0.9]} />
          <meshStandardMaterial color="#805a3b" roughness={0.88} />
        </mesh>
        <mesh position={[0, 3.62, 0.18]} rotation={[0, 0, Math.PI]} castShadow>
          <coneGeometry args={[0.34, 0.9, 3]} />
          <meshStandardMaterial color="#fff7e6" emissive="#f6c453" emissiveIntensity={0.32} />
        </mesh>
      </group>
      <JapanesePanel position={[0, 8.05, -2.25]} width={6.8} height={1.28} title="船長の運命盤" lines={statusLines} accent={0xf6c453} background={0x172033} />

      {SECTORS.map((sector, index) => {
        const angle = FATE_KIOSK_ANGLES[index]
        return (
          <GroundChoicePad
            key={sector.label}
            id={`fate-color-${index}`}
            position={[
              Math.sin(angle) * FATE_KIOSK_RADIUS,
              0.08,
              WHEEL_GROUND_Z + Math.cos(angle) * FATE_KIOSK_RADIUS,
            ]}
            label={`${index + 1} ${sector.label}`}
            detail={`合計 ${betTotals[index]}枚`}
            color={sector.color}
            textColor={index === 1 || index === 7 ? '#172033' : '#fff7e6'}
            selected={selectedColor === index || localBet?.choice === index}
            enabled={state.phase === 'betting' && !localBet}
            width={1.05}
            depth={0.95}
            onSelect={() => selectColor(index)}
          />
        )
      })}

      <Text position={[0, 0.2, 4.12]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color="#fff1b8" anchorX="center">
        STEP 2　掛け金を選ぶ
      </Text>
      {CASINO_BET_OPTIONS.map((amount, index) => (
        <GroundStakePad
          key={`fate-bet-${amount}`}
          id={`fate-bet-amount-${amount}`}
          position={[-4 + index * 1.25, 0.08, 4.8]}
          amount={amount}
          selected={betAmount === amount}
          enabled={state.phase === 'betting' && !localBet}
          onSelect={() => {
            setBetAmount(amount)
            play('select')
          }}
        />
      ))}
      <GroundActionPad
        id="fate-confirm-bet"
        label={localBet ? 'BET済み' : 'BET確定'}
        detail={localBet ? `${localBet.amount}枚・的中${selectedReturn}枚` : `${SECTORS[selectedColor].label}・的中${selectedReturn}枚`}
        position={[0.25, 0.08, 4.8]}
        color="#9a4d7b"
        enabled={ready && !busy && state.phase === 'betting' && !localBet && coins >= betAmount && playerCount < 8}
        onPress={() => void placeBet()}
      />
      <GroundActionPad
        id="fate-round-control"
        label={complete ? '受付へ戻す' : countdown > 0 ? `${countdown}秒` : state.phase === 'running' ? '抽選中' : '抽選開始'}
        detail={state.phase === 'betting' ? `${playerCount}/8人・押すと5秒後に回転` : complete ? '自動復帰もします' : 'BET締切'}
        position={[2.85, 0.08, 4.8]}
        color="#a3632d"
        enabled={(complete || (state.phase === 'betting' && playerCount > 0)) && !busy}
        onPress={advanceRound}
      />
      <pointLight position={[0, 5.5, -0.8]} intensity={5.2} distance={13} color="#ffd98a" />
    </group>
  )
}
