# ブロック遊技村 A/B増築・全体更新マスタープラン v15

## 結論

Aを「船長の運命盤」、Bを「海賊魔獣ダービー」とし、既存のBJ、麻雀、GM受付を残したまま、5遊技地区を一周できるワールドへ更新する。

今回作成するv15は次回リリース候補の設計名であり、まだ実装・公開されたバージョンではない。A/Bだけを先に置くのではなく、設計JSONと実装寸法のずれ、スポーン地図、HUD重複、北側の行き止まりを先に整える。

## 現状監査からの判断

現行の主軸道路は設計JSONではz=18〜-10だが、実装はz=19〜-13である。BJ/MJもJSONの12×11mに対して実表示は12×10m。スポーン地図の実座標と寸法は設計JSONに存在しない。

この状態でA/Bを追加すると、図面、コライダー、地図、撮影視点が別々の数値を持つ。Phase 1でv15 JSONを唯一の寸法原本にし、既存表示へ数値を合わせてから増築する。

## 全体構成

南から北へ三層に分ける。

1. 入口層：スポーンと全体地図
2. 中央層：カード酒場、交差広場、牌工房
3. 北側層：船長の運命盤、GM受付、海賊魔獣ダービー

主軸6mと中央横断路4mは維持する。北側へ幅2.5mの横断プロムナードを追加し、BJからA、麻雀からBへ幅2.4mの短絡路を追加する。これにより、どのゲームからも中央へ戻らず次のゲームへ移動できる。

## エリアA：船長の運命盤

12×10m区画へ直径6.2mの水平回転盤を置き、中心へPirate NationのWooden Helmを流用する。4つの投票席が4色の結果候補に対応し、賭け金は1・3・5枚。

投票席には既存着席制御を再利用するが、BJで問題になった操作詰まりを再発させないため、pointer lock不要、常時表示の離席、Xキー離席、席再クリック離席を必須とする。

「総取り」は空間仕様では確定しない。参加者が1人のときの面白さ、NPC種銭、複数勝者の端数、切断精算が決まってからゲーム仕様として承認する。

## エリアB：海賊魔獣ダービー

前回作成した12×10m・4レーン設計をそのまま接続する。初回はHippogriff Neutral一体をcloneして色調整し、ロード・描画負荷を計測する。公式4属性モデルへの切替は実機プロファイル後に決める。

## UIUX更新

情報の担当を分離する。

- 空間：場所、方向、入口、ゲーム種別
- 3D操作盤：参加、賭け金、投票先、開始、取消
- 画面HUD：自分のコイン、保存状態、参加中ゲーム、自分の選択、短い通知

左上のコインと折り畳み参加者一覧は残す。常駐通知は3.5秒トーストへ変え、上中央の3地区ナビと左下の疑似ホットバーは削除する。ゲームに近づいたときだけ文脈バーを出し、参加後の操作パネルはデスクトップ右、モバイル下部へ置く。

スポーン地図は現在の[4.2, 0, 9.5]から[4.8, 0, 15.2]へ移し、上端を約3.32mから2.55mへ下げる。スポーンから中心距離5.56mで読め、主軸道路と交換所を遮らない位置になる。文言は「椅子をクリック」から「色の道を歩いて遊技台へ」へ変更する。

## 既存アセット流用

| 区分 | アセット | 方針 |
|---|---|---|
| 維持 | starter pirate | BJ、麻雀、受付。A/B追加GMは最大2体 |
| 維持 | animated palm ×4 | 外周ランドマーク。追加しない |
| 維持 | gold coin | 受付の中心標識 |
| 維持 | barrel | 低い境界。A/B追加は計4個まで |
| 維持 | faded map | 受付小物。巨大地図へは拡大しない |
| 新規候補 | [Wooden Helm](https://github.com/proofofplay/piratenation-art/tree/main/Voxel%20Game%20Assets/collectibles/Wooden%20Helm) | A回転盤の中心。親groupを回転 |
| 新規候補 | [animated skull flag](https://github.com/proofofplay/piratenation-art/tree/main/Voxel%20Game%20Assets/world%20items/Decorations/deco_flag_skull) | A/B入口に各1本。idle01/idle02あり |
| 新規候補 | [brown crate](https://github.com/proofofplay/piratenation-art/tree/main/Voxel%20Game%20Assets/world%20items/Decorations/Crates/crate_brown) | 操作台脚とスタート小物。最大4個 |
| 新規候補 | [Hippogriff Neutral](https://github.com/proofofplay/piratenation-art/tree/main/Voxel%20Game%20Assets/Mob%20Enemies/Hippogriff) | Bの初回負荷計測用 |
| 計測後 | Hippogriff 4属性 | 実機負荷通過後のみ |
| 保留 | anchor、rope | 意味がある1〜4箇所に限定 |
| 除外 | cannon、raffle ticket大量配置 | 衝突、演出、UI密度を増やすため後回し |

新規ユニークGLTFは最初の更新で4種類まで。追加ライトは0、旗2、レーサー4、粒子96以下とする。

## 更新順序

1. 設計承認
2. 寸法原本統合、地図移設、HUD整理
3. 北側回遊路とA/B灰色箱、コライダー検証
4. Bダービー同期・精算PoC
5. A運命盤の配当仕様確定と同期PoC
6. 既存アセット統合、演出、負荷計測
7. 1〜4人実インスタンスQA、撮影、GitHub同期、XRift upload

技術PASSとビジュアルPASSは別に記録する。既存BJ/MJの操作と離席、受付10枚、World Storageを回帰確認するまでアップロードしない。

## 実装の分割と巻き戻し

実装時はA/Bを直接 `World.tsx` へ積み上げず、次の責務へ分ける。

| 単位 | 責務 | 巻き戻し |
|---|---|---|
| WorldNavigation | 道路、床ライン、地図 | 現行道路・地図へ戻す |
| CaptainsFateWheel | A空間・投票・抽選 | FuturePlot Aへ戻す |
| MonsterDerby | B空間・競走・精算 | FuturePlot Bへ戻す |
| PirateNationExpansionAssets | 新規GLTF読込 | 灰色箱・既存Blockへ戻す |
| CasinoHud | 表示整理のみ | 現行HUDへ戻す |

A/Bは個別feature gateを持ち、初期値は無効にする。無効時には現在の建設予定地を表示し続ける。両方の同時公開を前提にせず、Bだけが先にQAを通過した場合はBだけ公開できる。

コインデータ経路は変えない。`CasinoEconomyProvider` と `casino.coins.v1` を維持し、HUD整理、新ゲーム追加、World Storage変更を一つのコミットへ混ぜない。

実装コミットは `navigation → graybox → B gameplay → A gameplay → assets` の順に分ける。各段階でデスクトップ、コンパクト、既存BJ/MJ、受付、A/B、全景のスクリーンショットを残す。
