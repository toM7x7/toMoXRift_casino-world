import { useServerClock, useUsers, useWorldStorage } from '@xrift/world-components'
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
  const clock = useServerClock({ require: 'motion' })
  const [now, setNow] = useState(() => clock.now())
  useEffect(() => {
    setNow(clock.now())
    const timer = window.setInterval(() => setNow(clock.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [clock.now, clock.timeJumpCount, intervalMs])
  return now
}

export function scheduleAtServerTime(
  deadlineMs: number,
  now: () => number,
  callback: () => void,
) {
  let cancelled = false
  let timer: number | undefined

  const check = () => {
    if (cancelled) return
    const remaining = deadlineMs - now()
    if (remaining <= 0) {
      callback()
      return
    }
    timer = window.setTimeout(check, Math.max(16, Math.min(remaining, 1000)))
  }

  check()
  return () => {
    cancelled = true
    if (timer !== undefined) window.clearTimeout(timer)
  }
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
  const clock = useServerClock({ require: 'motion' })
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
    const markerKey = `casino.${game}.settled.v2`

    return scheduleAtServerTime(state.startedAt + state.durationMs + 80, clock.now, () => {
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
    })
  }, [choiceCount, clock.now, clock.timeJumpCount, game, localUser, play, state, storage, transact, winReason])
}
