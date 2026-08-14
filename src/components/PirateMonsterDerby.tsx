import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useInstanceState, useUsers } from '@xrift/world-components'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  canJoinRound,
  CASINO_BET_OPTIONS,
  choiceBetTotals,
  seededResult,
  type CasinoRoundBet,
} from '../game/casinoRounds'
import { useCasinoAudio } from './CasinoAudio'
import { useCasinoEconomy } from './CasinoEconomy'
import {
  BettingConsole,
  BetReceipt,
  BetTargetPad,
  ChipStakePile,
  TableActionPad,
} from './BettingTablePrimitives'
import { JapanesePanel } from './CasinoPrimitives'
import { HippogriffRacerModel } from './PirateNationAssets'
import {
  roundIsComplete,
  useCasinoRoundSettlement,
  useRoundClock,
  type FormalCasinoRoundState,
} from './useCasinoRound'

type Vec3 = [number, number, number]

interface DerbyRoundState extends FormalCasinoRoundState {}

const SESSION_KEY = 'casino.pirate-monster-derby.round.v2'
const EMPTY_STATE: DerbyRoundState = {
  roundId: 1,
  phase: 'betting',
  startedAt: 0,
  durationMs: 18000,
  resultIndex: 0,
  bets: {},
}

const LANE_COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#45b7d1']
const LANE_LABELS = ['紅牙', '金角', '翠翼', '蒼雷']
const LANE_X = [34.8, 37.6, 40.4, 43.2]
const START_Z = -24
const FINISH_Z = 24

function Block({
  position,
  size,
  color,
  emissive,
  emissiveIntensity = 0,
}: {
  position: Vec3
  size: Vec3
  color: string
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        roughness={0.88}
      />
    </mesh>
  )
}

function PrimitiveRacer({ color }: { color: string }) {
  return (
    <group>
      <Block position={[0, 0.75, 0]} size={[1.35, 0.7, 1.9]} color={color} />
      <Block position={[0, 1.35, 0.72]} size={[0.85, 0.72, 0.8]} color="#d7c2a0" />
      <Block position={[-0.62, 0.28, -0.55]} size={[0.25, 0.62, 0.28]} color="#493526" />
      <Block position={[0.62, 0.28, -0.55]} size={[0.25, 0.62, 0.28]} color="#493526" />
      <Block position={[-0.62, 0.28, 0.55]} size={[0.25, 0.62, 0.28]} color="#493526" />
      <Block position={[0.62, 0.28, 0.55]} size={[0.25, 0.62, 0.28]} color="#493526" />
    </group>
  )
}

function DerbyRacer({
  lane,
  state,
}: {
  lane: number
  state: DerbyRoundState
}) {
  const racerRef = useRef<Group>(null)
  const color = LANE_COLORS[lane]
  const winner = state.resultIndex
  const rank = (lane - winner + LANE_COLORS.length) % LANE_COLORS.length
  const finishFactor = 0.86 + rank * 0.045

  useFrame(({ clock }) => {
    if (!racerRef.current) return
    const elapsed = state.phase === 'running' && state.startedAt > 0 ? Date.now() - state.startedAt : 0
    const rawProgress = state.phase === 'running' && state.startedAt > 0
      ? Math.min(1, Math.max(0, elapsed / (state.durationMs * finishFactor)))
      : 0
    const surge = Math.sin(rawProgress * Math.PI * (2.2 + lane * 0.17))
      * 0.025
      * (1 - rawProgress)
    const progress = Math.min(1, Math.max(0, rawProgress ** 0.92 + surge))
    racerRef.current.position.set(
      LANE_X[lane],
      0.62 + Math.sin(clock.getElapsedTime() * 7.2 + lane) * (rawProgress > 0 && rawProgress < 1 ? 0.12 : 0.035),
      START_Z + (FINISH_Z - START_Z) * progress,
    )
    racerRef.current.rotation.z = rawProgress > 0 && rawProgress < 1
      ? Math.sin(clock.getElapsedTime() * 4.4 + lane) * 0.035
      : 0
  })

  return (
    <group ref={racerRef} position={[LANE_X[lane], 0.62, START_Z]}>
      <Suspense fallback={<group scale={0.72}><PrimitiveRacer color={color} /></group>}>
        <HippogriffRacerModel
          rotation={[0, Math.PI, 0]}
          scale={0.072}
          tint={color}
          phase={lane * 0.42}
        />
      </Suspense>
      <Block position={[0, 2.22, 0]} size={[0.08, 1.05, 0.08]} color="#493526" />
      <mesh position={[0.29, 2.49, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.54, 0.36]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} side={2} />
      </mesh>
    </group>
  )
}

