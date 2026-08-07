# Improvement Log

- World: `neon-casino-club`
- Started: `2026-08-03T08:01:18.764Z`
- Template: `WebXR-JP/xrift-test-world`

## Current Hypothesis

- The main hook is: two complete solo table loops inside a compact social casino room.
- The biggest current risk is: XRift platform injection and Japanese glyph rendering differ from local preview.
- The next proof point is: local interaction/visual QA, followed by authenticated World Storage QA on XRift.

## Iterations

| Date | Change | Result | Next Step |
| --- | --- | --- | --- |
| 2026-08-03 | Initial scaffold | Complete | Build the casino room |
| 2026-08-03 | Added blackjack, speed mahjong, NPCs, coin HUD, and World Storage economy | Typecheck/build/7 logic tests passed; browser layout PASS | Authenticated XRift storage QA |
| 2026-08-03 | Fixed spawn yaw and raised room lighting after browser inspection | Visual PASS at 1280x720 | Preserve capture as release thumbnail |
| 2026-08-03 | Removed nested `react-dom/client` Module Federation share after CDN graph inspection | v2 ACTIVE; scene/expose/helper/top-level client/thumbnail all HTTP 200 | Owner test-instance gameplay QA |
| 2026-08-03 | Moved zero-balance relief from automatic payout to the GM reception | Zero balance now persists until the player explicitly claims 10 coins | Authenticated reception claim QA |
| 2026-08-07 | Added selected CC0 Pirate Nation characters, animated palms, coin, barrels, and map prop | Animated models render without T-pose or console errors; five glTF assets copy hash-identically into `dist` | Verify CDN assets and live instance |
| 2026-08-07 | Reset table sessions to v12 and simplified Japanese table controls | Stale QA seats no longer carry over; BJ remains two actions; mahjong gains one-press recommended discard | Multi-user live table QA |
| 2026-08-07 | Removed first-load automatic coin grant | New wallets start at zero and explicitly claim ten coins from the animated GM reception | Authenticated first-visit QA |
| 2026-08-07 | Repacked Pirate Nation glTF files at the CDN root after rejecting the v12 nested-asset release | v13 is ACTIVE; remote entry, World chunk, thumbnail, sky, and all five glTF assets return HTTP 200 with matching hashes | Authenticated owner-instance gameplay QA |

## Findings

- Finding 1: the generated template pinned world-components 0.41.0; useWorldStorage requires the current 0.46.0 package.
- Finding 2: World Storage is milestone persistence, so only game bets, payouts, initial grants, and reception claims write.
- Finding 3: Player storage is writable only by its owner; secure player-to-player transfer needs a trusted server-side transaction.

## Backlog

- [ ] Authenticated XRift test for persisted balance and remote-player balance reads
- [x] Replace procedural NPCs with authored character assets if visual direction is accepted
- [x] Add NPC and environmental animation after the core loop is accepted
- [ ] Add sound after live animation/performance acceptance
