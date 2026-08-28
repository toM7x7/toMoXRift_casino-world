# Third-party assets

## XRift World Template

- Copyright: `Copyright (c) 2025 WebXR-JP`
- License: MIT
- Original license text: [`LICENSE-XRIFT-TEMPLATE`](LICENSE-XRIFT-TEMPLATE)

## Pirate Nation Art

- Source: https://github.com/proofofplay/piratenation-art
- License: CC0 1.0 Universal
- License file: https://github.com/proofofplay/piratenation-art/blob/main/LICENSE
- Local placement: `public/pn-*.gltf` (XRift CDN serves world assets from the
  built distribution root)

Selected files:

| Local file | Upstream path | SHA-256 |
| --- | --- | --- |
| `pn-starter-pirate.gltf` | `Voxel Game Assets/Avatar/animation/starter_036/starter_pirate_01.gltf` | `49ffe77bb4cf72a7b464188733d31f6d5c3c8c32a31aade51fbf58f9a2914b3c` |
| `pn-palm-tree-animated.gltf` | `Voxel Game Assets/world items/Trees/Palm Tree Animated/20221030/GLTF/PN-PalmTreeAnimated.gltf` | `0d4909fed8b01771f7f2939f0da88b70d4e43963c3044380a510441e7ad76a88` |
| `pn-gold-coin.gltf` | `Voxel Game Assets/resources/Gold Coin/ui_icon_coin.gltf` | `9dc4f701dc30dda6c3dcf0ea8a9f327a2f9e3659dd56977c134700f51d61a095` |
| `pn-barrel.gltf` | `Voxel Game Assets/collectibles/Barrel/model.gltf` | `a2c82223246b001516bc84e8db0b45712313bd79facaa3c190a0a21df91acadc` |
| `pn-faded-map.gltf` | `Voxel Game Assets/collectibles/Faded Map /model.gltf` | `d8e3a40184e4e07275474c180185a80e48cd633dfec989053fa75fb25610c216` |
| `pn-hippogriff-neutral.gltf` | `Voxel Game Assets/Mob Enemies /Hippogriff/Hippogriff Neutral /model.gltf` | `f9c6e9ee1655a6601b0c5868ce6ccf78d380ab5b662ff095b2dc30d7a8063601` |

The source repository uses Git LFS. These local files are verified asset
contents downloaded from GitHub's LFS media endpoint, not pointer files.

## RIFCoin developer kit

- Source: https://github.com/N-JELLY/RIFCoin-dev
- Reviewed commit: `86c5bbdeb0e806deaa0fb5e9a020ef45e6a6287e`
- Local integration: `src/integrations/rifcoin.ts`
- Purpose: public TypeScript client contract for balance reads and one-way RIFCoin payments
- Trust boundary: upstream v0.1 is intentionally unauthenticated and trusts client-supplied `userId` and `worldId`
## Generated animal emblem atlas

- Files: `public/design/animal-emblem-atlas-source-v31.png`, `public/design/animal-emblem-atlas-v31.png`
- Created: 2026-08-28 with OpenAI built-in image generation for this XRift world
- Purpose: shared 12-animal pixel-art icon system for the planned dice and Animal Jara facilities
- Runtime edit: nearest-neighbor resize from 1448x1086 to 768x576; no third-party source artwork used

## M PLUS 1p Japanese UI font

- Source: https://github.com/google/fonts/tree/main/ofl/mplus1p
- License: SIL Open Font License 1.1
- Local files: `public/fonts/MPLUS1p-Regular.ttf`, `public/fonts/MPLUS1p-OFL.txt`
- SHA-256: `2f294ad496432b1608f070d310e3aa2adcf1de4af429f4901df97ec4bd361ed1`
- Purpose: readable Japanese text for shared 3D panels, buttons, and Animal Jara tiles
