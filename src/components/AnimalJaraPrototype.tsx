import { Text, useTexture } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Interactable } from '@xrift/world-components'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NearestFilter, SRGBColorSpace, type Texture } from 'three'
import {
  createAnimalJaraWall,
  dealAnimalJara,
  discardAnimalJaraTile,
  drawAnimalJaraTile,
  getAnimalJaraEmblem,
  isWinningAnimalJaraHand,
  suggestAnimalJaraDiscard,
} from '../game/animalJara'
import { CasinoButton, JAPANESE_FONT_URL, JapanesePanel } from './CasinoPrimitives'

type Vec3 = [number, number, number]
type AnimalJaraPhase = 'lobby' | 'player-turn' | 'ron-window' | 'finished' | 'draw'

interface AnimalJaraPrototypeState {
  phase: AnimalJaraPhase
  wall: string[]
  hands: string[][]
  discards: string[][]
  message: string
  winner?: string
  lastDiscard?: { seat: number; tile: string }
  nextNpcSeat: number
}

const EMPTY_STATE: AnimalJaraPrototypeState = {
  phase: 'lobby',
  wall: [],
  hands: [[], [], [], []],
  discards: [[], [], [], []],
  message: '参加するとNPC3人が入り、すぐに配牌します（β・無料）',
  nextNpcSeat: 1,
}

const SEAT_NAMES = ['あなた', 'NPCミケ', 'NPCクジラ丸', 'NPCフクロウ船長']
const HABITAT_LABEL = { land: '陸', sea: '海', sky: '空' } as const
const HABITAT_COLOR = { land: '#e85d5d', sea: '#3296d8', sky: '#d6a83d' } as const

function TextureCrop({ source, tileId }: { source: Texture; tileId: string }) {
  const emblem = getAnimalJaraEmblem(tileId)
  const texture = useMemo(() => {
    const cropped = source.clone()
    cropped.repeat.set(1 / 4, 1 / 3)
    cropped.offset.set((emblem?.cell[0] ?? 0) / 4, (2 - (emblem?.cell[1] ?? 0)) / 3)
    cropped.magFilter = NearestFilter
    cropped.minFilter = NearestFilter
    cropped.colorSpace = SRGBColorSpace
    cropped.needsUpdate = true
    return cropped
  }, [emblem?.cell, source])

  useEffect(() => () => texture.dispose(), [texture])

  return <meshBasicMaterial map={texture} transparent alphaTest={0.02} />
}

function TileBody({
  atlas,
  tileId,
  scale = 1,
  selected = false,
}: {
  atlas: Texture
  tileId: string
  scale?: number
  selected?: boolean
}) {
  const emblem = getAnimalJaraEmblem(tileId)
  const habitat = emblem?.habitat ?? 'land'
  return (
    <group scale={scale}>
      <mesh position={[0, selected ? 0.1 : 0.06, 0]} castShadow>
        <boxGeometry args={[0.82, selected ? 0.2 : 0.12, 1.12]} />
        <meshStandardMaterial color={selected ? '#fff8d6' : '#f2dfb5'} roughness={0.76} />
      </mesh>
      <mesh position={[0, selected ? 0.205 : 0.125, -0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.68, 0.78]} />
        <TextureCrop source={atlas} tileId={tileId} />
      </mesh>
      <mesh position={[0, selected ? 0.212 : 0.132, 0.43]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.2]} />
        <meshStandardMaterial color={HABITAT_COLOR[habitat]} roughness={0.8} />
      </mesh>
      <Text
        font={JAPANESE_FONT_URL}
        position={[0, selected ? 0.22 : 0.14, 0.43]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.12}
        color="#172033"
        anchorX="center"
        anchorY="middle"
      >
        {`${emblem?.name ?? '?'}・${HABITAT_LABEL[habitat]}`}
      </Text>
    </group>
  )
}

function AnimalTile({
  atlas,
  tileId,
  position,
  scale,
  enabled = false,
  id,
  onPress,
}: {
  atlas: Texture
  tileId: string
  position: Vec3
  scale?: number
  enabled?: boolean
  id?: string
  onPress?: () => void
}) {
  const body = (
    <group position={position}>
      <TileBody atlas={atlas} tileId={tileId} scale={scale} selected={enabled} />
    </group>
  )
  if (!id || !onPress) return body
  return (
    <Interactable id={id} enabled={enabled} interactionText="この牌を捨てる" onInteract={onPress}>
      {body}
    </Interactable>
  )
}

