# BLOCK RIICHI FRONTIER — Host-Safe QA v7

Date: 2026-08-04
Scope: XRiftホストUI、コインHUD、コンパス、ホットバー、ブラックジャック、麻雀、PC・狭幅画面、主要コライダー。

## 原因計測

XRift version 4の実インスタンス（1440×900）で、Drei `Html fullscreen` の基準点が3Dワールド原点の投影位置になっていた。

| Element | Measured rectangle |
|---|---|
| fullscreen root offset | `y = +140.682px` |
| coin HUD | `x=18, y=158.7, w=224, h=167.5` |
| compass | `x=598.3, y=158.7, w=243.5, h=40` |
| hotbar | `x=595.5, y=958.7, w=249, h=66` |
| viewport | `1440×900` |

ホットバーはXRift UIとの重なりではなく、下端が画面外へ押し出されていた。

## v7修正

- [x] 全screen-space `Html`に画面中央固定の`calculatePosition`を適用。
- [x] XRift上部操作の下へ内部UIを配置する84pxセーフトップを設定。
- [x] デスクトップホットバーを中央下から左下へ移動。
- [x] 899px以下では非操作ホットバーを非表示。
- [x] 559px以下ではコンパスを`BJ / 受付 / MJ`へ短縮。
- [x] 狭幅ではコンパスとコインHUDを2段に分離。
- [x] 9px以下の文字を廃止し、主情報12px・補助情報11px以上へ変更。
- [x] ゲームドックを画面下から112px、compact時88px離す。
- [x] ゲームドックに最大高さと縦スクロールを設定。
- [x] 麻雀牌を狭幅36×50pxへ縮小し、7+7相当で折り返す。

## ローカル矩形検証

### Desktop 1440×900

| Element | Rectangle | Result |
|---|---|---|
| coin HUD | `18,84,224,176` | PASS |
| compass | `598.3,84,243.5,39` | PASS |
| hotbar | `18,816,249,66` | PASS |
| Mahjong dock | `340,604,760,184` | PASS |
| Blackjack dock | `360,615,720,173` | PASS |

### Narrow 390×844

| Element | Rectangle | Result |
|---|---|---|
| compass | `12,76,366,38` | PASS |
| coin HUD | `12,124,210,176` | PASS |
| hotbar | `display:none` | PASS |
| Mahjong dock | `12,503,366,253` | PASS |

HUD下端は300px、ゲームドック上端は503pxで、203pxの非干渉領域を確保した。

## 空間・コライダー

| Target | Visible geometry | Collider | Result |
|---|---|---|---|
| build plate | `32×0.3×26m` | half extents `16×0.15×13m` | PASS |
| spawn | `[0,0,11]`, clear `r=2m` | floor上 | PASS |
| main route | width `4m` | blocking props `0` | PASS |
| building entrance | clear width `5.5m` | fixed cuboids | PASS |
| exchange | approach width `4m` | fixed cuboids | PASS |
| game tables | visible table body | fixed cuboids | PASS |

## Screenshots

- `docs/screenshots/ui-v7-desktop-hud-2026-08-04.png`
- `docs/screenshots/ui-v7-mobile-hud-2026-08-04.png`
- `docs/screenshots/ui-v7-desktop-mahjong-hud-2026-08-04.png`
- `docs/screenshots/ui-v7-desktop-blackjack-hud-2026-08-04.png`
- `docs/screenshots/ui-v7-mobile-mahjong-hud-2026-08-04.png`

## Gates

- [x] TypeScript typecheck
- [x] Unit tests: 10/10
- [x] Production build: 813 modules
- [x] Local PC visual
- [x] Local narrow visual
- [x] XRift version 5 upload
- [x] XRift live desktop rectangle check
- [x] XRift live narrow screenshot
- [x] CDN representative asset check

## XRift version 5 evidence

- World ID: `04f41fd3-3e59-45ee-9133-fd905a899ef3`
- API status: `ACTIVE`
- Content hash: `1127c49e9f91`
- Live desktop:
  - coin HUD `18,84,224,178`
  - compass `598.3,84,243.5,40`
  - hotbar `18,816,249,66`
- Live narrow:
  - compass `12,76,366,38.5`
  - coin HUD `12,124,210,178`
  - hotbar `display:none`
- World content hash配下の404: 0
- World由来のconsole error: 0
- `remoteEntry.js`、World chunk、Federation helper、React DOM client、thumbnail: HTTP 200
- CDN thumbnailと`public/thumbnail.png`のSHA-256一致
- Live screenshots:
  - `docs/screenshots/ui-v7-live-desktop-2026-08-04.png`
  - `docs/screenshots/ui-v7-live-mobile-2026-08-04.png`
