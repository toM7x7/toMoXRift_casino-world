# ネオン遊技場｜ブラックジャック＆麻雀入門

- Slug: `neon-casino-club`
- Template: `WebXR-JP/xrift-test-world`
- Created: `2026-08-03T08:01:18.763Z`
- Blueprint: `docs/design/casino-experience.yaml`
- Authoritative layout: `src/design/casino-layout.json`

## XRift Metadata

- Title: `ネオン遊技場｜ブラックジャック＆麻雀入門`
- Description: `日本語案内付きのブラックジャックとテンパイ開始の麻雀入門を、NPC・GMと一人で遊べるWorld Storage対応カジノワールド`

## Design artifacts

- Experience and rules: `docs/design/casino-experience.yaml`
- Dimensioned scene layout: `src/design/casino-layout.json`
- Architectural floor plan: `docs/design/generated/casino-floorplan-v3.png`
- Industrial three-view sheet: `docs/design/generated/casino-three-view-v3.png`
- Spatial concept image: `docs/design/generated/casino-spatial-concept-v3.png`
- Interior fixture dimensions: `src/design/interior-fixtures.json`
- Interior design direction: `docs/design/interior-design-v4.yaml`
- A1 fixture/detail sheet: `docs/design/generated/casino-interior-detail-sheet-v4.png`

## Experience

- Spawn: `[0, 0, 11]`, `yaw=0`, with a 2.2m clear radius and Japanese entrance guide.
- Blackjack: fixed 2-coin wager, Japanese Start/Draw/Stand actions, dealer stands on 17, 4-coin normal win, 5-coin natural, 2-coin push return.
- Mahjong: a beginner-oriented, no-call solo table against three NPCs. Every round starts from a verified tenpai hand, draws automatically, highlights a recommended discard, shows waits in Japanese, pays 6 coins on tsumo, and refunds 2 coins on exhaustive draw.
- Wallet: `useWorldStorage().player` key `casino.coins.v1`; all balance changes use atomic `increment`.
- Relief: a balance that reaches zero remains at zero until the player interacts with the GM reception button; the reception grants 10 coins only at zero balance.
- Guests/local preview: session-only wallet fallback; authenticated XRift users persist across instances.
- Repeatable visual capture: `/?mode=thumbnail` uses a fixed overview camera; `/?mode=mahjong` isolates the beginner table; `/?mode=gm` frames the reception claim button.
- XRift thumbnail config: `thumbnail.png`, sourced from `public/thumbnail.png` and copied to `dist/thumbnail.png` during build.

## Geometry

- Room: `32m × 26m × 7m`.
- Floor: visible box `32 × 0.3 × 26m`; collider half-extents `[16, 0.15, 13]`.
- Walls: visible thickness `0.3m`; matching explicit cuboid colliders.
- Central circulation aisle: `4m`; minimum table clearance: `2.2m`.
- Blackjack table top: `5.4 × 0.24 × 3.4m`, top height `0.82m`.
- Mahjong table top: `4.8 × 0.24 × 4.4m`, top height `0.82m`.

## XRift Release

- World ID: `04f41fd3-3e59-45ee-9133-fd905a899ef3`
- Uploaded version: `3`
- Status: `ACTIVE`
- Visibility: private (`isPublic=false`)
- Version 3 scene hash: `e6a5a47f473e`
- Uploaded at: `2026-08-03T15:09:36.240Z`
- Version 3 redesign: local implementation in progress; not uploaded until visual acceptance.

## Version 4 QA

- Visual review: PASS at `1280 × 720` for the overview and focused Mahjong camera.
- Browser console: `0` application errors and `0` missing-glyph warnings; remaining warnings originate in Three.js/dependency deprecations.
- TypeScript: PASS.
- Vitest: PASS (`3` files, `10` tests).
- Production build: PASS.
- Upload: PASS; XRift version 3 is `ACTIVE` and private.
- Screenshot review: overview `82/100`; GM reception after spacing correction `84/100`.
- Release screenshot: `docs/screenshots/thumbnail-release-2026-08-04.png`.
- CDN verification: `remoteEntry.js`, exposed world chunk, federation helper, top-level React DOM client bundle, and thumbnail all returned HTTP 200.
- Remote thumbnail SHA-256 matches `public/thumbnail.png`.

## Player-to-player transfer boundary

- World Storage allows reading another user's player values but only writing the current user's player values.
- A world component therefore cannot atomically debit one user and credit another using `useWorldStorage` alone.
- A trusted transfer requires a server-side transaction endpoint with authentication, balance validation, idempotency, and an immutable ledger.
