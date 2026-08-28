import animalEmblemDesign from '../design/animal-emblem-games-v31.json'

export type AnimalHabitat = 'land' | 'sea' | 'sky'

export interface AnimalJaraEmblem {
  id: string
  name: string
  habitat: AnimalHabitat
  cell: [number, number]
}

export interface AnimalJaraDeal {
  hands: string[][]
  wall: string[]
}

export const ANIMAL_JARA_EMBLEMS: readonly AnimalJaraEmblem[] = animalEmblemDesign.emblems.map((emblem) => ({
  id: emblem.id,
  name: emblem.name,
  habitat: emblem.habitat as AnimalHabitat,
  cell: emblem.cell as [number, number],
}))

const EMBLEM_BY_ID = new Map(ANIMAL_JARA_EMBLEMS.map((emblem) => [emblem.id, emblem]))

export function createAnimalJaraWall(random: () => number = Math.random): string[] {
  const wall = ANIMAL_JARA_EMBLEMS.flatMap((emblem) => Array.from({ length: 4 }, () => emblem.id))
  for (let index = wall.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[wall[index], wall[swapIndex]] = [wall[swapIndex], wall[index]]
  }
  return wall
}

export function dealAnimalJara(wall: readonly string[], playerCount = 4): AnimalJaraDeal {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    throw new Error('playerCount must be an integer from 1 to 4')
  }
  const requiredTiles = playerCount * 8
  if (wall.length < requiredTiles) throw new Error('wall does not contain enough tiles')
  const hands = Array.from({ length: playerCount }, () => [] as string[])
  let cursor = 0
  for (let tileIndex = 0; tileIndex < 8; tileIndex += 1) {
    for (let seat = 0; seat < playerCount; seat += 1) {
      hands[seat].push(wall[cursor])
      cursor += 1
    }
  }
  return { hands, wall: wall.slice(cursor) }
}

export function isValidAnimalJaraSet(tileIds: readonly string[]): boolean {
  if (tileIds.length !== 3 || tileIds.some((id) => !EMBLEM_BY_ID.has(id))) return false
  if (tileIds.every((id) => id === tileIds[0])) return true
  const unique = new Set(tileIds)
  if (unique.size !== 3) return false
  const habitat = EMBLEM_BY_ID.get(tileIds[0])?.habitat
  return tileIds.every((id) => EMBLEM_BY_ID.get(id)?.habitat === habitat)
}

function winningPartition(tileIds: readonly string[]): string[][] | null {
  if (tileIds.length === 0) return []
  const first = tileIds[0]
  for (let secondIndex = 1; secondIndex < tileIds.length - 1; secondIndex += 1) {
    for (let thirdIndex = secondIndex + 1; thirdIndex < tileIds.length; thirdIndex += 1) {
      const candidate = [first, tileIds[secondIndex], tileIds[thirdIndex]]
      if (!isValidAnimalJaraSet(candidate)) continue
      const remaining = tileIds.filter((_, index) => index !== 0 && index !== secondIndex && index !== thirdIndex)
      const tail = winningPartition(remaining)
      if (tail) return [candidate, ...tail]
    }
  }
  return null
}

export function findAnimalJaraWinningSets(tileIds: readonly string[]): string[][] | null {
  if (tileIds.length !== 9 || tileIds.some((id) => !EMBLEM_BY_ID.has(id))) return null
  const counts = new Map<string, number>()
  for (const id of tileIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  if ([...counts.values()].some((count) => count > 4)) return null
  return winningPartition([...tileIds].sort())
}

export function isWinningAnimalJaraHand(tileIds: readonly string[]): boolean {
  return findAnimalJaraWinningSets(tileIds) !== null
}

export function drawAnimalJaraTile(
  hand: readonly string[],
  wall: readonly string[],
): { hand: string[]; wall: string[]; tile: string } | null {
  const tile = wall[0]
  if (!tile) return null
  return { hand: [...hand, tile], wall: wall.slice(1), tile }
}

export function discardAnimalJaraTile(
  hand: readonly string[],
  index: number,
): { hand: string[]; discarded: string } | null {
  if (!Number.isInteger(index) || index < 0 || index >= hand.length) return null
  return {
    hand: hand.filter((_, tileIndex) => tileIndex !== index),
    discarded: hand[index],
  }
}

function handPotential(tileIds: readonly string[]): number {
  const idCounts = new Map<string, number>()
  const habitatMembers = new Map<AnimalHabitat, Set<string>>()
  for (const id of tileIds) {
    const emblem = EMBLEM_BY_ID.get(id)
    if (!emblem) continue
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
    const members = habitatMembers.get(emblem.habitat) ?? new Set<string>()
    members.add(id)
    habitatMembers.set(emblem.habitat, members)
  }
  const matchingPotential = [...idCounts.values()].reduce((score, count) => score + Math.min(count, 3) ** 2, 0)
  const habitatPotential = [...habitatMembers.values()].reduce((score, ids) => score + Math.min(ids.size, 3) ** 2, 0)
  return matchingPotential * 2 + habitatPotential
}

export function suggestAnimalJaraDiscard(hand: readonly string[]): number {
  if (hand.length === 0) return -1
  let bestIndex = 0
  let bestPotential = Number.NEGATIVE_INFINITY
  for (let index = 0; index < hand.length; index += 1) {
    const remaining = hand.filter((_, tileIndex) => tileIndex !== index)
    const potential = handPotential(remaining)
    if (potential > bestPotential) {
      bestPotential = potential
      bestIndex = index
    }
  }
  return bestIndex
}

export function getAnimalJaraEmblem(id: string): AnimalJaraEmblem | undefined {
  return EMBLEM_BY_ID.get(id)
}
