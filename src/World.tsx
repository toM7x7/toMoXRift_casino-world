import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { SpawnPoint } from '@xrift/world-components'
import { Suspense, useRef } from 'react'
import type { Group, PointLight } from 'three'
import { BlackjackTable } from './components/BlackjackTable'
import {
  CasinoEconomyProvider,
  CasinoHud,
  useCasinoEconomy,
} from './components/CasinoEconomy'
import {
  CasinoButton,
  CasinoNpc,
} from './components/CasinoPrimitives'
import { CaptainsFateWheel } from './components/CaptainsFateWheel'
import {
  CasinoAudioControl,
  CasinoAudioProvider,
} from './components/CasinoAudio'
import { MahjongTable } from './components/MahjongTable'
import { PirateMonsterDerby } from './components/PirateMonsterDerby'
import {
  AnimatedPalm,
  FadedMapProp,
  PirateBarrel,
  RotatingGoldCoin,
} from './components/PirateNationAssets'
import { Skybox } from './components/Skybox'
import pirateLayout from './design/pirate-nation-layout-v12.json'
import layout from './design/sandbox-layout-v9.json'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
  showHud?: boolean
  showSpawn?: boolean
  reviewGame?: 'blackjack' | 'mahjong'
}

type Vec3 = [number, number, number]
const vec3 = (value: number[]) => value as Vec3
const palette = layout.palette
const blackjackBuilding = layout.buildings[0]
const mahjongBuilding = layout.buildings[1]
const exchangeBuilding = layout.buildings[2]

function Block({
  position,
  size,
  color,
  emissive,
  emissiveIntensity = 0,
  castShadow = true,
  receiveShadow = true,
}: {
  position: Vec3
  size: Vec3
  color: string
  emissive?: string
  emissiveIntensity?: number
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        roughness={0.88}
        metalness={0.02}
      />
    </mesh>
  )
}

function BlockTree({ position, tint = '#668f46' }: { position: Vec3; tint?: string }) {
  return (
    <group position={position}>
      <Block position={[0, 1.2, 0]} size={[0.55, 2.4, 0.55]} color={palette.wood} />
      <Block position={[0, 2.65, 0]} size={[2, 1.2, 2]} color={tint} />
      <Block position={[-0.55, 3.35, 0]} size={[1.1, 0.9, 1.2]} color="#739f4d" />
      <Block position={[0.55, 3.35, 0]} size={[1.1, 0.9, 1.2]} color="#5c813f" />
    </group>
  )
}

function SwayingLanternHead({
  accent,
  phase,
}: {
  accent: string
  phase: number
}) {
  const headRef = useRef<Group>(null)
  const lightRef = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime() + phase
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(elapsed * 0.85) * 0.045
      headRef.current.rotation.x = Math.cos(elapsed * 0.63) * 0.018
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3.25 + Math.sin(elapsed * 2.1) * 0.28
    }
  })

  return (
    <group ref={headRef} position={[0, 1.55, 0]}>
      <Block position={[0, 0, 0]} size={[0.58, 0.58, 0.58]} color={accent} emissive={accent} emissiveIntensity={0.8} />
      <Block position={[0, 0.35, 0]} size={[0.72, 0.12, 0.72]} color={palette.wood} />
      <pointLight ref={lightRef} position={[0, 0.05, 0]} intensity={3.25} distance={7} color="#ffd98a" />
    </group>
  )
}

function LanternPost({
  position,
  accent = palette.amber,
  phase = 0,
}: {
  position: Vec3
  accent?: string
  phase?: number
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.9}>
      <group position={position}>
        <Block position={[0, 0.75, 0]} size={[0.2, 1.5, 0.2]} color={palette.wood} />
        <SwayingLanternHead accent={accent} phase={phase} />
      </group>
    </RigidBody>
  )
}

