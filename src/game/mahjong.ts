export type Tile = number

const NUMBER_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

export const TILE_LABELS = [
  ...NUMBER_KANJI.map((number) => `${number}萬`),
  ...NUMBER_KANJI.map((number) => `${number}筒`),
  ...NUMBER_KANJI.map((number) => `${number}索`),
  '東', '南', '西', '北', '白', '發', '中',
] as const

export interface MahjongDeal {
  hands: Tile[][]
  wall: Tile[]
}

export interface DiscardAnalysis {
  tile: Tile
  tileIndex: number
  waits: Tile[]
}

const GUIDED_TENPAI_HANDS: Tile[][] = [
  [0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 18, 18, 27],
  [1, 2, 3, 10, 11, 12, 20, 21, 22, 28, 28, 28, 4],
  [6, 7, 8, 14, 15, 16, 18, 19, 20, 31, 31, 31, 26],
]

export function createMahjongWall(random: () => number = Math.random): Tile[] {
  const wall = Array.from({ length: 34 * 4 }, (_, index) => Math.floor(index / 4))
  for (let index = wall.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[wall[index], wall[swapIndex]] = [wall[swapIndex], wall[index]]
  }
  return wall
}

export function dealMahjong(random: () => number = Math.random): MahjongDeal {
  const wall = createMahjongWall(random)
  const hands = Array.from({ length: 4 }, () => [] as Tile[])
  for (let round = 0; round < 13; round += 1) {
    for (const hand of hands) {
      const tile = wall.pop()
      if (tile !== undefined) hand.push(tile)
    }
  }
  hands.forEach(sortTiles)
  return { hands, wall }
}

export function dealGuidedMahjong(random: () => number = Math.random): MahjongDeal {
  const selected = GUIDED_TENPAI_HANDS[
    Math.floor(random() * GUIDED_TENPAI_HANDS.length)
  ]
  const playerHand = [...selected]
  const wall = createMahjongWall(random)

  playerHand.forEach((tile) => {
    const index = wall.indexOf(tile)
    if (index < 0) throw new Error(`Guided hand tile ${tile} was not found in wall`)
    wall.splice(index, 1)
  })

  const hands: Tile[][] = [sortTiles(playerHand), [], [], []]
  for (let npcIndex = 1; npcIndex < 4; npcIndex += 1) {
    for (let count = 0; count < 13; count += 1) {
      const tile = wall.pop()
      if (tile !== undefined) hands[npcIndex].push(tile)
    }
    sortTiles(hands[npcIndex])
  }
  return { hands, wall }
}

export function sortTiles(hand: Tile[]): Tile[] {
  return hand.sort((left, right) => left - right)
}

function canFormMelds(counts: number[]): boolean {
  const first = counts.findIndex((count) => count > 0)
  if (first === -1) return true

  if (counts[first] >= 3) {
    counts[first] -= 3
    if (canFormMelds(counts)) {
      counts[first] += 3
      return true
    }
    counts[first] += 3
  }

  const suitIndex = first % 9
  const isNumberTile = first < 27
  if (
    isNumberTile &&
    suitIndex <= 6 &&
    counts[first + 1] > 0 &&
    counts[first + 2] > 0
  ) {
    counts[first] -= 1
    counts[first + 1] -= 1
    counts[first + 2] -= 1
    if (canFormMelds(counts)) {
      counts[first] += 1
      counts[first + 1] += 1
      counts[first + 2] += 1
      return true
    }
    counts[first] += 1
    counts[first + 1] += 1
    counts[first + 2] += 1
  }

  return false
}

export function isWinningHand(hand: Tile[]): boolean {
  if (hand.length !== 14) return false
  const counts = Array.from({ length: 34 }, () => 0)
  hand.forEach((tile) => {
    counts[tile] += 1
  })

  for (let pair = 0; pair < counts.length; pair += 1) {
    if (counts[pair] < 2) continue
    counts[pair] -= 2
    if (canFormMelds(counts)) {
      counts[pair] += 2
      return true
    }
    counts[pair] += 2
  }
  return false
}

export function winningTiles(hand: Tile[]): Tile[] {
  if (hand.length !== 13) return []
  const counts = Array.from({ length: 34 }, () => 0)
  hand.forEach((tile) => {
    counts[tile] += 1
  })
  const waits: Tile[] = []
  for (let tile = 0; tile < 34; tile += 1) {
    if (counts[tile] >= 4) continue
    if (isWinningHand([...hand, tile])) waits.push(tile)
  }
  return waits
}

function tileUsefulness(hand: Tile[], tile: Tile): number {
  const copies = hand.filter((candidate) => candidate === tile).length
  if (tile >= 27) return copies * 3
  const suitStart = Math.floor(tile / 9) * 9
  const has = (offset: number) => {
    const candidate = tile + offset
    return candidate >= suitStart && candidate < suitStart + 9 && hand.includes(candidate)
  }
  return (
    copies * 3 +
    (has(-1) ? 2 : 0) +
    (has(1) ? 2 : 0) +
    (has(-2) ? 1 : 0) +
    (has(2) ? 1 : 0)
  )
}

export function suggestDiscard(hand: Tile[]): Tile {
  return analyzeDiscard(hand).tile
}

export function analyzeDiscard(hand: Tile[]): DiscardAnalysis {
  const uniqueTiles = [...new Set(hand)]
  let bestTile = uniqueTiles[0] ?? 0
  let bestWaits = -1
  let bestWaitList: Tile[] = []
  let lowestUsefulness = Number.POSITIVE_INFINITY

  for (const tile of uniqueTiles) {
    const candidate = [...hand]
    candidate.splice(candidate.indexOf(tile), 1)
    const waitList = winningTiles(candidate)
    const waits = waitList.length
    const usefulness = tileUsefulness(hand, tile)
    if (waits > bestWaits || (waits === bestWaits && usefulness < lowestUsefulness)) {
      bestTile = tile
      bestWaits = waits
      bestWaitList = waitList
      lowestUsefulness = usefulness
    }
  }
  return {
    tile: bestTile,
    tileIndex: hand.indexOf(bestTile),
    waits: bestWaitList,
  }
}

export function chooseNpcDiscard(hand: Tile[]): Tile {
  return suggestDiscard(hand)
}
