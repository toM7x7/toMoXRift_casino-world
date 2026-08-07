# 卓上ENTRY v10 QA

実施日: 2026-08-05

## ローカル検証

- `npm run typecheck`: PASS
- `npm run test`: PASS（5 files / 16 tests）
- Playwright console error:
  - スポーン案内図: 0
  - ブラックジャック ENTRY / 着席: 0
  - 麻雀 ENTRY / 着席: 0

## 視覚判定

| 対象 | 判定 | 証跡 |
| --- | --- | --- |
| スポーン直後の全体地図 | PASS | `docs/screenshots/spawn-map-v10-2026-08-05.png` |
| BJの4席ENTRY枠 | PASS | `docs/screenshots/blackjack-entry-v10-2026-08-05.png` |
| BJの公開GM札・私有手札・小型3D操作 | PASS | `docs/screenshots/blackjack-seat-v10-2026-08-05.png` |
| 麻雀の4席ENTRY枠 | PASS | `docs/screenshots/mahjong-entry-v10-2026-08-05.png` |
| 麻雀の私有14牌・卓上3D操作 | PASS | `docs/screenshots/mahjong-seat-v10-2026-08-05.png` |
| ワールド全景サムネイル | PASS | `docs/screenshots/thumbnail-tabletop-v10-2026-08-05.png` |

## 設計上の確認

- 古い左端看板を削除し、スポーン地点から約9.49mの初期視界内かつ主通路外へ実配置準拠の3D地図を設置した。
- 椅子の中心レイ操作でENTRYし、最初の着席者が任意の時点でSTARTできる。
- HTMLオーバーレイを廃止し、ポインターロックを維持したまま3D操作ボタンをクリックできる。
- 着席中は移動キーを捕捉し、座席から15cm以上ずれた場合は80ms周期で座標とyawを補正する。
- BJのGM札は公開し、手札メッシュと操作は所有者クライアントだけに描画する。
- 麻雀の14牌と操作は所有者クライアントだけに描画し、空席は開始後NPCになる。

## 公開検証

- XRift upload: PASS（version 10）
- Public API: `ACTIVE` / `currentVersionNumber=10`
- CDN content hash: `4676a3b2d29c`
- `remoteEntry.js`: HTTP 200
- `__federation_expose_World-C-cr9SKq.js`: HTTP 200
- `__federation_fn_import-BY9gngOw.js`: HTTP 200
- `block-village-twilight-sky.png`: HTTP 200 / ローカルSHA-256一致
- `thumbnail.png`: HTTP 200 / ローカルSHA-256一致
- 実インスタンス: PASS（`docs/screenshots/live-instance-v10-2026-08-05.png`）
- ゲスト参加時の認証・マイク・未作成World Storageキーに由来する401/404はXRiftホスト側の既知挙動。ワールドチャンクのロードエラーはなし。