function IslandShell() {
  const edgeHeight = 0.55
  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <Skybox />
      <fog attach="fog" args={[palette.fog, 42, 72]} />
      <ambientLight intensity={0.92} color="#dacdff" />
      <hemisphereLight intensity={1.18} color="#afc8ff" groundColor="#513d42" />
      <directionalLight
        position={[-8, 14, 10]}
        intensity={1.65}
        color="#ffd39a"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />

      <RigidBody type="fixed" colliders={false} restitution={0} friction={0.92}>
        <CuboidCollider
          args={vec3(layout.buildPlate.collider.halfExtents)}
          position={vec3(layout.buildPlate.collider.position)}
        />
        <Block
          position={vec3(layout.buildPlate.position)}
          size={vec3(layout.buildPlate.size)}
          color={palette.grass}
        />
      </RigidBody>

      <Block position={[0, -0.48, 0]} size={[56, 0.66, 42]} color={palette.dirt} />
      <Block position={[0, -0.86, 0]} size={[54, 0.18, 40]} color={palette.stone} />

      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.9}>
        <Block position={[-27.75, edgeHeight / 2, 0]} size={[0.5, edgeHeight, 42]} color={palette.stone} />
        <Block position={[27.75, edgeHeight / 2, 0]} size={[0.5, edgeHeight, 42]} color={palette.stone} />
        <Block position={[0, edgeHeight / 2, -20.75]} size={[55, edgeHeight, 0.5]} color={palette.stone} />
        <Block position={[0, edgeHeight / 2, 20.75]} size={[55, edgeHeight, 0.5]} color={palette.stone} />
      </RigidBody>

      <mesh position={[0, 0.008, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 32]} />
        <meshStandardMaterial color={palette.stone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[42, 4]} />
        <meshStandardMaterial color="#7d858f" roughness={0.95} />
      </mesh>
      <mesh position={[-7.5, 0.012, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 0.3]} />
        <meshStandardMaterial color={palette.blackjack} emissive={palette.blackjack} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[-15, 0.012, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 3]} />
        <meshStandardMaterial color={palette.blackjack} emissive={palette.blackjack} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[7.5, 0.012, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 0.3]} />
        <meshStandardMaterial color={palette.mahjong} emissive={palette.mahjong} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[15, 0.012, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 3]} />
        <meshStandardMaterial color={palette.mahjong} emissive={palette.mahjong} emissiveIntensity={0.08} />
      </mesh>

      <BlockTree position={[-7, 0, -16]} tint="#739f4d" />
      <BlockTree position={[7, 0, -16]} tint="#5c813f" />
      {layout.villageSquare.lanternPosts.map((position, index) => (
        <LanternPost
          key={`lantern-${position.join('-')}`}
          position={vec3(position)}
          accent={index % 2 === 0 ? palette.amber : '#ffd98a'}
          phase={index * 0.72}
        />
      ))}
    </>
  )
}

