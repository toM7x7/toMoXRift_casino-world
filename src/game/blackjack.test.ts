import { describe, expect, it } from 'vitest'
import { compareHands, handValue, type Card } from './blackjack'

const cards = (...entries: Array<[Card['rank'], Card['suit']]>): Card[] =>
  entries.map(([rank, suit]) => ({ rank, suit }))

describe('blackjack rules', () => {
  it('reduces aces from eleven to one as needed', () => {
    expect(handValue(cards(['A', '♠'], ['A', '♥'], ['9', '♦']))).toBe(21)
  })

  it('recognizes a natural blackjack', () => {
    expect(compareHands(cards(['A', '♠'], ['K', '♥']), cards(['10', '♣'], ['Q', '♠']))).toBe('blackjack')
  })

  it('recognizes pushes and busts', () => {
    expect(compareHands(cards(['10', '♠'], ['8', '♥']), cards(['9', '♣'], ['9', '♠']))).toBe('push')
    expect(compareHands(cards(['10', '♠'], ['8', '♥'], ['7', '♦']), cards(['9', '♣'], ['9', '♠']))).toBe('bust')
  })
})
