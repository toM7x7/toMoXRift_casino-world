import { Text, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { SpawnPoint } from '@xrift/world-components'
import { Suspense, useEffect, useRef, useState } from 'react'
import { NearestFilter, SRGBColorSpace, type Group, type PointLight } from 'three'
import { BlackjackTable } from './components/BlackjackTable'
import { AnimalJaraPrototype } from './components/AnimalJaraPrototype'
import {
  CasinoEconomyProvider,
  CasinoHud,
  useCasinoEconomy,
} from './components/CasinoEconomy'
import {
  CasinoButton,
  CasinoNpc,
  JAPANESE_FONT_URL,
  JapanesePanel,
} from './components/CasinoPrimitives'
import { CaptainsFateWheel } from './components/CaptainsFateWheel'
import { CasinoAdminObservatory } from './components/CasinoAdminObservatory'
import { CasinoAdminTransit } from './components/CasinoAdminTransit'
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
import { canClaimRelief } from './game/economy'
import {
  minimumConvertibleRifAmount,
  quoteCasinoWithdrawal,
  quoteRifExchange,
  RIF_EXCHANGE_CONFIG,
} from './game/rifExchange'
import pirateLayout from './design/pirate-nation-layout-v12.json'
import expansionDesign from './design/casino-rules-expansion-v30.json'
import animalEmblemDesign from './design/animal-emblem-games-v31.json'
import layout from './design/sandbox-layout-v9.json'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
  showHud?: boolean
  showSpawn?: boolean
  reviewGame?: 'blackjack' | 'mahjong'
  reviewScene?: 'admin' | 'admin-access' | 'animal-jara'
}

type Vec3 = [number, number, number]
const vec3 = (value: number[]) => value as Vec3
const palette = layout.palette
const blackjackBuilding = layout.buildings[0]
const mahjongBuilding = layout.buildings[1]
const exchangeBuilding = layout.buildings[2]
const westHarbor = expansionDesign.westHarbor

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
        shadow-camera-left={-54}
        shadow-camera-right={62}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
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
        <Block position={[-27.75, edgeHeight / 2, -11.5]} size={[0.5, edgeHeight, 19]} color={palette.stone} />
        <Block position={[-27.75, edgeHeight / 2, 11.5]} size={[0.5, edgeHeight, 19]} color={palette.stone} />
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

function ClosedConstructionPlot({
  center,
  footprint,
  code,
  title,
  concept,
  accent,
  signFacesSouth,
}: {
  center: Vec3
  footprint: [number, number]
  code: string
  title: string
  concept: string
  accent: string
  signFacesSouth: boolean
}) {
  const halfWidth = footprint[0] / 2
  const halfDepth = footprint[1] / 2
  const signZ = signFacesSouth ? halfDepth + 0.42 : -halfDepth - 0.42
  return (
    <group position={center}>
      <Block position={[0, 0.06, 0]} size={[footprint[0], 0.12, footprint[1]]} color="#8b6a43" receiveShadow />
      <Block position={[0, 0.13, 0]} size={[footprint[0] - 0.6, 0.05, footprint[1] - 0.6]} color="#526748" receiveShadow />
      <RigidBody type="fixed" colliders={false} restitution={0} friction={0.92}>
        <CuboidCollider args={[halfWidth, 0.7, 0.16]} position={[0, 0.7, -halfDepth]} />
        <CuboidCollider args={[halfWidth, 0.7, 0.16]} position={[0, 0.7, halfDepth]} />
        <CuboidCollider args={[0.16, 0.7, halfDepth]} position={[-halfWidth, 0.7, 0]} />
        <CuboidCollider args={[0.16, 0.7, halfDepth]} position={[halfWidth, 0.7, 0]} />
      </RigidBody>
      <Block position={[0, 0.7, -halfDepth]} size={[footprint[0], 1.4, 0.32]} color="#8d3f3f" />
      <Block position={[0, 0.7, halfDepth]} size={[footprint[0], 1.4, 0.32]} color="#8d3f3f" />
      <Block position={[-halfWidth, 0.7, 0]} size={[0.32, 1.4, footprint[1]]} color="#8d3f3f" />
      <Block position={[halfWidth, 0.7, 0]} size={[0.32, 1.4, footprint[1]]} color="#8d3f3f" />
      {[-halfWidth + 0.18, halfWidth - 0.18].flatMap((x) => (
        [-halfDepth + 0.18, halfDepth - 0.18].map((z) => (
          <group key={`construction-stake-${code}-${x}-${z}`} position={[x, 0, z]}>
            <Block position={[0, 1.15, 0]} size={[0.28, 2.3, 0.28]} color={palette.wood} />
            <Block position={[0, 2.25, 0]} size={[0.62, 0.22, 0.62]} color={accent} emissive={accent} emissiveIntensity={0.32} />
          </group>
        ))
      ))}
      <Block position={[0, 0.22, 0]} size={[Math.min(9.5, footprint[0] - 2), 0.18, Math.min(6.8, footprint[1] - 2)]} color="#75543a" />
      <Text position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.72} color="#fff1b8" anchorX="center">
        {`FACILITY ${code} / 建築予定地`}
      </Text>
      <Text position={[0, 0.35, 1.15]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#dbeafe" anchorX="center">
        {concept}
      </Text>
      <JapanesePanel
        position={[0, 2.45, signZ]}
        rotation={[0, signFacesSouth ? 0 : Math.PI, 0]}
        width={5.7}
        height={1.45}
        title={title}
        lines={['現在は設計中・立入禁止', '動物紋章とルール確定後に建築開始']}
        accent={Number.parseInt(accent.slice(1), 16)}
      />
    </group>
  )
}

