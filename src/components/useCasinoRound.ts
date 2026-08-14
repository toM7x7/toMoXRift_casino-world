import { useUsers, useWorldStorage } from '@xrift/world-components'
import { useEffect, useRef, useState } from 'react'
import {
  roundToken,
  totalReturn,
  type CasinoRoundBet,
} from '../game/casinoRounds'
import { useCasinoAudio } from './CasinoAudio'
import { useCasinoEconomy } from './CasinoEconomy'

export interface FormalCasinoRoundState {
  roundId: number
  phase: 'betting' | 'running'
  startedAt: number
  durationMs: number
  resultIndex: number
  bets: Record<string, CasinoRoundBet>
}

export function useRoundClock(intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

export function roundIsComplete(state: FormalCasinoRoundState, now: number) {
  return state.phase === 'running'
    && state.startedAt > 0
    && now >= state.startedAt + state.durationMs
}

export function useCasinoRoundSettlement({
  game,
  state,
  choiceCount,
  winReason,
}: {
  game: 'fate' | 'derby'
  state: FormalCasinoRoundState
  choiceCount: number
  winReason: string
}) {
  const { localUser } = useUsers()
  const storage = useWorldStorage()
  const { transact } = useCasinoEconomy()
  const { play } = useCasinoAudio()
  const settledRef = useRef(new Set<string>())
  const inFlightRef = useRef(new Set<string>())

  useEffect(() => {
    if (state.phase !== 'running' || state.startedAt <= 0 || !localUser) return
    const localBet = state.bets[localUser.id]
    if (!localBet) return
    const token = roundToken(game, state.roundId, state.startedAt)
    const delay = Math.max(0, state.startedAt + state.durationMs - Date.now())
    const markerKey = `casino.${game}.settled.v2`

    const timer = window.setTimeout(() => {
      if (settledRef.current.has(token) || inFlightRef.current.has(token)) return
      inFlightRef.current.add(token)
      const settle = async () => {
        try {
          try {
            const savedToken = await storage.player.get(markerKey)
            if (savedToken === token) {
              settledRef.current.add(token)
              return
            }
          } catch {
            // Local preview and guests settle in memory for this session.
          }

          const payout = totalReturn(localBet, state.resultIndex, choiceCount)
          if (payout > 0) {
            const next = await transact(payout, `${winReason}・払戻`)
            if (next === null) return
            play('win')
          } else {
            play('lose')
          }

          try {
            await storage.player.set(markerKey, token)
          } catch {
            // Local preview and guests do not require a persistent marker.
          }
          settledRef.current.add(token)
        } finally {
          inFlightRef.current.delete(token)
        }
      }
      void settle()
    }, delay + 80)

    return () => window.clearTimeout(timer)
  }, [choiceCount, game, localUser, play, state, storage, transact, winReason])
}