function EntryPad({ index, bet }: { index: number; bet?: CasinoRoundBet }) {
  const radius = 4.18
  const angle = index * (Math.PI / 4)
  const x = Math.sin(angle) * radius
  const z = Math.cos(angle) * radius
  const color = bet ? LANE_COLORS[bet.choice] : '#59606b'
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, 0.12, 0]} size={[1.05, 0.22, 1.05]} color={color} emissive={color} emissiveIntensity={0.12} />
      <Text position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={bet ? 0.14 : 0.15} color={bet ? '#172033' : '#fff7e6'} anchorX="center">
        {bet ? `${bet.userName.slice(0, 5)}\n${bet.amount}枚` : `ENTRY ${index + 1}`}
      </Text>
    </group>
  )
}

function VotingPlaza({
  state,
  selectedLane,
  betAmount,
  localBet,
  complete,
  ready,
  busy,
  coins,
  onSelectLane,
  onSelectAmount,
  onPlaceBet,
  onAdvanceRound,
}: {
  state: DerbyRoundState
  selectedLane: number
  betAmount: number
  localBet?: CasinoRoundBet
  complete: boolean
  ready: boolean
  busy: boolean
  coins: number
  onSelectLane: (lane: number) => void
  onSelectAmount: (amount: number) => void
  onPlaceBet: () => void
  onAdvanceRound: () => void
}) {
  const bets = Object.values(state.bets)
  const playerCount = bets.length
  const betTotals = choiceBetTotals(state.bets, LANE_COLORS.length)
  const statusLines = state.phase === 'betting'
    ? [
        'ENTRYは参加枠・中央の4魔獣から選択',
        `${playerCount}/8人・的中時は賭け金×4` + (localBet ? `・あなた:${LANE_LABELS[localBet.choice]}${localBet.amount}枚` : ''),
      ]
    : complete
      ? [`勝者：${LANE_LABELS[state.resultIndex]}`, '払戻後「次の受付」へ']
      : ['正式レース進行中…', `${playerCount}人のBETを同期`]
  const receiptMain = complete
    ? `勝者 ${LANE_LABELS[state.resultIndex]}`
    : localBet
      ? `${LANE_LABELS[localBet.choice]} 単勝 ${localBet.amount}枚`
      : `${LANE_LABELS[selectedLane]} 単勝 ${betAmount}枚（仮票）`
  const receiptDetail = localBet
    ? `投票券発行済み・第${state.roundId}レース・参加${playerCount}/8人`
    : '出走枠とチップ山を触って選択・的中時×4'

  return (
    <group>
      <Block position={[0, 0.05, 0]} size={[12, 0.1, 10]} color="#263e43" />
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[3.5, 4.75, 8, 2]} />
        <meshStandardMaterial color="#6b6f67" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[2.15, 2.15, 0.78, 8]} />
        <meshStandardMaterial color="#493526" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[1.72, 1.72, 0.1, 8]} />
        <meshStandardMaterial color="#d7ad42" emissive="#f6c453" emissiveIntensity={0.12} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <EntryPad key={`derby-entry-${index}`} index={index} bet={bets[index]} />
      ))}
      <JapanesePanel
        position={[0, 2.2, -4.55]}
        width={5.5}
        height={1.22}
        title="海賊魔獣ダービー"
        lines={statusLines}
        accent={0x45b7d1}
        background={0x172033}
      />
      <BettingConsole
        position={[0, 1.78, 2.05]}
        width={6.9}
        height={3.9}
        accent="#45b7d1"
        title="公認ブックメーカー　単勝投票台"
      >
        {LANE_COLORS.map((color, lane) => (
          <BetTargetPad
            key={`lane-choice-${lane}`}
            id={`derby-lane-${lane}`}
            position={[-2.4 + lane * 1.6, 0.63, 0.22]}
            label={`${lane + 1} ${LANE_LABELS[lane]}`}
            total={betTotals[lane]}
            color={color}
            textColor={lane === 1 ? '#172033' : '#fff7e6'}
            selected={selectedLane === lane || localBet?.choice === lane}
            enabled={state.phase === 'betting' && !localBet}
            width={1.42}
            onSelect={() => onSelectLane(lane)}
          />
        ))}
        {CASINO_BET_OPTIONS.map((amount, index) => (
          <ChipStakePile
            key={`derby-bet-${amount}`}
            id={`derby-bet-amount-${amount}`}
            position={[-1.2 + index * 1.2, -0.26, 0.22]}
            amount={amount}
            selected={betAmount === amount}
            enabled={state.phase === 'betting' && !localBet}
            onSelect={() => onSelectAmount(amount)}
          />
        ))}
        <BetReceipt
          position={[-1.7, -1.2, 0.22]}
          title="あなたの単勝投票券"
          main={receiptMain}
          detail={receiptDetail}
          accent={localBet ? LANE_COLORS[localBet.choice] : LANE_COLORS[selectedLane]}
        />
        <TableActionPad
          id="derby-confirm-bet"
          label={localBet ? '投票済み' : '投票券を発行'}
          detail={localBet ? `${localBet.amount}枚 確定` : `${LANE_LABELS[selectedLane]}・${betAmount}枚`}
          position={[0.72, -1.2, 0.22]}
          color="#2c7a7b"
          enabled={ready && !busy && state.phase === 'betting' && !localBet && coins >= betAmount && playerCount < 8}
          onPress={onPlaceBet}
        />
        <TableActionPad
          id="derby-round-control"
          label={complete ? '次レース受付' : state.phase === 'running' ? 'レース中' : '発走レバー'}
          detail={state.phase === 'betting' ? `${playerCount}/8人 投票中` : complete ? '払戻を確認' : `第${state.roundId}レース`}
          position={[2.62, -1.2, 0.22]}
          color="#a3632d"
          enabled={(complete || (state.phase === 'betting' && playerCount > 0)) && !busy}
          onPress={onAdvanceRound}
        />
      </BettingConsole>
    </group>
  )
}

