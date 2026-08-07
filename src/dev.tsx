/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { DevEnvironment, XRiftProvider } from '@xrift/world-components'
import type { CameraConfig, PhysicsConfig } from '@xrift/world-components'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { createRoot } from 'react-dom/client'
import { World } from './World'
import xriftConfig from '../xrift.json'
import layout from './design/sandbox-layout-v9.json'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const worldConfig = xriftConfig.world as {
  physics?: PhysicsConfig
  camera?: CameraConfig
  outputBufferType?: string
}

const previewMode = new URLSearchParams(window.location.search).get('mode')
const isReviewMode = previewMode === 'thumbnail'
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
const reviewCamera = previewMode === 'map'
  ? layout.cameraPresets.mapReview
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
  <XRiftProvider baseUrl="/">
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