function AnimalEmblemPreviewBoard() {
  const texture = useTexture('/design/animal-emblem-atlas-v31.png')
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace
  return (
    <group>
      <Block position={[-45.2, 2.55, 0]} size={[0.2, 4.25, 5.3]} color="#172033" />
      <mesh position={[-45.08, 2.42, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4.65, 3.49]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} />
      </mesh>
      <Text position={[-44.95, 4.22, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.27} color="#fff1b8" anchorX="center">
        共通動物紋章・デザイン中
      </Text>
    </group>
  )
}

function WestHarborExpansion() {
  const center = westHarbor.center
  const size = westHarbor.size
  return (
    <group>
      <RigidBody type="fixed" colliders={false} restitution={0} friction={0.92}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={vec3(center)} />
        <CuboidCollider args={[0.25, 0.3, 19]} position={[-45.75, 0.3, 0]} />
        <CuboidCollider args={[9, 0.3, 0.25]} position={[-37, 0.3, -18.75]} />
        <CuboidCollider args={[9, 0.3, 0.25]} position={[-37, 0.3, 18.75]} />
      </RigidBody>
      <Block position={vec3(center)} size={vec3(size)} color="#6f8a4c" />
      <Block position={[center[0], -0.5, center[2]]} size={[size[0] - 0.6, 0.4, size[2] - 0.6]} color={palette.dirt} />
      <Block position={[-45.75, 0.3, 0]} size={[0.5, 0.6, 38]} color={palette.stone} />
      <Block position={[-37, 0.3, -18.75]} size={[18, 0.6, 0.5]} color={palette.stone} />
      <Block position={[-37, 0.3, 18.75]} size={[18, 0.6, 0.5]} color={palette.stone} />
      <mesh position={[-32.5, 0.018, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[4.5, 9]} />
        <meshStandardMaterial color="#7d858f" roughness={0.95} />
      </mesh>
      <mesh position={[-37, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3, 36]} />
        <meshStandardMaterial color="#69717d" roughness={0.95} />
      </mesh>
      <JapanesePanel
        position={[-30.2, 2.35, 2.1]}
        rotation={[0, Math.PI / 2, 0]}
        width={4.1}
        height={1.35}
        title="西港・建築計画区画"
        lines={['C 動物紋章ダイス予定地', 'D アニマルじゃらβ・無料開放中']}
        accent={0x45b7d1}
      />
      <LanternPost position={[-30.4, 0, -2.2]} accent="#45b7d1" phase={1.2} />
      <LanternPost position={[-30.4, 0, 2.2]} accent="#f6c453" phase={2.4} />
      <LanternPost position={[-44.2, 0, -3]} accent="#45b7d1" phase={3.6} />
      <LanternPost position={[-44.2, 0, 3]} accent="#f6c453" phase={4.8} />
      <ClosedConstructionPlot
        center={vec3(animalEmblemDesign.facilities.C.center)}
        footprint={animalEmblemDesign.facilities.C.footprint as [number, number]}
        code="C"
        title="動物紋章ダイス・建築予定地"
        concept="共通動物紋章セットを設計中"
        accent="#45b7d1"
        signFacesSouth
      />
      <group position={vec3(animalEmblemDesign.facilities.D.center)}>
        <Block position={[0, 0.06, 0]} size={[14, 0.12, 12]} color="#8b6a43" receiveShadow />
        <Block position={[0, 0.13, 0]} size={[13.4, 0.05, 11.4]} color="#526748" receiveShadow />
        {[[-6.65, -5.65], [6.65, -5.65], [-6.65, 5.65], [6.65, 5.65]].map(([x, z]) => (
          <group key={`animal-jara-beta-marker-${x}-${z}`} position={[x, 0, z]}>
            <Block position={[0, 0.75, 0]} size={[0.24, 1.5, 0.24]} color={palette.wood} />
            <Block position={[0, 1.45, 0]} size={[0.5, 0.18, 0.5]} color="#f6c453" emissive="#f6c453" emissiveIntensity={0.35} />
          </group>
        ))}
      </group>
      <Suspense fallback={null}>
        <AnimalEmblemPreviewBoard />
      </Suspense>
    </group>
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
  const {
    coins,
    bonusCoins,
    redeemableCoins,
    ready,
    busy,
    claimRelief,
    rifBalance,
    rifReady,
    exchangeNotice,
    pendingExchangeAmount,
    pendingExchangeDirection,
    dailyRifIn,
    dailyRifOut,
    refreshRifBalance,
    convertRifToCasino,
    convertCasinoToRif,
  } = useCasinoEconomy()
  const [exchangeDirection, setExchangeDirection] = useState<'RIF_TO_CASINO' | 'CASINO_TO_RIF'>('RIF_TO_CASINO')
  const [exchangeAmount, setExchangeAmount] = useState(1)
  const minimumExchangeRif = minimumConvertibleRifAmount() ?? RIF_EXCHANGE_CONFIG.minimumRif
  const dailyRifTotal = dailyRifIn + dailyRifOut
  const effectiveMinimumRif = dailyRifTotal >= RIF_EXCHANGE_CONFIG.dailyLimitRif
    ? Number.POSITIVE_INFINITY
    : minimumExchangeRif
  const eligible = canClaimRelief(coins, rifBalance, rifReady, effectiveMinimumRif)
  const center = vec3(exchangeBuilding.center)
  const accent = eligible ? palette.amber : '#8e7951'
  const quote = exchangeDirection === 'RIF_TO_CASINO'
    ? quoteRifExchange(exchangeAmount)
    : quoteCasinoWithdrawal(exchangeAmount * RIF_EXCHANGE_CONFIG.casinoCoinUnits)
  const canExchange = ready
    && rifReady
    && !busy
    && quote !== null
    && (exchangeDirection === 'RIF_TO_CASINO'
      ? rifBalance !== null
        && rifBalance >= exchangeAmount
        && dailyRifTotal + exchangeAmount <= RIF_EXCHANGE_CONFIG.dailyLimitRif
      : redeemableCoins >= quote.casinoCoinAmount
        && dailyRifTotal + exchangeAmount <= RIF_EXCHANGE_CONFIG.dailyLimitRif)

  useEffect(() => {
    if (pendingExchangeAmount !== null) setExchangeAmount(pendingExchangeAmount)
    if (pendingExchangeDirection !== null) setExchangeDirection(pendingExchangeDirection)
  }, [pendingExchangeAmount, pendingExchangeDirection])

  const adjustExchangeAmount = (delta: number) => {
    setExchangeAmount((current) => Math.min(
      RIF_EXCHANGE_CONFIG.maximumRif,
      Math.max(RIF_EXCHANGE_CONFIG.minimumRif, current + delta),
    ))
  }

  return (
    <group position={center}>
      <Block position={[0, 0.04, 0]} size={[8, 0.08, 5]} color={palette.amber} />
      <Block position={[0, 0.09, 0]} size={[7.5, 0.06, 4.5]} color={palette.grass} />
      <Block position={[-3.3, 1.65, -1.95]} size={[0.38, 3.3, 0.38]} color={palette.wood} />
      <Block position={[3.3, 1.65, -1.95]} size={[0.38, 3.3, 0.38]} color={palette.wood} />
      <Block position={[0, 3.15, -1.95]} size={[6.9, 0.38, 0.38]} color={palette.amber} />
      <Block position={[0, 0.58, 0.75]} size={[6.4, 1.16, 0.72]} color={palette.wood} />

      <Suspense fallback={(
        <mesh position={[0, 3.9, -1.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 0.24, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={eligible ? 0.75 : 0.05} roughness={0.76} flatShading />
        </mesh>
      )}>
        <RotatingGoldCoin position={[0, 3.9, -1.55]} scale={0.055} />
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
      <JapanesePanel
        position={[0, 2.65, -1.7]}
        width={6.1}
        height={2.1}
        title="RIF ⇄ カジノコイン交換所"
        lines={[
          `1 RIF = 両替可能カジノコイン50枚（入出金とも同率）`,
          `RIF ${rifBalance ?? '—'}　合計${coins}枚（両替可能${redeemableCoins} / 遊技用${bonusCoins}）`,
          `本日 交換${dailyRifTotal}/5 RIF（入${dailyRifIn} / 出${dailyRifOut}）`,
          exchangeNotice,
        ]}
        accent={0xf6c453}
        background={0x172033}
      />

      {(['RIF_TO_CASINO', 'CASINO_TO_RIF'] as const).map((direction, index) => (
        <CasinoButton
          key={direction}
          id={`rif-direction-${direction.toLowerCase()}`}
          label={direction === 'RIF_TO_CASINO' ? 'RIFを入金' : 'コインを出金'}
          detail={direction === 'RIF_TO_CASINO' ? '1 RIF → 50枚' : '50枚 → 1 RIF'}
          position={[-2.1 + index * 1.55, 1.08, 1.15]}
          width={1.4}
          height={0.5}
          color={exchangeDirection === direction ? '#c58b22' : '#52657e'}
          enabled={!busy}
          onPress={() => setExchangeDirection(direction)}
        />
      ))}
      {[-1, 1].map((delta, index) => (
        <CasinoButton
          key={`rif-amount-${delta}`}
          id={`rif-amount-${delta > 0 ? 'plus' : 'minus'}`}
          label={delta > 0 ? '+1' : '−1'}
          position={[1.15 + index * 0.85, 1.08, 1.15]}
          width={0.72}
          height={0.5}
          color={delta > 0 ? '#2c7a7b' : '#8b4a59'}
          enabled={!busy}
          onPress={() => adjustExchangeAmount(delta)}
        />
      ))}
      <CasinoButton
        id="rif-balance-refresh"
        label="残高更新"
        position={[2.75, 1.08, 1.15]}
        width={1.05}
        height={0.5}
        color="#52657e"
        enabled={!busy}
        onPress={() => void refreshRifBalance()}
      />
      <CasinoButton
        id="rif-amount-all"
        label="上限まで"
        position={[-2.35, 0.48, 1.15]}
        width={1.2}
        height={0.5}
        color="#52657e"
        enabled={!busy && (exchangeDirection === 'RIF_TO_CASINO'
          ? rifBalance !== null && rifBalance >= minimumExchangeRif
          : redeemableCoins >= RIF_EXCHANGE_CONFIG.casinoCoinUnits)}
        onPress={() => setExchangeAmount(Math.max(1, Math.min(
          RIF_EXCHANGE_CONFIG.dailyLimitRif - dailyRifTotal,
          exchangeDirection === 'RIF_TO_CASINO'
            ? rifBalance ?? 1
            : Math.floor(redeemableCoins / RIF_EXCHANGE_CONFIG.casinoCoinUnits),
        )))}
      />
      <CasinoButton
        id="rif-to-casino-confirm"
        label={exchangeDirection === 'RIF_TO_CASINO'
          ? `${exchangeAmount} RIF → ${quote?.casinoCoinAmount ?? '—'}枚`
          : `${quote?.casinoCoinAmount ?? '—'}枚 → ${exchangeAmount} RIF`}
        detail="1日各5 RIFまで・手数料なし"
        position={[0.35, 0.48, 1.15]}
        width={3.8}
        height={0.5}
        labelFontSize={0.15}
        color="#c58b22"
        enabled={canExchange}
        onPress={() => void (exchangeDirection === 'RIF_TO_CASINO'
          ? convertRifToCasino(exchangeAmount)
          : convertCasinoToRif(exchangeAmount * RIF_EXCHANGE_CONFIG.casinoCoinUnits))}
      />
      <CasinoButton
        id="gm-relief-claim"
        label="救済10枚を受取る"
        detail={eligible
          ? 'ゲームもRIF交換もできないため受取可'
          : !rifReady
            ? 'RIF残高を確認中'
            : rifBalance !== null && rifBalance >= minimumExchangeRif
              ? '先にRIF交換を利用できます'
              : 'カジノ残高0枚で利用できます'}
        position={[0, 0.14, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={3}
        height={0.68}
        color="#c58b22"
        enabled={ready && !busy && eligible}
        onPress={() => void claimRelief()}
      />
      <CoinOre position={[-3.45, 0, 2]} active={eligible} />
      <CoinOre position={[3.45, 0, 2]} active={eligible} />
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
      <mesh position={[-2.02, 2.18, 0.275]}>
        <boxGeometry args={[0.55, 1.42, 0.05]} />
        <meshStandardMaterial color="#2f7f75" />
      </mesh>
      <mesh position={[1.55, 1.7, 0.27]}>
        <boxGeometry args={[1.05, 0.42, 0.05]} />
        <meshStandardMaterial color={palette.dirt} />
      </mesh>

      <Text position={[-1.48, 2.5, 0.32]} fontSize={0.2} color="#fff7e6" anchorX="center">BJ</Text>
      <Text position={[1.48, 2.5, 0.32]} fontSize={0.2} color="#172033" anchorX="center">麻雀β</Text>
      <Text position={[0, 1.69, 0.32]} fontSize={0.13} color="#172033" anchorX="center">交換所</Text>
      <Text position={[-1.55, 1.7, 0.32]} fontSize={0.11} color="#fff1b8" anchorX="center">A 運命盤</Text>
      <Text position={[1.55, 1.7, 0.32]} fontSize={0.11} color="#fff1b8" anchorX="center">B ダービー</Text>
      <Text font={JAPANESE_FONT_URL} position={[-2.02, 2.18, 0.33]} rotation={[0, 0, Math.PI / 2]} fontSize={0.085} color="#fff7e6" anchorX="center">C予定 / Dβ公開</Text>

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
  reviewScene,
}: WorldProps) {
  return (
    <CasinoEconomyProvider previewCoins={reviewGame || reviewScene ? 10 : undefined}>
      <CasinoAudioProvider>
        <group position={position} scale={scale}>
          <IslandShell />
          <ExpansionRoutes />
          <WestHarborExpansion />
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
            label="MJ β"
            japaneseLabel="無料研究卓"
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
          <Suspense fallback={null}>
            <AnimalJaraPrototype
              position={vec3(animalEmblemDesign.facilities.D.center)}
              rotation={[0, Math.PI, 0]}
              autoStart={reviewScene === 'animal-jara'}
            />
          </Suspense>
          <CasinoAdminObservatory preview={reviewScene === 'admin'} />
          <CasinoAdminTransit previewAuthorized={reviewScene === 'admin-access'} />
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
