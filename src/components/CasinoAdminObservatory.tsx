import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useTeleport, useUsers, useWorldStorage, type User } from '@xrift/world-components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Vector3, type ColorRepresentation, type Group } from 'three'
import {
  CASINO_ADMIN_DECK_CENTER,
  CASINO_ADMIN_DECK_ROTATION_Y,
  CASINO_RECEPTION_DESTINATION,
} from '../config/casinoAdminAccess'
import {
  CASINO_PAYOUT_TOTAL_KEY,
  CASINO_PLAYER_REGISTRY_KEY,
  CASINO_PLAYER_STATS_KEY,
  CASINO_REFUND_TOTAL_KEY,
  CASINO_RELIEF_TOTAL_KEY,
  CASINO_TRANSACTION_TOTAL_KEY,
  CASINO_WAGERED_TOTAL_KEY,
  gmNetCoins,
  mergeCasinoPlayerRegistry,
  parseCasinoPlayerRegistry,
  parseCasinoPlayerStats,
  type CasinoPlayerStats,
  type RegisteredCasinoPlayer,
} from '../game/casinoLedger'
import { COIN_KEY } from '../game/economy'
import { CASINO_WALLET_KEY, parseCasinoWallet } from '../game/casinoWallet'
import {
  EXCHANGE_COIN_REDEEMED_TOTAL_KEY,
  EXCHANGE_COIN_TOTAL_KEY,
  EXCHANGE_COUNT_KEY,
  EXCHANGE_RIF_TOTAL_KEY,
  EXCHANGE_RIF_OUT_TOTAL_KEY,
  EXCHANGE_WITHDRAWAL_COUNT_KEY,
} from '../game/rifExchange'
import { CasinoButton } from './CasinoPrimitives'

type Vec3 = [number, number, number]

interface AuditPlayerRow extends RegisteredCasinoPlayer {
  coins: number | null
  bonus: number | null
  redeemable: number | null
  stats: CasinoPlayerStats
}

interface CasinoAuditSnapshot {
  rows: AuditPlayerRow[]
  registryCount: number
  readableWallets: number
  totalCoins: number
  averageCoins: number
  wagered: number
  payouts: number
  refunds: number
  relief: number
  rifIn: number
  rifMinted: number
  rifOut: number
  coinRedeemed: number
  exchanges: number
  withdrawals: number
  transactions: number
}

const EMPTY_AUDIT: CasinoAuditSnapshot = {
  rows: [],
  registryCount: 0,
  readableWallets: 0,
  totalCoins: 0,
  averageCoins: 0,
  wagered: 0,
  payouts: 0,
  refunds: 0,
  relief: 0,
  rifIn: 0,
  rifMinted: 0,
  rifOut: 0,
  coinRedeemed: 0,
  exchanges: 0,
  withdrawals: 0,
  transactions: 0,
}

const PREVIEW_AUDIT: CasinoAuditSnapshot = {
  rows: [
    { id: 'preview-1', name: '船長トモ', coins: 42, bonus: 12, redeemable: 30, stats: { version: 1, wagered: 31, payouts: 48, refunds: 2, relief: 0, rifMinted: 20, transactions: 12 } },
    { id: 'preview-2', name: '赤ひげ', coins: 18, bonus: 18, redeemable: 0, stats: { version: 1, wagered: 22, payouts: 16, refunds: 0, relief: 10, rifMinted: 4, transactions: 9 } },
    { id: 'preview-3', name: '青い鳥', coins: 7, bonus: 2, redeemable: 5, stats: { version: 1, wagered: 14, payouts: 11, refunds: 0, relief: 0, rifMinted: 0, transactions: 6 } },
    { id: 'preview-4', name: '見習い', coins: 3, bonus: 3, redeemable: 0, stats: { version: 1, wagered: 7, payouts: 0, refunds: 0, relief: 10, rifMinted: 0, transactions: 3 } },
  ],
  registryCount: 4,
  readableWallets: 4,
  totalCoins: 70,
  averageCoins: 17.5,
  wagered: 74,
  payouts: 75,
  refunds: 2,
  relief: 20,
  rifIn: 24,
  rifMinted: 24,
  rifOut: 2,
  coinRedeemed: 100,
  exchanges: 5,
  withdrawals: 2,
  transactions: 30,
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0
}

