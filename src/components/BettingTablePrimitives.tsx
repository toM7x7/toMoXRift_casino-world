import { Text } from '@react-three/drei'
import { Interactable } from '@xrift/world-components'
import type { ReactNode } from 'react'

type Vec3 = [number, number, number]

export function BettingConsole({
  position,
  width,
  height,
  accent,
  title,
  children,
}: {
  position: Vec3
  width: number
  height: number
  accent: string
  title: string
  children: ReactNode
}) {
  return (
    <group position={position}>
      <mesh position={[0, -1, 0.62]} castShadow>
        <boxGeometry args={[width * 0.82, 1.8, 0.34]} />
        <meshStandardMaterial color="#493526" roughness={0.9} />
      </mesh>
      <group rotation={[-Math.PI / 3.25, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[width, height, 0.24]} />
          <meshStandardMaterial color="#261d2c" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[width - 0.18, height - 0.18, 0.08]} />
          <meshStandardMaterial color="#24423d" roughness={0.94} />
        </mesh>
        <mesh position={[0, height / 2 - 0.16, 0.2]}>
          <boxGeometry args={[width - 0.2, 0.18, 0.1]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.22} />
        </mesh>
        <Text
          position={[0, height / 2 - 0.42, 0.21]}
          fontSize={0.22}
          color="#fff7e6"
          anchorX="center"
        >
          {title}
        </Text>
        {children}
      </group>
    </group>
  )
}

export function BetTargetPad({
  id,
  position,
  label,
  total,
  color,
  textColor = '#fff7e6',
  selected,
  enabled,
  width = 1.3,
  onSelect,
}: {
  id: string
  position: Vec3
  label: string
  total: number
  color: string
  textColor?: string
  selected: boolean
  enabled: boolean
  width?: number
  onSelect: () => void
}) {
  return (
    <Interactable id={id} enabled={enabled} interactionText={`${label}に賭ける`} onInteract={onSelect}>
      <group position={position}>
        <mesh position={[0, 0, selected ? 0.08 : 0.03]} castShadow>
          <boxGeometry args={[width, 0.62, selected ? 0.22 : 0.12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? 0.62 : 0.08}
            roughness={0.78}
          />
        </mesh>
        <Text
          position={[0, 0.11, selected ? 0.205 : 0.1]}
          fontSize={0.17}
          maxWidth={width * 0.9}
          color={textColor}
          anchorX="center"
        >
          {`${label}${selected ? ' ✓' : ''}`}
        </Text>
        <Text
          position={[0, -0.16, selected ? 0.206 : 0.101]}
          fontSize={0.125}
          color={textColor}
          anchorX="center"
        >
          {`合計 ${total}枚`}
        </Text>
      </group>
    </Interactable>
  )
}

export function ChipStakePile({
  id,
  position,
  amount,
  selected,
  enabled,
  onSelect,
}: {
  id: string
  position: Vec3
  amount: number
  selected: boolean
  enabled: boolean
  onSelect: () => void
}) {
  return (
    <Interactable id={id} enabled={enabled} interactionText={`${amount}枚チップを選ぶ`} onInteract={onSelect}>
      <group position={position}>
        <mesh position={[0, -0.12, 0.03]} castShadow>
          <boxGeometry args={[0.82, 0.72, 0.1]} />
          <meshStandardMaterial color={selected ? '#7d5a25' : '#493526'} roughness={0.86} />
        </mesh>
        {Array.from({ length: amount }, (_, index) => (
          <mesh key={index} position={[0, 0.06, 0.16 + index * 0.055]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.052, 16]} />
            <meshStandardMaterial
              color={selected ? '#f6c453' : '#d7ad42'}
              emissive={selected ? '#f6c453' : '#000000'}
              emissiveIntensity={selected ? 0.28 : 0}
              roughness={0.42}
              metalness={0.28}
            />
          </mesh>
        ))}
        <Text position={[0, -0.3, 0.11]} fontSize={0.14} color="#fff7e6" anchorX="center">
          {`${amount}枚`}
        </Text>
      </group>
    </Interactable>
  )
}

export function BetReceipt({
  position,
  title,
  main,
  detail,
  accent,
}: {
  position: Vec3
  title: string
  main: string
  detail: string
  accent: string
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.7, 0.78, 0.1]} />
        <meshStandardMaterial color="#f5e6c8" roughness={0.92} />
      </mesh>
      <mesh position={[-1.25, 0, 0.07]}>
        <boxGeometry args={[0.12, 0.62, 0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} />
      </mesh>
      <Text position={[-1.08, 0.21, 0.07]} fontSize={0.11} color="#5c4933" anchorX="left">
        {title}
      </Text>
      <Text position={[-1.08, -0.02, 0.07]} fontSize={0.18} maxWidth={2.15} color="#172033" anchorX="left">
        {main}
      </Text>
      <Text position={[-1.08, -0.25, 0.07]} fontSize={0.105} maxWidth={2.15} color="#6b5b4b" anchorX="left">
        {detail}
      </Text>
    </group>
  )
}

export function TableActionPad({
  id,
  position,
  label,
  detail,
  color,
  enabled,
  onPress,
}: {
  id: string
  position: Vec3
  label: string
  detail: string
  color: string
  enabled: boolean
  onPress: () => void
}) {
  const faceColor = enabled ? color : '#475569'
  return (
    <Interactable id={id} enabled={enabled} interactionText={label} onInteract={onPress}>
      <group position={position}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.8, 0.18]} />
          <meshStandardMaterial color="#2d241c" roughness={0.86} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[1.58, 0.58, 0.14]} />
          <meshStandardMaterial color={faceColor} emissive={faceColor} emissiveIntensity={enabled ? 0.2 : 0.02} roughness={0.68} />
        </mesh>
        <Text position={[0, 0.1, 0.2]} fontSize={0.16} color={enabled ? '#fff7e6' : '#94a3b8'} anchorX="center">
          {label}
        </Text>
        <Text position={[0, -0.16, 0.2]} fontSize={0.1} maxWidth={1.42} color={enabled ? '#fff1b8' : '#64748b'} anchorX="center">
          {detail}
        </Text>
      </group>
    </Interactable>
  )
}
