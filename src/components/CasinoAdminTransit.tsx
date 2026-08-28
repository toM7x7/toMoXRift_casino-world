import { Text } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import {
  useConfirm,
  useTeleport,
  useUsers,
  useWorld,
} from '@xrift/world-components'
import { useEffect, useMemo, useState } from 'react'
import {
  canAccessCasinoAdmin,
  CASINO_ADMIN_DESTINATION,
  CASINO_WORLD_ID,
} from '../config/casinoAdminAccess'
import { CasinoButton, JapanesePanel } from './CasinoPrimitives'

export function CasinoAdminTransit({
  position = [0, 0, -16.55],
  previewAuthorized = false,
}: {
  position?: [number, number, number]
  previewAuthorized?: boolean
}) {
  const { localUser } = useUsers()
  const { info } = useWorld(CASINO_WORLD_ID)
  const { teleport } = useTeleport()
  const { requestConfirm } = useConfirm()
  const [notice, setNotice] = useState('一般来場者は利用できません')

  const authorized = useMemo(() => previewAuthorized || canAccessCasinoAdmin({
    userId: localUser?.id,
    isGuest: localUser?.isGuest ?? true,
    ownerId: info?.owner?.id,
  }), [info?.owner?.id, localUser?.id, localUser?.isGuest, previewAuthorized])

  useEffect(() => {
    setNotice(authorized ? '管理権限を確認しました' : '一般来場者は利用できません')
  }, [authorized])

  const requestTransit = async () => {
    const authorizedAtPress = previewAuthorized || canAccessCasinoAdmin({
      userId: localUser?.id,
      isGuest: localUser?.isGuest ?? true,
      ownerId: info?.owner?.id,
    })
    if (!authorizedAtPress) {
      setNotice(localUser?.isGuest
        ? 'XRiftログイン済みの管理者専用です'
        : 'このユーザーには監査権限がありません')
      return
    }

    const confirmed = await requestConfirm({
      title: '管理者区画へ移動',
      message: '遠隔監査デッキへ移動しますか？',
      confirmLabel: '移動する',
      cancelLabel: '戻る',
    })
    if (!confirmed) return

    // Re-check after the asynchronous confirmation. Never rely on visibility alone.
    const stillAuthorized = previewAuthorized || canAccessCasinoAdmin({
      userId: localUser?.id,
      isGuest: localUser?.isGuest ?? true,
      ownerId: info?.owner?.id,
    })
    if (!stillAuthorized) {
      setNotice('権限を再確認できませんでした')
      return
    }
    setNotice('監査デッキへ移動します')
    teleport(CASINO_ADMIN_DESTINATION)
  }

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <boxGeometry args={[3.4, 0.24, 2.35]} />
          <meshStandardMaterial color="#493526" roughness={0.86} />
        </mesh>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <boxGeometry args={[2.8, 0.08, 1.8]} />
          <meshStandardMaterial
            color={authorized ? '#c58b22' : '#475569'}
            emissive={authorized ? '#f6c453' : '#172033'}
            emissiveIntensity={authorized ? 0.22 : 0.02}
            roughness={0.8}
          />
        </mesh>
      </RigidBody>

      <JapanesePanel
        position={[0, 1.68, -0.98]}
        rotation={[0, Math.PI, 0]}
        width={3.6}
        height={1.05}
        title={authorized ? '船長専用・遠隔昇降機' : '関係者専用設備'}
        lines={[notice]}
        accent={authorized ? 0xf6c453 : 0x69717d}
        background={0x172033}
      />
      <CasinoButton
        id="casino-admin-transit"
        label={authorized ? '監査デッキへ' : '関係者専用'}
        detail={authorized ? '確認後にテレポート' : '許可ユーザーのみ'}
        position={[0, 0.34, 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={2.35}
        height={0.78}
        color="#c58b22"
        enabled
        onPress={() => void requestTransit()}
      />
      <Text position={[0, 0.38, 0.83]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.14} color="#fff1b8" anchorX="center">
        AUTHORIZED CREW ONLY
      </Text>
      <pointLight position={[0, 1.3, 0]} intensity={authorized ? 3.6 : 0.8} distance={6} color={authorized ? '#ffd98a' : '#78909c'} />
    </group>
  )
}
