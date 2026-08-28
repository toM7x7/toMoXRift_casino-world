/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { DevEnvironment, XRiftProvider } from '@xrift/world-components'
import type { CameraConfig, PhysicsConfig, ServerClockContextValue } from '@xrift/world-components'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { createRoot } from 'react-dom/client'
import { World } from './World'
import xriftConfig from '../xrift.json'
import layout from './design/sandbox-layout-v9.json'
import expansionDesign from './design/casino-rules-expansion-v30.json'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const worldConfig = xriftConfig.world as {
  physics?: PhysicsConfig
  camera?: CameraConfig
  outputBufferType?: string
}

const devServerClock: ServerClockContextValue = {
  now: () => Date.now(),
  uncertainty: 10,
  synced: true,
  timeJumpCount: 0,
  lastTimeJumpMs: 0,
}

const previewMode = new URLSearchParams(window.location.search).get('mode')
const previewParams = new URLSearchParams(window.location.search)
const fateSightlineStation = Math.min(7, Math.max(0, Number(previewParams.get('station') ?? 0)))
const fateSightlinePads = [-42, -30, -18, -6, 6, 18, 30, 42].map((degrees) => {
  const angle = degrees * Math.PI / 180
  return [
    -17 + Math.sin(angle) * 7.2,
    1.6,
    -15.2 + Math.cos(angle) * 7.2,
  ] as [number, number, number]
})
const fateSightlineCamera = {
  position: fateSightlinePads[fateSightlineStation],
  target: [-17, 3.9, -15.2] as const,
  fov: 60,
}
const isReviewMode = previewMode === 'thumbnail'
  || previewMode === 'spawn-review'
  || previewMode === 'map'
  || previewMode === 'mahjong'
  || previewMode === 'mahjong-entry'
  || previewMode === 'mahjong-seat'
  || previewMode === 'mahjong-play'
  || previewMode === 'mahjong-hud'
  || previewMode === 'blackjack'
  || previewMode === 'blackjack-entry'
  || previewMode === 'blackjack-seat'
  || previewMode === 'blackjack-hud'
  || previewMode === 'gm'
  || previewMode === 'expansion'
  || previewMode === 'fate-wheel'
  || previewMode === 'fate-sightline'
  || previewMode === 'derby-vote'
  || previewMode === 'derby-deck'
  || previewMode === 'west-expansion'
  || previewMode === 'west-entrance'
  || previewMode === 'dice-poker'
  || previewMode === 'dice-poker-player'
  || previewMode === 'animal-jara-prototype'
  || previewMode === 'animal-jara-lobby'
  || previewMode === 'admin'
  || previewMode === 'admin-access'
const reviewCamera = previewMode === 'map'
  ? layout.cameraPresets.mapReview
  : previewMode === 'spawn-review'
    ? { position: [0, 1.65, 18], target: [0, 1.65, -13], fov: 62 }
  : previewMode === 'expansion'
    ? { position: [0, 24, 38], target: [12, 1.2, -10], fov: 62 }
  : previewMode === 'fate-wheel'
    ? { position: [-17, 7.8, 0.6], target: [-17, 2.8, -13.5], fov: 54 }
  : previewMode === 'fate-sightline'
    ? fateSightlineCamera
  : previewMode === 'derby-vote'
    ? { position: [17, 8.5, -1.5], target: [17, 0.8, -13], fov: 48 }
  : previewMode === 'derby-deck'
    ? { position: [27.2, 2.2, -13], target: [56, 0.6, -13], fov: 75 }
  : previewMode === 'west-expansion'
    ? expansionDesign.cameraPresets.westExpansion
  : previewMode === 'west-entrance'
    ? expansionDesign.cameraPresets.westEntrance
  : previewMode === 'dice-poker'
    ? expansionDesign.cameraPresets.dicePoker
  : previewMode === 'dice-poker-player'
    ? expansionDesign.cameraPresets.dicePokerPlayer
  : previewMode === 'animal-jara-prototype' || previewMode === 'animal-jara-lobby'
    ? expansionDesign.cameraPresets.animalJaraPrototype
  : previewMode === 'admin'
    ? { position: [0, 9.1, -52.5], target: [0, 9.75, -43], fov: 60 }
  : previewMode === 'admin-access'
    ? { position: [0, 3.6, -21.5], target: [0, 1.05, -16.7], fov: 55 }
  : previewMode === 'mahjong-seat'
    ? layout.cameraPresets.mahjongSeatReview
  : previewMode === 'mahjong'
  || previewMode === 'mahjong-entry'
  || previewMode === 'mahjong-play'
  || previewMode === 'mahjong-hud'
  ? layout.cameraPresets.mahjongReview
  : previewMode === 'blackjack-seat'
    ? layout.cameraPresets.blackjackSeatReview
  : previewMode === 'blackjack'
    || previewMode === 'blackjack-entry'
    || previewMode === 'blackjack-hud'
    ? layout.cameraPresets.blackjackReview
  : previewMode === 'gm'
    ? layout.cameraPresets.gmReview
    : layout.cameraPresets.thumbnail

createRoot(rootElement).render(
  <XRiftProvider baseUrl="/" serverClockImplementation={devServerClock}>
    {isReviewMode ? (
      <div style={{ width: '100vw', height: '100vh', background: layout.palette.sky }}>
        <Canvas
          shadows
          camera={{ position: reviewCamera.position as [number, number, number], fov: reviewCamera.fov }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <OrbitControls target={reviewCamera.target as [number, number, number]} enablePan={false} />
          <Physics gravity={[0, -9.81, 0]}>
            <World
              showHud={previewMode === 'mahjong-hud' || previewMode === 'blackjack-hud'}
              showSpawn={false}
              reviewGame={
                previewMode === 'mahjong-seat'
                || previewMode === 'mahjong-play'
                || previewMode === 'mahjong-hud'
                  ? 'mahjong'
                  : previewMode === 'blackjack'
                    || previewMode === 'blackjack-seat'
                    || previewMode === 'blackjack-hud'
                    ? 'blackjack'
                    : undefined
              }
              reviewScene={previewMode === 'admin' || previewMode === 'admin-access'
                ? previewMode
                : previewMode === 'animal-jara-prototype'
                  ? 'animal-jara'
                  : undefined}
            />
          </Physics>
        </Canvas>
      </div>
    ) : (
      <DevEnvironment
        physicsConfig={worldConfig.physics}
        camera={{ ...worldConfig.camera, position: [0, 3.4, 10.8], fov: 62 }}
        outputBufferType={worldConfig.outputBufferType}
        moveSpeed={5}
        shadows
      >
        <World />
      </DevEnvironment>
    )}
  </XRiftProvider>,
)
