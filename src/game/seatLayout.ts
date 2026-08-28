export interface SeatTransform {
  position: [number, number, number]
  yaw: number
  controlPosition: [number, number, number]
  controlRotation: [number, number, number]
}

export const BLACKJACK_SEATS: SeatTransform[] = [
  { position: [-2.15, 0, 3.05], yaw: 325, controlPosition: [-0.88, 0.98, 1.8], controlRotation: [0, 0, 0] },
  { position: [-0.72, 0, 3.25], yaw: 347, controlPosition: [-0.28, 0.98, 1.8], controlRotation: [0, 0, 0] },
  { position: [0.72, 0, 3.25], yaw: 13, controlPosition: [0.28, 0.98, 1.8], controlRotation: [0, 0, 0] },
  { position: [2.15, 0, 3.05], yaw: 35, controlPosition: [0.88, 0.98, 1.8], controlRotation: [0, 0, 0] },
]

export const MAHJONG_SEATS: SeatTransform[] = [
  { position: [0, 0, 3.35], yaw: 0, controlPosition: [0, 0.8, 2.35], controlRotation: [0, 0, 0] },
  { position: [-3.35, 0, 0], yaw: 270, controlPosition: [-2.35, 0.8, 0], controlRotation: [0, -Math.PI / 2, 0] },
  { position: [0, 0, -3.35], yaw: 180, controlPosition: [0, 0.8, -2.35], controlRotation: [0, Math.PI, 0] },
  { position: [3.35, 0, 0], yaw: 90, controlPosition: [2.35, 0.8, 0], controlRotation: [0, Math.PI / 2, 0] },
]

export function worldSeatPosition(
  tablePosition: [number, number, number],
  seat: SeatTransform,
): [number, number, number] {
  return [
    tablePosition[0] + seat.position[0],
    tablePosition[1] + seat.position[1],
    tablePosition[2] + seat.position[2],
  ]
}

export function isSeatDisplaced(
  current: { x: number; y: number; z: number },
  target: [number, number, number],
): boolean {
  const dx = current.x - target[0]
  const dy = current.y - target[1]
  const dz = current.z - target[2]
  return dx * dx + dz * dz > 0.0225 || Math.abs(dy) > 0.4
}
