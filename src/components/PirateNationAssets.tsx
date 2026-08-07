import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useXRift } from '@xrift/world-components'
import { useEffect, useMemo, useRef } from 'react'
import {
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  type Object3D,
} from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'

type Vec3 = [number, number, number]

function enableShadows(object: Object3D) {
  object.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  return object
}

function usePirateNationUrl(fileName: string) {
  const { baseUrl } = useXRift()
  return `${baseUrl}${fileName}`
}

export function AnimatedPirateModel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 2.72,
  clip = '02_Idle_2',
  repeat = true,
  playKey,
}: {
  position?: Vec3
  rotation?: Vec3
  scale?: number
  clip?: string
  repeat?: boolean
  playKey?: string | number
}) {
  const url = usePirateNationUrl('pn-starter-pirate.gltf')
  const gltf = useGLTF(url)
  const rootRef = useRef<Group>(null)
  const model = useMemo(
    () => enableShadows(cloneSkeleton(gltf.scene)),
    [gltf.scene],
  )
  const { actions } = useAnimations(gltf.animations, rootRef)

  useEffect(() => {
    const idleAction = actions['02_Idle_2']
    const action = actions[clip] ?? idleAction
    if (!action) {
      console.warn(`[PirateNation] animation clip not found: ${clip}`)
      return
    }
    action
      .reset()
      .setLoop(repeat ? LoopRepeat : LoopOnce, repeat ? Infinity : 1)
      .fadeIn(0.18)
      .play()
    action.clampWhenFinished = !repeat

    let returnToIdleTimer: number | undefined
    if (!repeat && idleAction && idleAction !== action) {
      returnToIdleTimer = window.setTimeout(() => {
        action.fadeOut(0.16)
        idleAction
          .reset()
          .setLoop(LoopRepeat, Infinity)
          .fadeIn(0.18)
          .play()
      }, Math.max(180, action.getClip().duration * 1000))
    }

    return () => {
      if (returnToIdleTimer !== undefined) window.clearTimeout(returnToIdleTimer)
      action.fadeOut(0.16)
    }
  }, [actions, clip, playKey, repeat])

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <primitive object={model} />
    </group>
  )
}

export function AnimatedPalm({
  position,
  rotation = [0, 0, 0],
  scale = 0.43,
  motion = 'Single Fronds Moving',
  phase = 0,
}: {
  position: Vec3
  rotation?: Vec3
  scale?: number
  motion?: 'More Movement' | 'Single Fronds Moving'
  phase?: number
}) {
  const url = usePirateNationUrl('pn-palm-tree-animated.gltf')
  const gltf = useGLTF(url)
  const rootRef = useRef<Group>(null)
  const model = useMemo(
    () => enableShadows(cloneSkeleton(gltf.scene)),
    [gltf.scene],
  )
  const { actions } = useAnimations(gltf.animations, rootRef)

  useEffect(() => {
    const action = actions[motion]
    if (!action) return
    action.reset().setLoop(LoopRepeat, Infinity).play()
    if (action.getClip().duration > 0) {
      action.time = phase % action.getClip().duration
    }
    return () => {
      action.stop()
    }
  }, [actions, motion, phase])

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <primitive object={model} />
    </group>
  )
}

function StaticVoxelModel({
  fileName,
  position,
  rotation = [0, 0, 0],
  scale,
}: {
  fileName: string
  position: Vec3
  rotation?: Vec3
  scale: number
}) {
  const url = usePirateNationUrl(fileName)
  const gltf = useGLTF(url)
  const model = useMemo(
    () => enableShadows(gltf.scene.clone(true)),
    [gltf.scene],
  )

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={model} />
    </group>
  )
}

export function PirateBarrel({
  position,
  rotation = [0, 0, 0],
  scale = 0.035,
}: {
  position: Vec3
  rotation?: Vec3
  scale?: number
}) {
  return (
    <StaticVoxelModel
      fileName="pn-barrel.gltf"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

export function FadedMapProp({
  position,
  rotation = [0, 0, Math.PI / 2],
  scale = 0.04,
}: {
  position: Vec3
  rotation?: Vec3
  scale?: number
}) {
  return (
    <StaticVoxelModel
      fileName="pn-faded-map.gltf"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

export function RotatingGoldCoin({
  position,
  scale = 0.068,
}: {
  position: Vec3
  scale?: number
}) {
  const url = usePirateNationUrl('pn-gold-coin.gltf')
  const gltf = useGLTF(url)
  const rootRef = useRef<Group>(null)
  const model = useMemo(
    () => enableShadows(gltf.scene.clone(true)),
    [gltf.scene],
  )

  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return
    rootRef.current.rotation.y += delta * 0.72
    rootRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2.2) * 0.08
  })

  return (
    <group ref={rootRef} position={position} scale={scale}>
      <primitive object={model} />
    </group>
  )
}