function PrototypeTable({ children }: { children: ReactNode }) {
  return (
    <group>
      <RigidBody type="fixed" colliders={false} restitution={0} friction={0.92}>
        <CuboidCollider args={[5.3, 0.43, 3.8]} position={[0, 0.46, 0]} />
      </RigidBody>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[10.6, 0.86, 7.6]} />
        <meshStandardMaterial color="#65442f" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.92, 0]} receiveShadow>
        <boxGeometry args={[10.1, 0.08, 7.1]} />
        <meshStandardMaterial color="#25665d" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <ringGeometry args={[1.45, 1.58, 8]} />
        <meshStandardMaterial color="#e7c66b" emissive="#e7c66b" emissiveIntensity={0.12} />
      </mesh>
      {children}
    </group>
  )
}

function createStartedState(): AnimalJaraPrototypeState {
  const deal = dealAnimalJara(createAnimalJaraWall())
  const playerDraw = drawAnimalJaraTile(deal.hands[0], deal.wall)
  if (!playerDraw) return { ...EMPTY_STATE, phase: 'draw', message: '牌山を作れませんでした' }
  const hands = deal.hands.map((hand) => [...hand])
  hands[0] = playerDraw.hand
  return {
    phase: 'player-turn',
    hands,
    wall: playerDraw.wall,
    discards: [[], [], [], []],
    message: isWinningAnimalJaraHand(playerDraw.hand)
      ? '9枚完成です。「ツモ」を押してください'
      : '黄色く浮いた手牌を1枚選んで捨てます',
    nextNpcSeat: 1,
  }
}

