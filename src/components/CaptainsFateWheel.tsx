import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useInstanceState, useServerClock, useUsers } from '@xrift/world-components'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  canJoinRound,
  CASINO_BET_OPTIONS,
  choiceBetTotals,
  seededResult,
  synchronizedWheelAngle,
  type CasinoRoundBet,
} from '../game/casinoRounds'
import { useCasinoAudio } from './CasinoAudio'
import {
  BettingConsole,
  BetReceipt,
  BetTargetPad,
  ChipStakePile,
  TableActionPad,
} from './BettingTablePrimitives'
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

const SESSION_KEY = 'casino.fate-wheel.round.v3'
const SYNCHRONIZED_START_DELAY_MS = 1500
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

function FateWheelFace({ state, serverNow }: { state: FateWheelState; serverNow: () => number }) {
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
      {SECTORS.map((sector, index) => (
        <mesh key={sector.label} position={[0, 0, index * 0.001]} castShadow>
          <ringGeometry args={[0.24, 3.1, 4, 1, index * (Math.PI / 4), Math.PI / 4]} />
          <meshStandardMaterial color={sector.color} roughness={0.7} metalness={0.04} />
        </mesh>
      ))}
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
  const { coins, ready, busy, transact } = useCasinoEconomy()
  const { play } = useCasinoAudio()
  const [selectedColor, setSelectedColor] = useState(0)
  const [betAmount, setBetAmount] = useState<number>(1)
  const now = useRoundClock()
  const complete = roundIsComplete(state, now)
  const playerCount = Object.keys(state.bets).length
  const betTotals = choiceBetTotals(state.bets, SECTORS.length)
  const localBet = localUser ? state.bets[localUser.id] : undefined
  const heardRoundRef = useRef('')

  useCasinoRoundSettlement({
    game: 'fate',
    state,
    choiceCount: SECTORS.length,
    winReason: '運命盤的中',
  })

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0) return
    const token = `${state.roundId}:${state.startedAt}`
    if (heardRoundRef.current === token) return
    return scheduleAtServerTime(state.startedAt, clock.now, () => {
      if (heardRoundRef.current === token) return
      heardRoundRef.current = token
      play('wheel')
    })
  }, [clock.now, clock.timeJumpCount, play, state.phase, state.roundId, state.startedAt])

  const selectColor = (index: number) => {
    if (state.phase !== 'betting' || localBet) return
    setSelectedColor(index)
    play('select')
  }

  const placeBet = async () => {
    if (!localUser || state.phase !== 'betting' || localBet) return
    if (!canJoinRound(state.bets, localUser.id) || coins < betAmount) return
    const next = await transact(-betAmount, `運命盤・${SECTORS[selectedColor].label}にBET`)
    if (next === null) return
    const bet: CasinoRoundBet = {
      userId: localUser.id,
      userName: localUser.displayName,
      choice: selectedColor,
      amount: betAmount,
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
    const startedAt = clock.now() + SYNCHRONIZED_START_DELAY_MS
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
      ? `${SECTORS[localBet.choice].label}に ${localBet.amount}枚`
      : `${SECTORS[selectedColor].label}に ${betAmount}枚（仮置き）`
  const receiptDetail = localBet
    ? `BET確定済み・第${state.roundId}回・参加${playerCount}/8人`
    : `色枠とチップ山を触って選択・的中時×8`

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.92}>
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[12, 0.1, 10]} />
          <meshStandardMaterial color="#3c3025" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.11, 0]} receiveShadow>
          <boxGeometry args={[11.5, 0.04, 9.5]} />
          <meshStandardMaterial color="#74455d" roughness={0.9} />
        </mesh>
      </RigidBody>

      <group position={[0, 3.9, -2.2]}>
        <FateWheelFace state={state} serverNow={clock.now} />
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

      <BettingConsole
        position={[0, 1.8, 3.25]}
        width={7.2}
        height={4.5}
        accent="#f6c453"
        title="船長の運命盤 BET卓　色別の合計チップ"
      >
        {SECTORS.map((sector, index) => {
          const column = index % 4
          const row = Math.floor(index / 4)
          return (
            <BetTargetPad
              key={sector.label}
              id={`fate-color-${index}`}
              position={[-2.45 + column * 1.63, 0.82 - row * 0.72, 0.22]}
              label={`${index + 1} ${sector.label}`}
              total={betTotals[index]}
              color={sector.color}
              textColor={index === 1 || index === 7 ? '#172033' : '#fff7e6'}
              selected={selectedColor === index || localBet?.choice === index}
              enabled={state.phase === 'betting' && !localBet}
              width={1.42}
              onSelect={() => selectColor(index)}
            />
          )
        })}
        {CASINO_BET_OPTIONS.map((amount, index) => (
          <ChipStakePile
            key={`fate-bet-${amount}`}
            id={`fate-bet-amount-${amount}`}
            position={[-1.2 + index * 1.2, -0.82, 0.22]}
            amount={amount}
            selected={betAmount === amount}
            enabled={state.phase === 'betting' && !localBet}
            onSelect={() => {
              setBetAmount(amount)
              play('select')
            }}
          />
        ))}
        <BetReceipt
          position={[-1.7, -1.62, 0.22]}
          title="あなたのBET札"
          main={receiptMain}
          detail={receiptDetail}
          accent={localBet ? SECTORS[localBet.choice].color : SECTORS[selectedColor].color}
        />
        <TableActionPad
          id="fate-confirm-bet"
          label={localBet ? 'BET済み' : 'チップを置く'}
          detail={localBet ? `${localBet.amount}枚 確定` : `${SECTORS[selectedColor].label}・${betAmount}枚`}
          position={[0.72, -1.62, 0.22]}
          color="#9a4d7b"
          enabled={ready && !busy && state.phase === 'betting' && !localBet && coins >= betAmount && playerCount < 8}
          onPress={() => void placeBet()}
        />
        <TableActionPad
          id="fate-round-control"
          label={complete ? '次の受付' : state.phase === 'running' ? '抽選中' : '抽選レバー'}
          detail={state.phase === 'betting' ? `${playerCount}/8人 BET中` : complete ? '払戻を確認' : '回転中'}
          position={[2.62, -1.62, 0.22]}
          color="#a3632d"
          enabled={(complete || (state.phase === 'betting' && playerCount > 0)) && !busy}
          onPress={advanceRound}
        />
      </BettingConsole>
      <pointLight position={[0, 5.5, -0.8]} intensity={5.2} distance={13} color="#ffd98a" />
    </group>
  )
}
