# 卓上操作 v11 QA

実施日: 2026-08-05

## 修正内容

- QA用Playwrightセッション `casino-live-v9` と `casino-live-v10` をcloseし、ゲスト接続を終了した。
- 共通椅子モデルの背もたれをローカル `z=-0.3` から `z=+0.3` へ移動した。
- BJの私有操作グループを各座席から卓中央へ向かう視線上へ移動した。
- ゲーム中の操作を「1枚引く」「止める」の2択に限定した。
- 自分のカード直下に現在の合計値を表示した。
- 「離席」は開始前と結果画面だけに表示する。

## 検証

- `npm run typecheck`: PASS
- `npm run test`: PASS（5 files / 16 tests）
- Playwright console error: 0
- 椅子前後: PASS
  - `docs/screenshots/blackjack-entry-chair-v11-2026-08-05.png`
- BJ着席操作: PASS
  - `docs/screenshots/blackjack-seat-controls-v11-2026-08-05.png`
- サムネイル:
  - `docs/screenshots/thumbnail-tabletop-v11-2026-08-05.png`

## 公開検証

- XRift upload: PASS（version 11）
- Public API: `ACTIVE` / `currentVersionNumber=11`
- CDN content hash: `7e3fe3c72c54`
- `remoteEntry.js`: HTTP 200
- `__federation_expose_World-dX99X3ZU.js`: HTTP 200
- `__federation_fn_import-BY9gngOw.js`: HTTP 200
- `block-village-twilight-sky.png`: HTTP 200
- `thumbnail.png`: HTTP 200 / ローカルSHA-256一致
- 実インスタンス: PASS
  - `docs/screenshots/live-instance-v11-2026-08-05.png`
- 旧QAセッションclose後、新規QA入室前の参加者表示は `1 / 20`。旧QA接続が残っていないことを確認した。
- 最終確認セッション `casino-live-v11` もスクリーンショット取得直後にcloseした。
