# ブロック遊技村 v15 画像生成プロンプト記録

## 使用方式

Codex組み込み画像生成を使用。画像は空間の雰囲気と視線バランスの確認用で、寸法原本は `world-expansion-masterplan-v15.json` と三面図SVGとする。

## 採用コンセプト

```text
Use case: stylized-concept
Asset type: XRift WebXR world masterplan concept render for design review
Input images: Image 1 is the current world visual and voxel style reference. Image 2 is the authoritative top-down spatial masterplan and zone placement reference. Image 3 is the approved visual language for the back-right four-lane monster derby.
Primary request: Create a polished wide 16:9 elevated three-quarter view from just behind the spawn, showing the complete redesigned 56m by 42m open-air pirate voxel game village in one coherent scene.
Scene/backdrop: Preserve the warm twilight open sky, distant floating-island mood, grassy block platform, sandstone and dark navy pirate details, palms and lantern warmth from Image 1. No enclosing architecture.
Spatial layout: Follow Image 2. Foreground is an uncluttered spawn and a low readable map board on the front-right. A wide 6m center road runs toward the gold coin exchange at the back-center. Middle-left is the existing magenta blackjack card deck; middle-right is the existing cyan mahjong deck. Back-left is Area A, a 12m by 10m captain's fate wheel with a huge horizontal circular roulette deck and a wooden ship helm hub, four voting positions and one amber skull flag. Back-center is the existing coin exchange and animated gold coin landmark. Back-right is Area B, the approved 12m by 10m straight four-lane monster derby based on Image 3, with one cyan, one brown, one orange-red and one blue lane, four same-species voxel racers, a low viewing rail, compact betting console, slim result tower and one blue skull flag. Add the 2.5m north promenade connecting A-exchange-B and the two 2.4m links behind blackjack and mahjong so the circulation loop is visually obvious.
Existing asset reuse: Keep exactly four animated-style palms at the outer corners, a few existing barrels around the old game decks and exchange, friendly pirate NPCs at functional game positions, the rotating gold coin at exchange, modest crates as structural supports, and no decorative asset spam.
Style/medium: High-quality stylized 3D voxel game concept art, Minecraft-like readability with Pirate Nation warmth, coherent React Three Fiber-buildable geometry, designed and spacious rather than crowded.
Composition/framing: Entire rectangular platform visible, symmetrical but not sterile, camera high enough to read all five game districts and the loop, no dramatic crop, the center road remains open. The new A and B landmarks balance the skyline without hiding the exchange.
Lighting/mood: Twilight purple-orange sky, warm lantern accents, cool ambient fill, clear silhouettes and gentle soft shadows.
Constraints: No walls, no roofs, no large buildings, no giant floating HUD, no screen UI, no dense crowd, no narrow alleys, no more than four racers, no extra game zones, no misplaced oval derby, no exaggerated stadium seating. The low spawn map must not block the central view. Use only simple A, B, BJ, MJ symbols if any text-like marks appear; avoid sentences.
Avoid: photorealistic casino, realistic horses, modern racetrack, giant slot machines, enclosed casino hall, excessive flags, excessive crates, random ships, illegible pseudo-Japanese text, watermark.
```