function ObservationDeck() {
  const viewZ = [-7.2, -5.15, -3.1, -1.05, 1.05, 3.1, 5.15, 7.2]
  const rampAngle = Math.atan2(0.6, 3)
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
        <Block position={[13, 0.35, 0]} size={[8, 0.5, 18]} color="#69717d" />
        <Block position={[16.86, 1.42, 0]} size={[0.22, 0.18, 18]} color="#493526" />
        {[-8.55, -6, -3, 0, 3, 6, 8.55].map((z) => (
          <Block key={`east-rail-post-${z}`} position={[16.86, 1.01, z]} size={[0.22, 0.82, 0.22]} color="#493526" />
        ))}
        {[-8.86, 8.86].map((z) => (
          <group key={`side-rail-${z}`}>
            <Block position={[13, 1.42, z]} size={[8, 0.18, 0.22]} color="#493526" />
            {[9.2, 11.6, 14.2, 16.75].map((x) => (
              <Block key={`side-post-${z}-${x}`} position={[x, 1.01, z]} size={[0.22, 0.82, 0.22]} color="#493526" />
            ))}
          </group>
        ))}
        {[-6, 6].map((z) => (
          <group key={`west-rail-${z}`}>
            <Block position={[9.14, 1.42, z]} size={[0.22, 0.18, 5.7]} color="#493526" />
            {[z - 2.6, z, z + 2.6].map((postZ) => (
              <Block key={`west-post-${postZ}`} position={[9.14, 1.01, postZ]} size={[0.22, 0.82, 0.22]} color="#493526" />
            ))}
          </group>
        ))}
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
        <group position={[7.5, 0.3, 0]} rotation={[0, 0, rampAngle]}>
          <Block position={[0, 0, 0]} size={[Math.sqrt(9.36), 0.18, 4]} color="#8a7a63" />
          <Block position={[0, 0, -2.08]} size={[3.08, 0.62, 0.14]} color="#493526" />
          <Block position={[0, 0, 2.08]} size={[3.08, 0.62, 0.14]} color="#493526" />
        </group>
      </RigidBody>

      {viewZ.map((z, index) => (
        <group key={`view-position-${index}`}>
          <Block
            position={[10.2, 0.64, z]}
            size={[1.15, 0.06, 1.38]}
            color={LANE_COLORS[index % LANE_COLORS.length]}
            emissive={LANE_COLORS[index % LANE_COLORS.length]}
            emissiveIntensity={0.08}
          />
          <Text position={[10.2, 0.69, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.19} color="#172033" anchorX="center">
            {`観覧 ${index + 1}`}
          </Text>
        </group>
      ))}
      <Text position={[10.95, 0.69, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.28} color="#fff7e6" anchorX="center">
        全景ライン
      </Text>
      <JapanesePanel
        position={[9.28, 2.1, -6.1]}
        rotation={[0, -Math.PI / 2, 0]}
        width={4.4}
        height={0.98}
        title="自由観覧デッキ"
        lines={['STARTもGOALも右手に見える']}
        accent={0xf6c453}
        background={0x172033}
      />
      {[-7, 0, 7].map((z) => (
        <Block key={`deck-support-${z}`} position={[13, -1.35, z]} size={[0.55, 3.4, 0.55]} color="#493526" />
      ))}
    </>
  )
}

function RaceCourse({ state }: { state: DerbyRoundState }) {
  const laneOffsets = [-4.2, -1.4, 1.4, 4.2]
  return (
    <group>
      <Block position={[39, 0.24, 0]} size={[11.8, 0.44, 50.6]} color="#493526" />
      {laneOffsets.map((offset, index) => (
        <Block
          key={`course-lane-${index}`}
          position={[39 + offset, 0.5, 0]}
          size={[2.35, 0.08, 50]}
          color={LANE_COLORS[index]}
          emissive={LANE_COLORS[index]}
          emissiveIntensity={0.04}
        />
      ))}
      {[-16, -8, 0, 8, 16].map((z) => (
        <group key={`course-band-${z}`}>
          <Block position={[39, 0.58, z]} size={[11.4, 0.08, 0.18]} color="#fff7e6" />
          <Block position={[39, -1.8, z]} size={[0.52, 4.1, 0.52]} color="#493526" />
        </group>
      ))}
      {[START_Z, FINISH_Z].map((z, gateIndex) => (
        <group key={`course-gate-${z}`}>
          <Block position={[33, 2.3, z]} size={[0.38, 4.1, 0.38]} color="#493526" />
          <Block position={[45, 2.3, z]} size={[0.38, 4.1, 0.38]} color="#493526" />
          <Block position={[39, 4.2, z]} size={[12.4, 0.42, 0.42]} color={gateIndex === 0 ? '#45b7d1' : '#f6c453'} emissive={gateIndex === 0 ? '#45b7d1' : '#f6c453'} emissiveIntensity={0.22} />
          <Text
            position={[39, 4.23, z + (gateIndex === 0 ? 0.24 : -0.24)]}
            rotation={[0, gateIndex === 0 ? 0 : Math.PI, 0]}
            fontSize={0.7}
            color="#fff7e6"
            anchorX="center"
          >
            {gateIndex === 0 ? 'START / 発走' : 'GOAL / 決着'}
          </Text>
        </group>
      ))}
      {LANE_COLORS.map((_, lane) => (
        <DerbyRacer key={`derby-racer-${lane}`} lane={lane} state={state} />
      ))}
      <pointLight position={[39, 7, 0]} intensity={8} distance={46} color="#d7e8ff" />
    </group>
  )
}

export function PirateMonsterDerby({ position }: { position: Vec3 }) {
  const [state, setState] = useInstanceState<DerbyRoundState>(SESSION_KEY, EMPTY_STATE)
  const { localUser } = useUsers()
  const { coins, ready, busy, transact } = useCasinoEconomy()
  const { play } = useCasinoAudio()
  const [selectedLane, setSelectedLane] = useState(0)
  const [betAmount, setBetAmount] = useState<number>(1)
  const now = useRoundClock()
  const complete = roundIsComplete(state, now)
  const playerCount = Object.keys(state.bets).length
  const localBet = localUser ? state.bets[localUser.id] : undefined
  const heardRoundRef = useRef('')

  useCasinoRoundSettlement({
    game: 'derby',
    state,
    choiceCount: LANE_COLORS.length,
    winReason: 'ダービー的中',
  })

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0) return
    const token = `${state.roundId}:${state.startedAt}`
    if (heardRoundRef.current === token) return
    heardRoundRef.current = token
    play('race')
  }, [play, state.phase, state.roundId, state.startedAt])

  const selectLane = (lane: number) => {
    if (state.phase !== 'betting' || localBet) return
    setSelectedLane(lane)
    play('select')
  }

  const placeBet = async () => {
    if (!localUser || state.phase !== 'betting' || localBet) return
    if (!canJoinRound(state.bets, localUser.id) || coins < betAmount) return
    const next = await transact(-betAmount, `ダービー・${LANE_LABELS[selectedLane]}にBET`)
    if (next === null) return
    const bet: CasinoRoundBet = {
      userId: localUser.id,
      userName: localUser.displayName,
      choice: selectedLane,
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
    const startedAt = Date.now() + 250
    setState({
      ...state,
      phase: 'running',
      startedAt,
      resultIndex: seededResult(startedAt ^ (state.roundId * 104729), LANE_COLORS.length),
    })
  }

  return (
    <group position={position}>
      <VotingPlaza
        state={state}
        selectedLane={selectedLane}
        betAmount={betAmount}
        localBet={localBet}
        complete={complete}
        ready={ready}
        busy={busy}
        coins={coins}
        onSelectLane={selectLane}
        onSelectAmount={(amount) => {
          setBetAmount(amount)
          play('select')
        }}
        onPlaceBet={() => void placeBet()}
        onAdvanceRound={advanceRound}
      />
      <ObservationDeck />
      <group position={[-6, -1.35, 0]}>
        <RaceCourse state={state} />
      </group>
    </group>
  )
}
