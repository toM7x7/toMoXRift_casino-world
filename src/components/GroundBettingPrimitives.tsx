import { Text } from '@react-three/drei'
import { Interactable } from '@xrift/world-components'
import type { ReactNode } from 'react'

type Vec3 = [number, number, number]

export function GroundChoicePad({
  id,
  position,
  label,
  detail,
  color,
  textColor = '#fff7e6',
  selected,
  enabled,
  width = 1.55,
  depth = 1.05,
  onSelect,
}: {
  id: string
  position: Vec3
  label: string
  detail: string
  color: string
  textColor?: string
  selected: boolean
  enabled: boolean
  width?: number
  depth?: number
  onSelect: () => void
}) {
  return (
    <Interactable id={id} enabled={enabled} interactionText={`${label}を選ぶ`} onInteract={onSelect}>
      <group position={position}>
        <mesh position={[0, selected ? 0.18 : 0.12, 0]} castShadow>
          <boxGeometry args={[width, selected ? 0.28 : 0.18, depth]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? 0.5 : 0.08}
            roughness={0.72}
          />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <boxGeometry args={[width + 0.18, 0.07, depth + 0.18]} />
          <meshStandardMaterial color="#33271f" roughness={0.9} />
        </mesh>
        <Text position={[0, selected ? 0.335 : 0.23, -0.15]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.21} color={textColor} anchorX="center">
          {`${label}${selected ? ' ●' : ''}`}
        </Text>
        <Text position={[0, selected ? 0.34 : 0.235, 0.22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.125} color={textColor} anchorX="center">
          {detail}
        </Text>
      </group>
    </Interactable>
  )
}

export function GroundStakePad({
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
    <Interactable id={id} enabled={enabled} interactionText={`${amount}枚を選ぶ`} onInteract={onSelect}>
      <group position={position}>
        <mesh position={[0, selected ? 0.16 : 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, selected ? 0.26 : 0.16, 18]} />
          <meshStandardMaterial
            color={selected ? '#ffd166' : '#9a7430'}
            emissive="#ffd166"
            emissiveIntensity={selected ? 0.38 : 0.05}
            roughness={0.5}
            metalness={0.22}
          />
        </mesh>
        <Text position={[0, selected ? 0.305 : 0.195, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.23} color="#172033" anchorX="center">
          {`${amount}枚`}
        </Text>
      </group>
    </Interactable>
  )
}

export function GroundActionPad({
  id,
  position,
  label,
  detail,
  color,
  enabled,
  width = 2.15,
  onPress,
}: {
  id: string
  position: Vec3
  label: string
  detail: string
  color: string
  enabled: boolean
  width?: number
  onPress: () => void
}) {
  const faceColor = enabled ? color : '#4b5563'
  return (
    <Interactable id={id} enabled={enabled} interactionText={label} onInteract={onPress}>
      <group position={position}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <boxGeometry args={[width, 0.16, 1.05]} />
          <meshStandardMaterial color="#33271f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[width - 0.16, 0.14, 0.88]} />
          <meshStandardMaterial color={faceColor} emissive={faceColor} emissiveIntensity={enabled ? 0.24 : 0.02} roughness={0.68} />
        </mesh>
        <Text position={[0, 0.29, -0.15]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color={enabled ? '#fff7e6' : '#9ca3af'} anchorX="center">
          {label}
        </Text>
        <Text position={[0, 0.295, 0.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.115} color={enabled ? '#fff1b8' : '#6b7280'} anchorX="center">
          {detail}
        </Text>
      </group>
    </Interactable>
  )
}

export function TicketStand({
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
    <group position={position} rotation={[-Math.PI / 7, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[3.25, 1.16, 0.12]} />
        <meshStandardMaterial color="#f4e5c3" roughness={0.9} />
      </mesh>
      <mesh position={[-1.5, 0, 0.08]}>
        <boxGeometry args={[0.12, 0.95, 0.08]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} />
      </mesh>
      <Text position={[-1.31, 0.37, 0.08]} fontSize={0.13} color="#6b5135" anchorX="left">{title}</Text>
      <Text position={[-1.31, 0.04, 0.08]} fontSize={0.22} maxWidth={2.65} color="#172033" anchorX="left">{main}</Text>
      <Text position={[-1.31, -0.34, 0.08]} fontSize={0.115} maxWidth={2.65} color="#655847" anchorX="left">{detail}</Text>
    </group>
  )
}

export function MiniatureBetPedestal({
  id,
  position,
  label,
  detail,
  color,
  selected,
  enabled,
  children,
  onSelect,
}: {
  id: string
  position: Vec3
  label: string
  detail: string
  color: string
  selected: boolean
  enabled: boolean
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <Interactable id={id} enabled={enabled} interactionText={`${label}に投票`} onInteract={onSelect}>
      <group position={position}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[1.9, 0.56, 1.55]} />
          <meshStandardMaterial color="#3d3026" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.59, 0]} castShadow>
          <boxGeometry args={[1.72, 0.12, 1.38]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.48 : 0.1} roughness={0.68} />
        </mesh>
        <group position={[0, 0.67, 0.05]}>{children}</group>
        <mesh position={[0, 0.45, 0.82]} rotation={[-Math.PI / 10, 0, 0]}>
          <boxGeometry args={[1.62, 0.62, 0.1]} />
          <meshStandardMaterial color={selected ? color : '#f4e5c3'} roughness={0.86} />
        </mesh>
        <Text position={[0, 0.58, 0.89]} rotation={[-Math.PI / 10, 0, 0]} fontSize={0.18} color={selected ? '#172033' : '#392f26'} anchorX="center">
          {`${label}${selected ? ' ●' : ''}`}
        </Text>
        <Text position={[0, 0.35, 0.82]} rotation={[-Math.PI / 10, 0, 0]} fontSize={0.105} color={selected ? '#172033' : '#665848'} anchorX="center">
          {detail}
        </Text>
        {selected ? (
          <Text position={[0, 1.08, 0.02]} fontSize={0.18} color="#fff7e6" anchorX="center">
            選択中
          </Text>
        ) : null}
      </group>
    </Interactable>
  )
}
