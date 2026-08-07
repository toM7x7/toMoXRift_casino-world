# BLOCK RIICHI SKY PARK v9 QA

日付: 2026-08-05

## 視覚ゲート

- [x] 全体 56m × 42m の浮島に拡張
- [x] BJ と麻雀の中心間距離 30m
- [x] 主通路 6m、交差通路 4m
- [x] 遊技広場の壁・天井・横断ゲートを撤去
- [x] 床面サインと低い四隅マーカーへ変更
- [x] 12m × 10m の建設予定地を2区画確保
- [x] 交換所を開放カウンター化
- [x] 生成スカイと遠景浮島が全周で連続
- [x] 有限球体を廃止し、実インスタンスで黒い半球が出ない
- [x] BJの右側UIから3D卓中央が見える
- [x] 麻雀の右側UIから3D卓とNPCが見える

## 干渉ゲート

- [x] スポーン中心 3m を空ける
- [x] 主要動線から木・ランタンを退避
- [x] 建設予定地の罫線とマーカーは非コライダー
- [x] オープンデッキの四隅マーカーは非コライダー
- [x] 床と外周のみ固定境界を維持

## ブラウザ確認

- [x] `?mode=thumbnail`: コンソール error 0
- [x] `?mode=blackjack-hud`: コンソール error 0
- [x] `?mode=mahjong-hud`: コンソール error 0
- [x] ブラックジャック操作UIが画面右側
- [x] 麻雀操作UIが画面右側

## 配信ゲート

- [x] TypeScript
- [x] unit tests: 4 files / 12 tests
- [x] production build
- [x] XRift upload: version 8
- [x] Public API ACTIVE: content hash `635dd021bc81`
- [x] CDN asset hash: thumbnail / generated sky match local SHA-256
- [x] spawned instance screenshot: `docs/screenshots/live-v8-world-spawned-2026-08-05.png`

## 実インスタンス補足

- ゲスト参加ではアカウント用APIとWorld Storageが401になるため、ゲスト専用ローカル確認コインへフォールバックする。
- `remoteEntry.js`、World expose chunk、federation import chunk、生成スカイ、サムネイルは最新ハッシュ配下でHTTP 200。
- マイク拒否はブラウザ権限によるホスト側メッセージで、ワールド描画・ゲームUIのエラーではない。
