# Thumbnail review — neon-casino-club — overview

## Attempt
- Source: `thumbnail-source-overview-2026-08-29.png`
- Decoration: `thumbnail-decoration-imagegen-2026-08-29.png`
- Draft/final: `../../public/thumbnail.png`
- Viewport: `1280x720`
- Copy: `ブロック遊技村` / `BJ・運命盤・ダービー・アニマルじゃらβ`

## Evidence
- Source gate: PASS (`occupied=1.000`, `stddev=35.8`)
- Visual read at card size: title and four-corner pirate-casino treatment remain legible
- Hero subject: the real overview keeps the fate wheel, exchange, blackjack, mahjong, and derby areas visible
- Text legibility: PASS at `320x180`
- UI/debug residue: none
- Claim accuracy: all named games or areas exist in the current world

## Classification
- Issue type: design
- Observation: the raw overview accurately showed the world but lacked a clear marketplace-card hierarchy
- Hypothesis: a centered title plate and edge-only decorative layer will improve recognition without falsifying the scene
- Single change for next attempt: add one transparent ImageGen pirate-casino edge treatment and deterministic Japanese title plate
- Result: PASS; the source scene remains dominant and the card-size read is stronger
- Next decision: register this composition as `public/thumbnail.png`
