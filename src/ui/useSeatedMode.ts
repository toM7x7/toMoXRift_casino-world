import { useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTeleport, useUsers } from '@xrift/world-components'
import { useRef } from 'react'
import { isSeatDisplaced } from '../game/seatLayout'

const BLOCKED_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

export function releasePointerLock() {
  if (typeof document === 'undefined') return
  document.exitPointerLock?.()
}

export function useSeatLock(
  active: boolean,
  position: [number, number, number] | null,
  yaw: number,
) {
  const { teleport } = useTeleport()
  const { getLocalMovement } = useUsers()
  const targetRef = useRef(position)
  const yawRef = useRef(yaw)
  const lastCorrectionRef = useRef(-1)
  const releasedRef = useRef(false)

  targetRef.current = position
  yawRef.current = yaw

  useEffect(() => {
    if (!active || !position) {
      releasedRef.current = false
      return
    }
    releasedRef.current = false
    teleport({ position, yaw })
  }, [active, position, teleport, yaw])

  useFrame(({ clock }) => {
    const target = targetRef.current
    if (!active || !target || releasedRef.current) return
    const elapsed = clock.getElapsedTime()
    // Keyboard input is already blocked while seated. A 250ms drift check keeps
    // the avatar anchored without issuing a teleport on nearly every frame.
    if (elapsed - lastCorrectionRef.current < 0.25) return

    const movement = getLocalMovement()
    if (!movement) return
    if (!isSeatDisplaced(movement.position, target)) return

    lastCorrectionRef.current = elapsed
    teleport({ position: target, yaw: yawRef.current })
  })

  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') return

    const blockMovement = (event: KeyboardEvent) => {
      if (releasedRef.current) return
      if (!BLOCKED_CODES.has(event.code)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    window.addEventListener('keydown', blockMovement, true)
    window.addEventListener('keyup', blockMovement, true)
    document.addEventListener('keydown', blockMovement, true)
    document.addEventListener('keyup', blockMovement, true)
    return () => {
      window.removeEventListener('keydown', blockMovement, true)
      window.removeEventListener('keyup', blockMovement, true)
      document.removeEventListener('keydown', blockMovement, true)
      document.removeEventListener('keyup', blockMovement, true)
    }
  }, [active])

  const releaseSeatLock = useCallback(() => {
    releasedRef.current = true
  }, [])

  return { releaseSeatLock }
}
