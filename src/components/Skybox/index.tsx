import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { EquirectangularReflectionMapping, SRGBColorSpace } from 'three'
import { useXRift } from '@xrift/world-components'
import { useEffect } from 'react'

/**
 * 画像生成したブロック遊技村の夕暮れパノラマをシーン背景として表示します。
 * 有限半径の球体を使わないため、XRift側のカメラ位置や撮影モードが変わっても
 * スカイドームの外側へ出て黒い半球が見えることがありません。
 */
export const Skybox: React.FC = () => {
  const { baseUrl } = useXRift()
  const { scene } = useThree()
  const texture = useTexture(`${baseUrl}block-village-twilight-sky.png`)
  texture.colorSpace = SRGBColorSpace
  texture.mapping = EquirectangularReflectionMapping
  texture.needsUpdate = true

  useEffect(() => {
    const originalBackground = scene.background
    scene.background = texture

    return () => {
      scene.background = originalBackground
    }
  }, [scene, texture])

  return null
}
