import { describe, expect, it } from 'vitest'
import {
  BLACKJACK_SEATS,
  MAHJONG_SEATS,
  isSeatDisplaced,
  worldSeatPosition,
} from './seatLayout'

describe('table seat layout', () => {
  it('converges every blackjack seat toward the table center', () => {
    expect(BLACKJACK_SEATS.map((seat) => seat.yaw)).toEqual([325, 347, 13, 35])
    expect(BLACKJACK_SEATS.map((seat) => seat.controlPosition[0])).toEqual([-0.88, -0.28, 0.28, 0.88])
  })

  it('faces each mahjong side toward the table center', () => {
    expect(MAHJONG_SEATS.map((seat) => seat.yaw)).toEqual([0, 270, 180, 90])
  })

  it('converts local seat coordinates to world coordinates', () => {
    expect(worldSeatPosition([-15, 0, 2], BLACKJACK_SEATS[0])).toEqual([-17.15, 0, 5.05])
    expect(worldSeatPosition([15, 0, 2], MAHJONG_SEATS[3])).toEqual([18.35, 0, 2])
  })

  it('corrects movement after the player leaves the 15cm seat radius', () => {
    const target: [number, number, number] = [10, 0, 5]
    expect(isSeatDisplaced({ x: 10.1, y: 0, z: 5.05 }, target)).toBe(false)
    expect(isSeatDisplaced({ x: 10.2, y: 0, z: 5 }, target)).toBe(true)
    expect(isSeatDisplaced({ x: 10, y: 0.5, z: 5 }, target)).toBe(true)
  })
})
