export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
}

export type BlackjackOutcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function createShuffledDeck(random: () => number = Math.random): Card[] {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })))
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }
  return deck
}

export function handValue(hand: Card[]): number {
  let value = 0
  let aces = 0

  for (const card of hand) {
    if (card.rank === 'A') {
      value += 11
      aces += 1
    } else if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') {
      value += 10
    } else {
      value += Number(card.rank)
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces -= 1
  }

  return value
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21
}

export function playDealer(deck: Card[], dealerHand: Card[]): { deck: Card[]; hand: Card[] } {
  const nextDeck = [...deck]
  const hand = [...dealerHand]
  while (handValue(hand) < 17 && nextDeck.length > 0) {
    const card = nextDeck.pop()
    if (card) hand.push(card)
  }
  return { deck: nextDeck, hand }
}

export function compareHands(playerHand: Card[], dealerHand: Card[]): BlackjackOutcome {
  const playerValue = handValue(playerHand)
  const dealerValue = handValue(dealerHand)

  if (playerValue > 21) return 'bust'
  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) return 'blackjack'
  if (dealerValue > 21 || playerValue > dealerValue) return 'win'
  if (playerValue === dealerValue) return 'push'
  return 'lose'
}
