# Table-First UX v13 QA

日付: 2026-08-07

## 視覚ゲート

- PASS: BJのGMは着席者を向き、顔と物理カードが見える。
- PASS: BJの大型ENTRY・説明・共有ステータスを撤去し、盤面を遮らない。
- PASS: BJの個人ドックは盤外にあり、「1枚引く」「止める」「離席 X」を読める。
- PASS: 麻雀の卓面・山・河・NPCを遮らず、個人ドックに13牌と分離ツモ牌を表示。
- PASS: 麻雀の個人操作は「おすすめ」「ツモ」「離席 X」に整理。
- PASS: 受付のGM名札を独立表示せず、受付ボタンへ統合して人物への重なりを軽減。
- PASS: スカイボックス、広い通路、建設予定地を維持。

## 操作ゲート

- PASS: BJでXキー離席後、個人ドックとゲームカードが消え、着席状態が解除される。
- PASS: 離席時は先にカメラ固定を解除してから状態更新し、再スナップを防止。
- PASS: 離席ボタンはプレイ中・精算待ちを含め常時表示。
- PASS: 1〜4人の座席状態を維持し、空席はNPCが補完。

## アニメーションゲート

- PASS: 実在する `08_Action_One-Handed_Low` をゲーム進行に使用。
- PASS: 一回動作後は `02_Idle_2` へクロスフェード復帰。
- PASS: 受付GMのウェーブ、回転コイン、ヤシ、ランタンのフレーム差を確認。
- PASS: ブラウザコンソールにアニメーションクリップ欠落警告なし。

## 証跡

- `docs/screenshots/blackjack-table-first-v13-2026-08-07.png`
- `docs/screenshots/blackjack-leave-after-v13-2026-08-07.png`
- `docs/screenshots/mahjong-table-first-v13-2026-08-07.png`
- `docs/screenshots/gm-table-first-v13-2026-08-07.png`
- `docs/screenshots/thumbnail-table-first-v13-2026-08-07.png`

## リリースゲート

- 型検査: PASS (`tsc --noEmit`)
- 単体テスト: PASS (5 files / 16 tests)
- 本番ビルド: PASS (Vite 7.3.1 / 820 modules)
- XRift version: 14
- status: `ACTIVE` / `isPublic=false` / content hash `337765be02f3`
- CDN/asset: PASS。`remoteEntry.js`、World chunk、thumbnail、sky、Pirate Nation 5 assetsがHTTP 200かつローカル`dist`とSHA-256一致
- live instance: PASS。ログイン済みChromeで`テストルーム02`へ入室し、スポーン、スカイボックス、全体地図、受付、HUDを確認
- live evidence: `docs/screenshots/live-instance-v14-2026-08-07.png`
- QA退出: PASS。退室後、既存2インスタンスはいずれも`0/20`
