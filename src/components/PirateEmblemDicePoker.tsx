import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useInstanceState, useServerClock, useUsers } from '@xrift/world-components'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  CASINO_BALANCE,
  classifyDicePoker,
  dicePokerTotalReturn,
  type DicePokerHand,
} from '../game/casinoBalance'
import {
  canJoinRound,
  countdownSeconds,
  seededResult,
  type CasinoRoundBet,
} from '../game/casinoRounds'
import { useCasinoAudio } from './CasinoAudio'
import { useCasinoEconomy } from './CasinoEconomy'
import { JapanesePanel } from './CasinoPrimitives'
import { GroundActionPad, GroundStakePad } from './GroundBettingPrimitives'
import {
  roundIsComplete,
  scheduleAtServerTime,
  useCasinoRoundSettlement,
  useRoundClock,
  type FormalCasinoRoundState,
} from './useCasinoRound'

type Vec3 = [number, number, number]

interface DicePokerState extends FormalCasinoRoundState {
  dice: [number, number, number]
}

const SESSION_KEY = 'casino.emblem-dice-poker.round.v1'
const COUNTDOWN_MS = 5000
const ROLL_MS = 2600
const RESULT_HOLD_MS = 7000
const EMPTY_STATE: DicePokerState = {
  roundId: 1,
  phase: 'betting',
  startedAt: 0,
  durationMs: ROLL_MS,
  resultIndex: 0,
  bets: {},
  dice: [0, 1, 2],
}

const HAND_LABELS: Record<DicePokerHand, string> = {
  'three-kind': '三つ揃い',
  straight: '連番',
  pair: '一組',
  high: '役なし',
}

const DICE_COLORS = ['#d24d57', '#f0b429', '#2f9e78', '#377dba', '#845ec2', '#d97b46']

function EmblemDie({
  index,
  value,
  state,
  serverNow,
}: {
  index: number
  value: number
  state: DicePokerState
  serverNow: () => number
}) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current) return
    if (state.phase !== 'running' || state.startedAt <= 0) {
      ref.current.rotation.set(0, index * 0.12, 0)
      return
    }
    const progress = Math.max(0, Math.min(1, (serverNow() - state.startedAt) / state.durationMs))
    if (progress < 1) {
      const spin = progress * Math.PI * (8 + index * 2)
      ref.current.rotation.set(spin * 0.8, spin, spin * 0.55)
    } else {
      ref.current.rotation.set(0, 0, 0)
    }
  })

  const symbol = CASINO_BALANCE.dicePoker.symbols[value] ?? '?'
  return (
    <group ref={ref} position={[(index - 1) * 1.45, 2.05, -1.2]}>
      <mesh castShadow>
        <boxGeometry args={[1.08, 1.08, 1.08]} />
        <meshStandardMaterial color={DICE_COLORS[value]} roughness={0.54} metalness={0.08} />
      </mesh>
      <Text position={[0, 0, 0.551]} fontSize={0.26} color="#fff7e6" anchorX="center" anchorY="middle">
        {symbol}
      </Text>
      <Text position={[0, 0, -0.551]} rotation={[0, Math.PI, 0]} fontSize={0.26} color="#fff7e6" anchorX="center" anchorY="middle">
        {symbol}
      </Text>
    </group>
  )
}

