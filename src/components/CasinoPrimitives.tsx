import { Billboard, Text } from '@react-three/drei'
import { Interactable } from '@xrift/world-components'
import { Suspense } from 'react'
import { AnimatedPirateModel } from './PirateNationAssets'
import { useWorldAssetUrl } from './useWorldAssetUrl'

const PIRATE_FORWARD_OFFSET = -Math.PI / 2
export const JAPANESE_FONT_PATH = 'fonts/MPLUS1p-Regular.ttf'

export function useJapaneseFontUrl() {
  return useWorldAssetUrl(JAPANESE_FONT_PATH)
}

interface CasinoButtonProps {
  id: string
  label: string
  detail?: string
  position: [number, number, number]
  color?: string
  enabled?: boolean
  width?: number
  height?: number
  labelFontSize?: number
  rotation?: [number, number, number]
  onPress: () => void
}

export function CasinoButton({
  id,
  label,
  detail,
  position,
  color = '#2C7A7B',
  enabled = true,
  width = 1.65,
  height = 0.62,
  labelFontSize,
  rotation = [0, 0, 0],
  onPress,
}: CasinoButtonProps) {
  const japaneseFontUrl = useJapaneseFontUrl()
  const faceColor = enabled ? color : '#475569'
  const titleY = detail ? 0.1 : 0

  return (
    <Interactable
      id={id}
      enabled={enabled}
      interactionText={label}
      onInteract={onPress}
    >
      <group position={position} rotation={rotation}>
        <mesh castShadow>
          <boxGeometry args={[width, height, 0.16]} />
          <meshStandardMaterial
            color={faceColor}
            emissive={enabled ? color : '#1e293b'}
            emissiveIntensity={enabled ? 0.16 : 0.02}
            metalness={0.04}
            roughness={0.72}
          />
        </mesh>
        <Text
          font={japaneseFontUrl}
          position={[0, titleY, 0.086]}
          fontSize={labelFontSize ?? Math.min(0.2, height * 0.28)}
          maxWidth={width * 0.88}
          color={enabled ? '#fff7e6' : '#94a3b8'}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
        {detail ? (
          <Text
            font={japaneseFontUrl}
            position={[0, -0.16, 0.087]}
            fontSize={Math.min(0.105, height * 0.15)}
            maxWidth={width * 0.9}
            color={enabled ? '#fff1b8' : '#64748b'}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            {detail}
          </Text>
        ) : null}
      </group>
    </Interactable>
  )
}

export function JapanesePanel({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  title,
  lines = [],
  accent = 0x52d6d3,
  background = 0x162033,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  width: number
  height: number
  title: string
  lines?: string[]
  accent?: number
  background?: number
}) {
  const japaneseFontUrl = useJapaneseFontUrl()
  const titleY = lines.length > 0 ? height * 0.22 : 0
  const lineSpacing = Math.min(0.24, height * 0.2)
  const startY = lines.length === 1 ? -height * 0.2 : -height * 0.08

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial color={accent} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0, 0.068]}>
        <boxGeometry args={[Math.max(0.1, width - 0.1), Math.max(0.1, height - 0.1), 0.1]} />
        <meshStandardMaterial color={background} roughness={0.84} />
      </mesh>
      <Text
        font={japaneseFontUrl}
        position={[0, titleY, 0.125]}
        fontSize={Math.min(0.34, height * 0.27)}
        maxWidth={width * 0.88}
        color={accent}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
      {lines.map((line, index) => (
        <Text
          font={japaneseFontUrl}
          key={`${line}-${index}`}
          position={[0, startY - index * lineSpacing, 0.126]}
          fontSize={Math.min(index === 0 ? 0.18 : 0.15, height * 0.15)}
          maxWidth={width * 0.9}
          color={index === 0 ? '#fff7e6' : '#dbeafe'}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
        >
          {line}
        </Text>
      ))}
    </group>
  )
}

export function JapaneseSign({
  position,
  rotation = [0, 0, 0],
  label,
  detail,
  width = 5,
  height = 0.9,
  accent = 0x52d6d3,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  label: string
  detail?: string
  width?: number
  height?: number
  accent?: number
}) {
  return (
    <JapanesePanel
      position={position}
      rotation={rotation}
      width={width}
      height={height}
      title={label}
      lines={detail ? [detail] : []}
      accent={accent}
      background={0x111827}
    />
  )
}

