import { describe, expect, it } from 'vitest'
import {
  connectedHumanCount,
  createEmptySeats,
  findSeatByUser,
  firstOpenSeat,
  nextOccupiedSeat,
  seatLabel,
} from './tableSession'

describe('table session helpers', () => {
  it('supports one to four human seats', () => {
    const seats = createEmptySeats()
    expect(seats).toHaveLength(4)
    expect(firstOpenSeat(seats)).toBe(0)

    seats[0] = { userId: 'a', displayName: 'A' }
    seats[2] = { userId: 'b', displayName: 'B' }
    expect(connectedHumanCount(seats)).toBe(2)
    expect(findSeatByUser(seats, 'b')).toBe(2)
    expect(nextOccupiedSeat(seats, 0)).toBe(2)
    expect(nextOccupiedSeat(seats, 2)).toBe(0)
  })

  it('uses NPC names for open seats', () => {
    const seats = createEmptySeats()
    expect(seatLabel(seats, 1, ['A', 'レン', 'ユイ', 'ミオ'])).toBe('レン')
    seats[1] = { userId: 'p', displayName: 'プレイヤー' }
    expect(seatLabel(seats, 1, ['A', 'レン', 'ユイ', 'ミオ'])).toBe('プレイヤー')
  })
})