export function AnimalJaraPrototype({
  position,
  rotation = [0, 0, 0],
  autoStart = false,
}: {
  position: Vec3
  rotation?: Vec3
  autoStart?: boolean
}) {
  const atlas = useTexture('/design/animal-emblem-atlas-v31.png')
  atlas.magFilter = NearestFilter
  atlas.minFilter = NearestFilter
  atlas.colorSpace = SRGBColorSpace
  const [state, setState] = useState<AnimalJaraPrototypeState>(() => autoStart ? createStartedState() : EMPTY_STATE)

  const finishNpcSequence = (source: AnimalJaraPrototypeState, startingSeat: number): AnimalJaraPrototypeState => {
    const next: AnimalJaraPrototypeState = {
      ...source,
      hands: source.hands.map((hand) => [...hand]),
      wall: [...source.wall],
      discards: source.discards.map((tiles) => [...tiles]),
      lastDiscard: undefined,
    }
    for (let seat = startingSeat; seat <= 3; seat += 1) {
      const drawn = drawAnimalJaraTile(next.hands[seat], next.wall)
      if (!drawn) return { ...next, phase: 'draw', message: '牌山がなくなったため流局です' }
      next.hands[seat] = drawn.hand
      next.wall = drawn.wall
      if (isWinningAnimalJaraHand(drawn.hand)) {
        return { ...next, phase: 'finished', winner: SEAT_NAMES[seat], message: `${SEAT_NAMES[seat]}がツモで完成しました` }
      }
      const discard = discardAnimalJaraTile(drawn.hand, suggestAnimalJaraDiscard(drawn.hand))
      if (!discard) return { ...next, phase: 'draw', message: 'NPCの捨て牌処理に失敗しました' }
      next.hands[seat] = discard.hand
      next.discards[seat].push(discard.discarded)
      next.lastDiscard = { seat, tile: discard.discarded }
      if (isWinningAnimalJaraHand([...next.hands[0], discard.discarded])) {
        return {
          ...next,
          phase: 'ron-window',
          message: `${SEAT_NAMES[seat]}の捨て牌で完成できます。「ロン」か「見送る」を選択`,
          nextNpcSeat: seat + 1,
        }
      }
    }
    const playerDraw = drawAnimalJaraTile(next.hands[0], next.wall)
    if (!playerDraw) return { ...next, phase: 'draw', message: '牌山がなくなったため流局です' }
    next.hands[0] = playerDraw.hand
    next.wall = playerDraw.wall
    return {
      ...next,
      phase: 'player-turn',
      nextNpcSeat: 1,
      message: isWinningAnimalJaraHand(playerDraw.hand)
        ? '9枚完成です。「ツモ」を押してください'
        : 'あなたの番です。1枚選んで捨てます',
    }
  }

  const discardPlayerTile = (index: number) => {
    setState((current) => {
      if (current.phase !== 'player-turn' || isWinningAnimalJaraHand(current.hands[0])) return current
      const discard = discardAnimalJaraTile(current.hands[0], index)
      if (!discard) return current
      const staged: AnimalJaraPrototypeState = {
        ...current,
        hands: [discard.hand, ...current.hands.slice(1)],
        discards: [[...current.discards[0], discard.discarded], ...current.discards.slice(1)],
        lastDiscard: { seat: 0, tile: discard.discarded },
      }
      return finishNpcSequence(staged, 1)
    })
  }

  const claimTsumo = () => {
    setState((current) => current.phase === 'player-turn' && isWinningAnimalJaraHand(current.hands[0])
      ? { ...current, phase: 'finished', winner: SEAT_NAMES[0], message: 'ツモ！ 3組完成です' }
      : current)
  }

  const claimRon = () => {
    setState((current) => current.phase === 'ron-window' && current.lastDiscard
      && isWinningAnimalJaraHand([...current.hands[0], current.lastDiscard.tile])
      ? {
          ...current,
          phase: 'finished',
          winner: SEAT_NAMES[0],
          hands: [[...current.hands[0], current.lastDiscard.tile], ...current.hands.slice(1)],
          message: `ロン！ ${SEAT_NAMES[current.lastDiscard.seat]}の捨て牌で3組完成です`,
        }
      : current)
  }

  const passRon = () => setState((current) => current.phase === 'ron-window'
    ? finishNpcSequence(current, current.nextNpcSeat)
    : current)

  const playerCanTsumo = state.phase === 'player-turn' && isWinningAnimalJaraHand(state.hands[0])
  const latestDiscards = state.discards.flatMap((tiles, seat) => tiles.slice(-2).map((tile) => ({ tile, seat })))

  return (
    <group position={position} rotation={rotation}>
      <PrototypeTable>
        <Text font={JAPANESE_FONT_URL} position={[0, 1.02, -2.85]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color="#fff1b8" anchorX="center">
          NPC3人は自動進行・ポン/チーなし・ロン/ツモのみ
        </Text>
        {state.hands[0].map((tileId, index) => (
          <AnimalTile
            key={`player-tile-${index}-${tileId}`}
            atlas={atlas}
            tileId={tileId}
            position={[(index - (state.hands[0].length - 1) / 2) * 0.94, 0.99, 2.35]}
            enabled={state.phase === 'player-turn' && !playerCanTsumo}
            id={`animal-jara-tile-${index}`}
            onPress={() => discardPlayerTile(index)}
          />
        ))}
        {latestDiscards.map(({ tile, seat }, index) => (
          <AnimalTile
            key={`discard-${seat}-${index}-${tile}`}
            atlas={atlas}
            tileId={tile}
            position={[(index % 4 - 1.5) * 0.66, 1.01, -0.55 + Math.floor(index / 4) * 0.86]}
            scale={0.66}
          />
        ))}
        {[1, 2, 3].map((seat) => (
          <group key={`npc-seat-${seat}`} position={seat === 1 ? [-3.75, 0, -1.9] : seat === 2 ? [0, 0, -2.25] : [3.75, 0, -1.9]}>
            <mesh position={[0, 1.22, 0]} castShadow>
              <boxGeometry args={[2.15, 0.16, 0.72]} />
              <meshStandardMaterial color="#263449" roughness={0.8} />
            </mesh>
            <Text font={JAPANESE_FONT_URL} position={[0, 1.33, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.15} color="#dbeafe" anchorX="center">
              {`${SEAT_NAMES[seat]}　${state.hands[seat].length}枚`}
            </Text>
          </group>
        ))}
      </PrototypeTable>

      <JapanesePanel
        position={[0, 3.65, -3.55]}
        width={7.6}
        height={1.5}
        title="アニマルじゃら βテスト"
        lines={[state.message, `牌山 ${state.wall.length}枚 / 現在はコイン増減なし`]}
        accent={0xf6c453}
      />
      <JapanesePanel
        position={[-5.75, 2.7, -1.2]}
        rotation={[0, 0.42, 0]}
        width={3.3}
        height={2.3}
        title="完成ルール"
        lines={['9枚を3枚組×3にする', '同じ動物3枚', 'または同じ生息地の別3種', '引く→1枚捨てる']}
        accent={0x45b7d1}
      />

      <CasinoButton
        id="animal-jara-start"
        label={state.phase === 'lobby' ? '参加して配牌' : 'もう一局'}
        detail="βテスト・無料"
        position={[-2.25, 1.55, 3.62]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={2.45}
        enabled={state.phase === 'lobby' || state.phase === 'finished' || state.phase === 'draw'}
        onPress={() => setState(createStartedState())}
      />
      <CasinoButton
        id="animal-jara-win"
        label={state.phase === 'ron-window' ? 'ロン' : 'ツモ'}
        detail="9枚が3組なら完成"
        position={[0.55, 1.55, 3.62]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={2.25}
        color="#c2415b"
        enabled={state.phase === 'ron-window' || playerCanTsumo}
        onPress={state.phase === 'ron-window' ? claimRon : claimTsumo}
      />
      <CasinoButton
        id="animal-jara-pass"
        label="見送る"
        detail="ロンせず次へ"
        position={[3.15, 1.55, 3.62]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={2.25}
        color="#486581"
        enabled={state.phase === 'ron-window'}
        onPress={passRon}
      />
      <pointLight position={[0, 6, 1]} intensity={6} distance={16} color="#fff0b5" />
    </group>
  )
}