function ExpansionRoutes() {
  return (
    <>
      <mesh position={[0, 0.014, -7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 3]} />
        <meshStandardMaterial color="#69717d" roughness={0.96} />
      </mesh>
      {[-17, 17].map((x, index) => (
        <group key={`expansion-route-${x}`}>
          <mesh position={[x, 0.016, -10.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3, 7]} />
            <meshStandardMaterial color="#7d858f" roughness={0.96} />
          </mesh>
          <mesh position={[x, 0.019, -10.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.24, 7]} />
            <meshStandardMaterial
              color={index === 0 ? '#f6c453' : '#45b7d1'}
              emissive={index === 0 ? '#f6c453' : '#45b7d1'}
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

function OpenAirGamingDeck({
  center,
  accent,
  label,
  japaneseLabel,
}: {
  center: Vec3
  accent: string
  label: string
  japaneseLabel: string
}) {
  return (
    <group position={center}>
      <Block position={[0, 0.04, 0]} size={[12, 0.08, 10]} color={accent} receiveShadow />
      <Block position={[0, 0.09, 0]} size={[11.4, 0.06, 9.4]} color={palette.grass} receiveShadow />
      {[
        [-5.35, -4.45],
        [5.35, -4.45],
        [-5.35, 4.45],
        [5.35, 4.45],
      ].map(([x, z]) => (
        <Block
          key={`deck-marker-${x}-${z}`}
          position={[x, 0.42, z]}
          size={[0.5, 0.84, 0.5]}
          color={accent}
        />
      ))}
      <Text
        position={[0, 0.145, 4.05]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.72}
        color="#fff7e6"
        anchorX="center"
        anchorY="middle"
      >
        {`${label} / ${japaneseLabel}・OPEN AIR`}
      </Text>
      <pointLight position={[0, 3.25, 0]} intensity={4.4} distance={11} color={accent} />
    </group>
  )
}

function CoinOre({ position, active = false }: { position: Vec3; active?: boolean }) {
  return (
    <group position={position}>
      <Block position={[0, 0.4, 0]} size={[0.9, 0.8, 0.9]} color={palette.stone} />
      <Block position={[-0.2, 0.52, 0.46]} size={[0.2, 0.2, 0.08]} color={active ? palette.amber : '#a98a4c'} emissive={active ? palette.amber : '#000000'} emissiveIntensity={active ? 0.8 : 0} />
      <Block position={[0.23, 0.25, 0.46]} size={[0.24, 0.2, 0.08]} color={active ? palette.amber : '#a98a4c'} emissive={active ? palette.amber : '#000000'} emissiveIntensity={active ? 0.8 : 0} />
    </group>
  )
}

function PirateMarketLandscape() {
  const barrelGroups = [
    pirateLayout.placements.blackjackBarrels,
    pirateLayout.placements.mahjongBarrels,
  ].flat()
  return (
    <Suspense fallback={null}>
      {pirateLayout.placements.animatedPalms.map((position, index) => (
        <AnimatedPalm
          key={`pirate-palm-${position.join('-')}`}
          position={vec3(position)}
          rotation={[0, [0.25, -0.4, 0.8, -0.7][index] ?? 0, 0]}
          scale={pirateLayout.assets.animatedPalm.scale}
          motion={index < 2 ? 'More Movement' : 'Single Fronds Moving'}
          phase={[0, 5.2, 10.4, 15.6][index] ?? 0}
        />
      ))}
      {barrelGroups.map((position, index) => (
        <PirateBarrel
          key={`pirate-barrel-${position.join('-')}`}
          position={vec3(position)}
          rotation={[0, [0.25, -0.35, -0.25, 0.35][index] ?? 0, 0]}
          scale={pirateLayout.assets.barrel.scale}
        />
      ))}
    </Suspense>
  )
}

function CoinExchange() {
  const { coins, ready, busy, claimRelief } = useCasinoEconomy()
  const eligible = coins === 0
  const center = vec3(exchangeBuilding.center)
  const accent = eligible ? palette.amber : '#8e7951'

  return (
    <group position={center}>
      <Block position={[0, 0.04, 0]} size={[8, 0.08, 5]} color={palette.amber} />
      <Block position={[0, 0.09, 0]} size={[7.5, 0.06, 4.5]} color={palette.grass} />
      <Block position={[-3.3, 1.65, -1.95]} size={[0.38, 3.3, 0.38]} color={palette.wood} />
      <Block position={[3.3, 1.65, -1.95]} size={[0.38, 3.3, 0.38]} color={palette.wood} />
      <Block position={[0, 3.15, -1.95]} size={[6.9, 0.38, 0.38]} color={palette.amber} />
      <Block position={[0, 0.5, 0.75]} size={[4.8, 1, 0.72]} color={palette.wood} />

      <Suspense fallback={(
        <mesh position={[0, 3.45, -1.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.78, 0.78, 0.28, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={eligible ? 0.75 : 0.05} roughness={0.76} flatShading />
        </mesh>
      )}>
        <RotatingGoldCoin position={[0, 3.45, -1.72]} />
        <PirateBarrel position={[-3.05, 0.64, -1.25]} rotation={[0, 0.25, 0]} />
        <PirateBarrel position={[3.05, 0.64, -1.25]} rotation={[0, -0.25, 0]} />
        <FadedMapProp position={[1.35, 1.035, 0.78]} />
      </Suspense>
      <pointLight position={[0, 2.7, 0]} intensity={7.2} distance={10} color="#ffd98a" />
      <CasinoNpc
        position={[0, 0, -0.72]}
        color="#c58b22"
        name="ミラ"
        role="村長・GM"
        accent={0xf6c453}
        animation={eligible ? '15_Waving_Right' : '02_Idle_2'}
        animationKey={coins}
        modelScale={2.52}
        showLabel={false}
      />
      <CasinoButton
        id="gm-relief-claim"
        label="ミラから10枚受取る"
        detail={eligible ? '残高0枚・受取できます' : '残高0枚で利用できます'}
        position={[0, 1.08, 1.14]}
        width={1.9}
        height={0.42}
        color="#c58b22"
        enabled={ready && !busy && eligible}
        onPress={() => void claimRelief()}
      />
      <CoinOre position={[-3.15, 0, 2.2]} active={eligible} />
      <CoinOre position={[3.15, 0, 2.2]} active={eligible} />
    </group>
  )
}

function SpawnMapBoard() {
  return (
    <group position={[4.2, 0, 9.5]} rotation={[0, -0.46, 0]} scale={0.82}>
      <Block position={[-2.2, 1.08, -0.12]} size={[0.24, 2.16, 0.24]} color={palette.wood} />
      <Block position={[2.2, 1.08, -0.12]} size={[0.24, 2.16, 0.24]} color={palette.wood} />
      <Block position={[0, 2.42, 0]} size={[5.35, 3.25, 0.18]} color={palette.amber} />
      <Block position={[0, 2.42, 0.105]} size={[5.12, 3.02, 0.12]} color={palette.dark} />

      <Text position={[0, 3.58, 0.18]} fontSize={0.32} color="#f6c453" anchorX="center">
        遊技村 全体地図
      </Text>
      <Text position={[0, 3.25, 0.18]} fontSize={0.17} color="#fff7e6" anchorX="center">
        色の道を歩いて遊技場へ
      </Text>

      <mesh position={[0, 2.23, 0.18]}>
        <boxGeometry args={[4.45, 1.65, 0.06]} />
        <meshStandardMaterial color={palette.grass} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.23, 0.22]}>
        <boxGeometry args={[0.48, 1.58, 0.04]} />
        <meshStandardMaterial color={palette.stone} />
      </mesh>
      <mesh position={[0, 2.32, 0.24]}>
        <boxGeometry args={[3.8, 0.25, 0.04]} />
        <meshStandardMaterial color="#7d858f" />
      </mesh>
      <mesh position={[-1.48, 2.48, 0.27]}>
        <boxGeometry args={[1.15, 0.72, 0.05]} />
        <meshStandardMaterial color={palette.blackjack} />
      </mesh>
      <mesh position={[1.48, 2.48, 0.27]}>
        <boxGeometry args={[1.15, 0.72, 0.05]} />
        <meshStandardMaterial color={palette.mahjong} />
      </mesh>
      <mesh position={[0, 1.68, 0.27]}>
        <boxGeometry args={[0.82, 0.36, 0.05]} />
        <meshStandardMaterial color={palette.amber} />
      </mesh>
      <mesh position={[-1.55, 1.7, 0.27]}>
        <boxGeometry args={[1.05, 0.42, 0.05]} />
        <meshStandardMaterial color={palette.dirt} />
      </mesh>
      <mesh position={[1.55, 1.7, 0.27]}>
        <boxGeometry args={[1.05, 0.42, 0.05]} />
        <meshStandardMaterial color={palette.dirt} />
      </mesh>

      <Text position={[-1.48, 2.5, 0.32]} fontSize={0.2} color="#fff7e6" anchorX="center">BJ</Text>
      <Text position={[1.48, 2.5, 0.32]} fontSize={0.2} color="#172033" anchorX="center">麻雀</Text>
      <Text position={[0, 1.69, 0.32]} fontSize={0.13} color="#172033" anchorX="center">交換所</Text>
      <Text position={[-1.55, 1.7, 0.32]} fontSize={0.11} color="#fff1b8" anchorX="center">A 運命盤</Text>
      <Text position={[1.55, 1.7, 0.32]} fontSize={0.11} color="#fff1b8" anchorX="center">B ダービー</Text>

      <mesh position={[0, 2.92, 0.3]}>
        <circleGeometry args={[0.12, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#f6c453" emissiveIntensity={0.8} />
      </mesh>
      <Text position={[0.52, 2.92, 0.32]} fontSize={0.13} color="#fff7e6" anchorX="center">
        現在地
      </Text>
    </group>
  )
}

export function World({
  position = [0, 0, 0],
  scale = 1,
  showHud = true,
  showSpawn = true,
  reviewGame,
}: WorldProps) {
  return (
    <CasinoEconomyProvider previewCoins={reviewGame ? 10 : undefined}>
      <CasinoAudioProvider>
        <group position={position} scale={scale}>
          <IslandShell />
          <ExpansionRoutes />
          <PirateMarketLandscape />
          <OpenAirGamingDeck
            center={vec3(blackjackBuilding.center)}
            accent={palette.blackjack}
            label="BJ"
            japaneseLabel="カード広場"
          />
          <OpenAirGamingDeck
            center={vec3(mahjongBuilding.center)}
            accent={palette.mahjong}
            label="MJ"
            japaneseLabel="牌広場"
          />
          <BlackjackTable
            position={vec3(blackjackBuilding.tableAnchor as number[])}
            autoStart={reviewGame === 'blackjack'}
          />
          <MahjongTable
            position={vec3(mahjongBuilding.tableAnchor as number[])}
            autoStart={reviewGame === 'mahjong'}
          />
          <CoinExchange />
          <CaptainsFateWheel position={vec3(layout.futurePlots[0].center)} />
          <PirateMonsterDerby position={vec3(layout.futurePlots[1].center)} />
          <SpawnMapBoard />
          <CasinoAudioControl position={[7.3, 1.04, 9.8]} />
          {showSpawn ? (
            <SpawnPoint position={vec3(layout.spawn.position)} yaw={layout.spawn.yaw} />
          ) : null}
        </group>
        {showHud ? <CasinoHud /> : null}
      </CasinoAudioProvider>
    </CasinoEconomyProvider>
  )
}

export default World
