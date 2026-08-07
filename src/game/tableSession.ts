export interface HumanSeat {
  userId: string
  displayName: string
}

export type SeatList = Array<HumanSeat | null>

export const TABLE_CAPACITY = 4

export function createEmptySeats(): SeatList {
  return Array.from({ length: TABLE_CAPACITY }, () => null)
}

export function findSeatByUser(seats: SeatList, userId: string): number {
  return seats.findIndex((seat) => seat?.userId === userId)
}

export function firstOpenSeat(seats: SeatList): number {
  return seats.findIndex((seat) => seat === null)
}

export function connectedHumanCount(seats: SeatList): number {
  return seats.filter((seat): seat is HumanSeat => seat !== null).length
}

export function seatLabel(
  seats: SeatList,
  seatIndex: number,
  npcNames: readonly string[],
): string {
  return seats[seatIndex]?.displayName ?? npcNames[seatIndex] ?? `NPC ${seatIndex + 1}`
}

export function nextOccupiedSeat(
  seats: SeatList,
  currentSeat: number,
): number | null {
  for (let offset = 1; offset <= seats.length; offset += 1) {
    const candidate = (currentSeat + offset) % seats.length
    if (seats[candidate]) return candidate
  }
  return null
}
