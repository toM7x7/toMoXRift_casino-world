# Thumbnail review — neon-casino-club — animal-jara beta

## Attempt

- Source: `docs/screenshots/thumbnail-source-animal-jara-beta-2026-08-28.png`
- Draft/final: `public/thumbnail.png`
- Viewport: 1280×720
- Copy: `ブロック遊技村` / `アニマルじゃらβ 公開` / `無料βテスト`

## Evidence

- Source gate: PASS (`occupied=1.000`, `stddev=37.8`)
- Visual read at card size: タイトル、β、9枚の動物牌を識別可能
- Hero subject: 実ワールドのD区画β卓と手牌
- Text legibility: M PLUS 1p、暗色プレート、金枠で確保
- UI/debug residue: なし
- Claim accuracy: 無料・β・アニマルじゃら公開は実装状態と一致

## Classification

- Issue type: design
- Observation: 実景だけでは小サイズ時にワールド名とβ公開が伝わりにくい
- Hypothesis: 左上に2段タイトル、右上に無料βバッジを置けば盤面を隠さず伝達できる
- Single change for next attempt: 実景を全画面維持したままタイトルプレートとバッジだけを追加
- Result: 320×180でもタイトルとβ公開が読め、牌と卓も中央に残った
- Next decision: この版を登録する