export function NpcLabel({
  position,
  name,
  role,
  accent = 0x52d6d3,
}: {
  position: [number, number, number]
  name: string
  role: string
  accent?: number
}) {
  return (
    <Billboard position={position}>
      <JapanesePanel
        position={[0, 0, 0]}
        width={1.8}
        height={0.52}
        title={name}
        lines={[role]}
        accent={accent}
        background={0x111827}
      />
    </Billboard>
  )
}

export function CasinoNpc({
  position,
  color,
  name,
  role,
  accent,
  animation = '02_Idle_2',
  repeatAnimation = true,
  animationKey,
  modelScale = 2.72,
  showLabel = true,
  facingYaw = 0,
}: {
  position: [number, number, number]
  color: string
  name: string
  role: string
  accent?: number
  animation?: string
  repeatAnimation?: boolean
  animationKey?: string | number
  modelScale?: number
  showLabel?: boolean
  facingYaw?: number
}) {
  return (
    <group position={position} rotation={[0, facingYaw, 0]}>
      <Suspense fallback={<PrimitiveCasinoNpc color={color} />}>
        <AnimatedPirateModel
          rotation={[0, PIRATE_FORWARD_OFFSET, 0]}
          scale={modelScale}
          clip={animation}
          repeat={repeatAnimation}
          playKey={animationKey}
        />
      </Suspense>
      {showLabel ? (
        <NpcLabel position={[0, 2.35, 0]} name={name} role={role} accent={accent} />
      ) : null}
    </group>
  )
}

function PrimitiveCasinoNpc({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.72, 0.9, 0.42]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.77, 0]} castShadow>
        <boxGeometry args={[0.64, 0.58, 0.58]} />
        <meshStandardMaterial color="#d9ad88" roughness={0.88} />
      </mesh>
      <mesh position={[0, 2.02, -0.03]} castShadow>
        <boxGeometry args={[0.68, 0.16, 0.62]} />
        <meshStandardMaterial color="#3b2c26" roughness={0.9} />
      </mesh>
      <mesh position={[-0.16, 1.82, 0.296]}>
        <boxGeometry args={[0.07, 0.07, 0.025]} />
        <meshBasicMaterial color="#172033" />
      </mesh>
      <mesh position={[0.16, 1.82, 0.296]}>
        <boxGeometry args={[0.07, 0.07, 0.025]} />
        <meshBasicMaterial color="#172033" />
      </mesh>
      <mesh position={[-0.47, 1.08, 0]} castShadow>
        <boxGeometry args={[0.18, 0.78, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0.47, 1.08, 0]} castShadow>
        <boxGeometry args={[0.18, 0.78, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[-0.2, 0.38, 0]} castShadow>
        <boxGeometry args={[0.25, 0.52, 0.34]} />
        <meshStandardMaterial color="#2b3443" roughness={0.86} />
      </mesh>
      <mesh position={[0.2, 0.38, 0]} castShadow>
        <boxGeometry args={[0.25, 0.52, 0.34]} />
        <meshStandardMaterial color="#2b3443" roughness={0.86} />
      </mesh>
    </>
  )
}

export function CasinoStool({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.72, 0.18, 0.72]} />
        <meshStandardMaterial color="#493526" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.18, 0.58, 0.18]} />
        <meshStandardMaterial color="#805a3b" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.56, 0.1, 0.56]} />
        <meshStandardMaterial color="#69717d" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function CasinoSeat({
  id,
  position,
  rotation = [0, 0, 0],
  enabled,
  occupied,
  onSit,
}: {
  id: string
  position: [number, number, number]
  rotation?: [number, number, number]
  enabled: boolean
  occupied: boolean
  onSit: () => void
}) {
  return (
    <Interactable
      id={id}
      enabled={enabled}
      interactionText={occupied ? '使用中' : 'この椅子に座る'}
      onInteract={onSit}
    >
      <group position={position} rotation={rotation}>
        <CasinoStool position={[0, 0, 0]} />
        <mesh position={[0, 1.02, 0.3]} castShadow>
          <boxGeometry args={[0.78, 0.86, 0.14]} />
          <meshStandardMaterial
            color={occupied ? '#69717d' : '#493526'}
            emissive={enabled ? '#f6c453' : '#000000'}
            emissiveIntensity={enabled ? 0.16 : 0}
            roughness={0.86}
          />
        </mesh>
      </group>
    </Interactable>
  )
}