function formatCoins(value: number): string {
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value)}枚`
}

function AdminBlock({
  position,
  size,
  color,
  emissiveIntensity = 0,
}: {
  position: Vec3
  size: Vec3
  color: ColorRepresentation
  emissiveIntensity?: number
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.78}
        metalness={0.08}
      />
    </mesh>
  )
}

export function CasinoAdminObservatory({
  position = CASINO_ADMIN_DECK_CENTER,
  preview = false,
}: {
  position?: Vec3
  preview?: boolean
}) {
  const storage = useWorldStorage()
  const { teleport } = useTeleport()
  const { localUser, remoteUsers } = useUsers()
  const deckRef = useRef<Group>(null)
  const deckWorldPosition = useRef(new Vector3())
  const lastProximityCheck = useRef(0)
  const [auditActive, setAuditActive] = useState(preview)
  const [snapshot, setSnapshot] = useState<CasinoAuditSnapshot>(preview ? PREVIEW_AUDIT : EMPTY_AUDIT)
  const [status, setStatus] = useState(preview ? '表示サンプル' : 'デッキ接近時に読込')

  useFrame(({ camera, clock }) => {
    if (preview || !deckRef.current || clock.elapsedTime - lastProximityCheck.current < 1) return
    lastProximityCheck.current = clock.elapsedTime
    deckRef.current.getWorldPosition(deckWorldPosition.current)
    const nextActive = camera.position.distanceTo(deckWorldPosition.current) <= 9.5
    setAuditActive((current) => current === nextActive ? current : nextActive)
  })

  const connectedUsers = useMemo(() => [localUser, ...remoteUsers]
    .filter((user): user is User => Boolean(user && !user.isGuest)), [localUser, remoteUsers])

  const refresh = useCallback(async () => {
    if (preview) {
      setSnapshot(PREVIEW_AUDIT)
      setStatus('表示サンプル・15秒更新')
      return
    }
    if (!auditActive) {
      setStatus('デッキ接近時に読込')
      return
    }
    try {
      const registryValue = await storage.shared.get(CASINO_PLAYER_REGISTRY_KEY)
      let registry = parseCasinoPlayerRegistry(registryValue)
      for (const user of connectedUsers) {
        registry = mergeCasinoPlayerRegistry(registry, { id: user.id, name: user.displayName })
      }

      const rows: AuditPlayerRow[] = []
      for (let index = 0; index < registry.length; index += 12) {
        const batch = registry.slice(index, index + 12)
        const batchRows = await Promise.all(batch.map(async (player) => {
          try {
            const [coinValue, walletValue, statsValue] = await Promise.all([
              storage.player.get(COIN_KEY, { userId: player.id }),
              storage.player.get(CASINO_WALLET_KEY, { userId: player.id }),
              storage.player.get(CASINO_PLAYER_STATS_KEY, { userId: player.id }),
            ])
            const legacyCoins = typeof coinValue === 'number' && Number.isFinite(coinValue)
              ? Math.max(0, Math.floor(coinValue))
              : 0
            const wallet = parseCasinoWallet(walletValue, legacyCoins)
            return {
              ...player,
              coins: walletValue !== undefined || typeof coinValue === 'number' ? wallet.bonus + wallet.redeemable : null,
              bonus: walletValue !== undefined || typeof coinValue === 'number' ? wallet.bonus : null,
              redeemable: walletValue !== undefined || typeof coinValue === 'number' ? wallet.redeemable : null,
              stats: parseCasinoPlayerStats(statsValue),
            }
          } catch {
            return { ...player, coins: null, bonus: null, redeemable: null, stats: parseCasinoPlayerStats(null) }
          }
        }))
        rows.push(...batchRows)
      }

      const [wageredValue, payoutValue, refundValue, reliefValue, rifInValue, rifMintedValue, rifOutValue, coinRedeemedValue, exchangeValue, withdrawalValue, transactionValue] = await Promise.all([
        storage.shared.get(CASINO_WAGERED_TOTAL_KEY),
        storage.shared.get(CASINO_PAYOUT_TOTAL_KEY),
        storage.shared.get(CASINO_REFUND_TOTAL_KEY),
        storage.shared.get(CASINO_RELIEF_TOTAL_KEY),
        storage.shared.get(EXCHANGE_RIF_TOTAL_KEY),
        storage.shared.get(EXCHANGE_COIN_TOTAL_KEY),
        storage.shared.get(EXCHANGE_RIF_OUT_TOTAL_KEY),
        storage.shared.get(EXCHANGE_COIN_REDEEMED_TOTAL_KEY),
        storage.shared.get(EXCHANGE_COUNT_KEY),
        storage.shared.get(EXCHANGE_WITHDRAWAL_COUNT_KEY),
        storage.shared.get(CASINO_TRANSACTION_TOTAL_KEY),
      ])
      const readableRows = rows.filter((row) => row.coins !== null)
      const totalCoins = readableRows.reduce((total, row) => total + (row.coins ?? 0), 0)
      setSnapshot({
        rows: rows.sort((left, right) => (right.coins ?? -1) - (left.coins ?? -1)),
        registryCount: registry.length,
        readableWallets: readableRows.length,
        totalCoins,
        averageCoins: readableRows.length > 0 ? totalCoins / readableRows.length : 0,
        wagered: safeNumber(wageredValue),
        payouts: safeNumber(payoutValue),
        refunds: safeNumber(refundValue),
        relief: safeNumber(reliefValue),
        rifIn: safeNumber(rifInValue),
        rifMinted: safeNumber(rifMintedValue),
        rifOut: safeNumber(rifOutValue),
        coinRedeemed: safeNumber(coinRedeemedValue),
        exchanges: safeNumber(exchangeValue),
        withdrawals: safeNumber(withdrawalValue),
        transactions: safeNumber(transactionValue),
      })
      setStatus('参考集計・15秒更新')
    } catch (error) {
      console.warn('Casino admin audit refresh failed.', error)
      setStatus('集計を取得できません')
    }
  }, [auditActive, connectedUsers, preview, storage])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const gmNet = gmNetCoins(snapshot)
  const playerLines = snapshot.rows.slice(0, 8).map((row, index) => (
    `${String(index + 1).padStart(2, '0')} ${row.name.slice(0, 9).padEnd(9, '　')} 合計${row.coins ?? '—'} / 両替${row.redeemable ?? '—'} / 遊技${row.bonus ?? '—'}`
  ))
  if (snapshot.rows.length > 8) playerLines.push(`ほか ${snapshot.rows.length - 8}ウォレット`)

  return (
    <group ref={deckRef} position={position} rotation={[0, CASINO_ADMIN_DECK_ROTATION_Y, 0]}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
        <AdminBlock position={[0, 0, 0]} size={[18, 0.6, 11]} color="#263e43" />
        <AdminBlock position={[0, -0.48, 0]} size={[17.2, 0.36, 10.2]} color="#172033" />
        <AdminBlock position={[0, -1.02, 0]} size={[14.2, 0.72, 8.1]} color="#493526" />
        <AdminBlock position={[0, -1.62, 0]} size={[9.4, 0.58, 5.2]} color="#263e43" />
        <AdminBlock position={[0, -2.08, 0]} size={[4.6, 0.42, 2.5]} color="#172033" />
        <AdminBlock position={[-8.75, 1.05, 0]} size={[0.24, 1.8, 11]} color="#493526" />
        <AdminBlock position={[8.75, 1.05, 0]} size={[0.24, 1.8, 11]} color="#493526" />
        <AdminBlock position={[0, 1.05, 5.35]} size={[18, 1.8, 0.24]} color="#493526" />
      </RigidBody>

      {auditActive ? (
        <group>
          <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
            <AdminBlock position={[0, 3.2, -5.15]} size={[17.4, 5.6, 0.32]} color="#172033" />
            <AdminBlock position={[0, 6.05, -5.15]} size={[18, 0.36, 0.44]} color="#f6c453" emissiveIntensity={0.18} />
          </RigidBody>
          <Text position={[0, 5.42, -4.94]} fontSize={0.52} color="#f6c453" anchorX="center" anchorY="middle">
            カジノ監査デッキ / ADMIN OBSERVATORY
          </Text>
          <Text position={[0, 4.9, -4.94]} fontSize={0.22} color="#d8f4ff" anchorX="center" anchorY="middle">
            {`${status}　登録 ${snapshot.registryCount} / 読取 ${snapshot.readableWallets}`}
          </Text>

          <Text position={[-8.05, 4.38, -4.94]} fontSize={0.26} color="#fff7e6" anchorX="left" anchorY="top" lineHeight={1.42}>
            {[
              'ワールド流通サマリー',
              `観測総残高　${formatCoins(snapshot.totalCoins)}`,
              `平均残高　　${formatCoins(snapshot.averageCoins)}`,
              `累計BET　　 ${formatCoins(snapshot.wagered)}`,
              `総払戻　　　${formatCoins(snapshot.payouts + snapshot.refunds)}`,
              `取引記録　　${snapshot.transactions}件`,
            ].join('\n')}
          </Text>

          <Text position={[-1.65, 4.38, -4.94]} fontSize={0.26} color="#fff7e6" anchorX="left" anchorY="top" lineHeight={1.42}>
            {[
              'GM・発行記録',
              `GM差引(理論) ${gmNet >= 0 ? '+' : ''}${formatCoins(gmNet)}`,
              `救済発行　　 ${formatCoins(snapshot.relief)}`,
              `RIF流入　　　${snapshot.rifIn} RIF`,
              `RIF交換発行　${formatCoins(snapshot.rifMinted)}`,
              `RIF出金　　　${snapshot.rifOut} RIF / ${formatCoins(snapshot.coinRedeemed)}`,
              `入金${snapshot.exchanges}件 / 出金${snapshot.withdrawals}件`,
            ].join('\n')}
          </Text>

          <Text position={[3.55, 4.38, -4.94]} fontSize={0.21} color="#fff7e6" anchorX="left" anchorY="top" lineHeight={1.36}>
            {['ユーザー別 TOP残高', ...(playerLines.length > 0 ? playerLines : ['まだ観測データがありません'])].join('\n')}
          </Text>

          <Text position={[0, 0.62, -4.94]} fontSize={0.18} color="#ffb4a2" anchorX="center" anchorY="middle">
            参考値：World Storageは公開KVです。秘密情報・会計正本・管理者認証には使用しません
          </Text>
          <CasinoButton
            id="casino-admin-return"
            label="受付へ戻る"
            detail="いつでも退出できます"
            position={[6.75, 1.08, -4.94]}
            width={2.7}
            height={0.72}
            color="#2c7a7b"
            enabled
            onPress={() => teleport(CASINO_RECEPTION_DESTINATION)}
          />
          <pointLight position={[0, 5.2, 1.5]} intensity={7} distance={18} color="#d8f4ff" />
        </group>
      ) : (
        <group>
          <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0.94}>
            <AdminBlock position={[-2.9, 2.15, -5.15]} size={[0.36, 4.3, 0.36]} color="#493526" />
            <AdminBlock position={[2.9, 2.15, -5.15]} size={[0.36, 4.3, 0.36]} color="#493526" />
            <AdminBlock position={[0, 3.25, -5.15]} size={[7.2, 2.25, 0.3]} color="#493526" />
            <AdminBlock position={[0, 4.48, -5.15]} size={[7.8, 0.24, 0.42]} color="#f6c453" emissiveIntensity={0.08} />
          </RigidBody>
          <AdminBlock position={[0, 3.25, -5.36]} size={[6.7, 1.78, 0.08]} color="#172033" />
          <Text position={[0, 3.5, -5.43]} rotation={[0, Math.PI, 0]} fontSize={0.38} color="#f6c453" anchorX="center" anchorY="middle">
            北極星 通信塔
          </Text>
          <Text position={[0, 3.02, -5.43]} rotation={[0, Math.PI, 0]} fontSize={0.16} color="#d8f4ff" anchorX="center" anchorY="middle">
            NORTH STAR SIGNAL TOWER
          </Text>
          <pointLight position={[0, 4.5, -4.7]} intensity={2.4} distance={10} color="#ffd98a" />
        </group>
      )}
    </group>
  )
}
