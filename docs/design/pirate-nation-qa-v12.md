# Pirate Market Motion v12 QA

実施日: 2026-08-07

## 実装範囲

- Pirate Nation Artから5点をCC0素材として選抜導入
  - Starter Pirate
  - Animated Palm Tree
  - Gold Coin
  - Barrel
  - Faded Map
- 受付GM、BJディーラー、麻雀NPCをスキン付きアニメーションモデルへ変更
- 4本のヤシに21.042秒ループを位相差付きで適用
- 交換所に回転コイン、樽、地図小物を配置
- BJ/MJのinstance state keyをv12へ更新し、旧QA席をリセット
- 新規ウォレットを0枚開始に変更し、初回10枚も受付受取へ統一
- 麻雀UIを日本語化し、「おすすめ捨て」を1回押すだけの初心者操作を追加

## 数値設計

- 敷地: 56m × 42m
- 主通路: 6m
- 交差通路: 4m
- BJ/MJ中心間: 30m
- Animated Palm: 4本、scale 0.43、推定高さ約3.9m
- NPC: scale 2.72、麻雀NPCのみ2.42
- Barrel: scale 0.035、推定高さ約1.26m
- 新規小物に物理コライダーを付けず、既存通路・着席導線を維持

## ローカル検証

- `npm run typecheck`: PASS
- `npm run test`: PASS（5 files / 16 tests）
- `npm run build`: PASS
- glTF 5点の`public/pn-*` → `dist/pn-*` SHA-256一致: PASS
- `public/thumbnail.png` → `dist/thumbnail.png` SHA-256一致: PASS
- サムネイル: 1280 × 720
- Playwright console error: 0
- 0.9秒差のGM画像SHA-256が異なる: PASS（NPC・コインの時間変化あり）

## 視覚検証

- 全景と開放感: PASS
  - `docs/screenshots/thumbnail-pirate-v12-2026-08-07.png`
- 交換所のランドマーク性とNPC正面: PASS
  - `docs/screenshots/gm-pirate-v12-2026-08-07.png`
- BJの盤面視認性、ディーラー正面、「1枚引く」「止める」: PASS
  - `docs/screenshots/blackjack-pirate-v12-2026-08-07.png`
- 麻雀の私有牌、盤面視認性、日本語操作、NPC名札非表示: PASS
  - `docs/screenshots/mahjong-pirate-v12-2026-08-07.png`

## 公開検証

- XRift upload version 12: BUILD/UPLOAD PASS
- CDN assets version 12: FAIL（ネストした`assets/piratenation/*.gltf`が404）
- 対応: `public/pn-*.gltf`へ移動し、読込先を`${baseUrl}pn-*.gltf`へ修正
- XRift upload version 13: PASS
- Public API: `ACTIVE` / currentVersionNumber `13` / content hash `8af9c99b8639`
- CDN: `remoteEntry.js`、World chunk、thumbnail、sky、glTF 5点すべてHTTP 200
- CDN glTF 5点とローカル`dist`のSHA-256一致: PASS
- 公開一覧への露出: なし（既存設定`isPublic=false`を維持）
- 実インスタンス: ログイン済みブラウザセッションがないため未実施。ローカル実機相当QAと配信物検証をリリース判定に採用
- QAブラウザ: 終了済み（QAユーザー残留なし）