export function PirateEmblemDicePoker({ position }: { position: Vec3 }) {
  const [state, setState] = useInstanceState<DicePokerState>(SESSION_KEY, EMPTY_STATE)
  const { localUser } = useUsers()
  const clock = useServerClock({ require: 'motion' })
  const { coins, ready, busy, transact } = useCasinoEconomy()
  const { play } = useCasinoAudio()
  const [betAmount, setBetAmount] = useState<number>(2)
  const now = useRoundClock()
  const complete = roundIsComplete(state, now)
  const countdown = state.phase === 'running' ? countdownSeconds(state.startedAt, now) : 0
  const playerCount = Object.keys(state.bets).length
  const localBet = localUser ? state.bets[localUser.id] : undefined
  const hand = classifyDicePoker(state.dice)
  const localPayout = localBet ? dicePokerTotalReturn(localBet.amount, state.dice) : 0
  const audioPlayedRef = useRef(new Set<string>())

  useCasinoRoundSettlement({
    game: 'dice-poker',
    state,
    choiceCount: 1,
    winReason: `紋章ダイス・${HAND_LABELS[hand]}`,
    fixedPayout: localPayout,
  })

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0) return
    const token = `${state.roundId}:${state.startedAt}`
    const cancel: Array<() => void> = []
    const countdownToken = `${token}:countdown`
    if (!audioPlayedRef.current.has(countdownToken)) {
      cancel.push(scheduleAtServerTime(state.startedAt - 3000, clock.now, () => {
        if (audioPlayedRef.current.has(countdownToken)) return
        audioPlayedRef.current.add(countdownToken)
        play('countdown')
      }))
    }
    const rollToken = `${token}:roll`
    if (!audioPlayedRef.current.has(rollToken)) {
      cancel.push(scheduleAtServerTime(state.startedAt, clock.now, () => {
        if (audioPlayedRef.current.has(rollToken)) return
        audioPlayedRef.current.add(rollToken)
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

  const placeBet = async () => {
    if (!localUser || state.phase !== 'betting' || localBet) return
    if (!canJoinRound(state.bets, localUser.id) || coins < betAmount) return
    const next = await transact(-betAmount, '紋章ダイスポーカー・参加')
    if (next === null) return
    const bet: CasinoRoundBet = {
      userId: localUser.id,
      userName: localUser.displayName,
      choice: 0,
      amount: betAmount,
    }
    setState((previous) => previous.phase === 'betting'
      ? { ...previous, bets: { ...previous.bets, [localUser.id]: bet } }
      : previous)
    play('bet')
  }

  const advanceRound = () => {
    if (complete) {
      setState({ ...EMPTY_STATE, roundId: state.roundId + 1 })
      return
    }
    if (state.phase !== 'betting' || playerCount === 0) return
    const startedAt = clock.now() + COUNTDOWN_MS
    setState({
      ...state,
      phase: 'running',
      startedAt,
      dice: [
        seededResult(startedAt ^ (state.roundId * 7919), 6),
        seededResult(startedAt ^ (state.roundId * 15401) ^ 0x5a5a, 6),
        seededResult(startedAt ^ (state.roundId * 31337) ^ 0xa5a5, 6),
      ],
    })
  }

  const statusLines = complete
    ? [`結果：${HAND_LABELS[hand]}　払戻 ${localPayout}枚`, '7秒後に受付へ戻ります']
    : countdown > 0
      ? [`BET締切・振るまで ${countdown}秒`, '全員が同じ3個のダイスを見ます']
      : state.phase === 'running'
        ? ['紋章ダイスを振っています', '止まった3個で役を判定']
        : [`受付中 ${playerCount}/8人`, localBet ? `${localBet.amount}枚で参加確定` : `${betAmount}枚を仮選択`]

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.92}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[13.5, 0.16, 11.5]} />
          <meshStandardMaterial color="#3b3026" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.55, -1.2]} castShadow>
          <boxGeometry args={[5.6, 0.95, 3.4]} />
          <meshStandardMaterial color="#67422f" roughness={0.85} />
        </mesh>
      </RigidBody>
      <mesh position={[0, 1.06, -1.2]} receiveShadow>
        <boxGeometry args={[5.4, 0.08, 3.2]} />
        <meshStandardMaterial color="#27645b" roughness={0.8} />
      </mesh>
      {state.dice.map((value, index) => (
        <EmblemDie key={`emblem-die-${index}`} index={index} value={value} state={state} serverNow={clock.now} />
      ))}
      <JapanesePanel
        position={[0, 4.2, -2.75]}
        width={6.8}
        height={1.25}
        title="海賊紋章・3ダイスポーカー"
        lines={statusLines}
        accent={0x45b7d1}
        background={0x172033}
      />
      <JapanesePanel
        position={[-4.7, 2.55, -3.15]}
        rotation={[0, 0.28, 0]}
        width={3.25}
        height={2.1}
        title="配当表（払戻合計）"
        lines={['一組 1.5倍', '連番 2倍', '三つ揃い 4倍', '理論還元率 95.8%']}
        accent={0xf6c453}
      />
      <Text position={[0, 0.2, 3.25]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color="#fff1b8" anchorX="center">
        掛け金を選ぶ → 参加確定 → 5秒後に振る
      </Text>
      {CASINO_BALANCE.dicePoker.betOptions.map((amount, index) => (
        <GroundStakePad
          key={`dice-poker-bet-${amount}`}
          id={`dice-poker-bet-${amount}`}
          position={[-4.7 + index * 1.25, 0.11, 4.45]}
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
        id="dice-poker-confirm"
        label={localBet ? '参加済み' : '参加確定'}
        detail={localBet ? `${localBet.amount}枚 支払済` : `${betAmount}枚を支払う`}
        position={[0.25, 0.11, 4.45]}
        color="#2f7f75"
        enabled={ready && !busy && state.phase === 'betting' && !localBet && coins >= betAmount && playerCount < 8}
        onPress={() => void placeBet()}
      />
      <GroundActionPad
        id="dice-poker-start"
        label={complete ? '受付へ戻す' : countdown > 0 ? `${countdown}秒` : state.phase === 'running' ? '判定中' : 'ダイスを振る'}
        detail={state.phase === 'betting' ? `${playerCount}/8人・押すと5秒後` : 'BET締切'}
        position={[2.95, 0.11, 4.45]}
        color="#8b4d7f"
        enabled={(complete || (state.phase === 'betting' && playerCount > 0)) && !busy}
        onPress={advanceRound}
      />
      <pointLight position={[0, 5.5, -0.5]} intensity={5.5} distance={14} color="#87e5da" />
    </group>
  )
}
