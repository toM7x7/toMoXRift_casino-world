# ブロック遊技村｜海賊カジノ＆アニマルじゃらβ

夕暮れのスカイボックスに浮かぶ、開放型のサンドボックス風カジノワールドです。
XRift上で1〜8人が、テーブル遊技と同期型の抽選遊技を遊べます。

## 主な機能

- ブラックジャック：無料着席、ラウンド参加2枚、引く／止める／倍掛け、標準3:2配当
- 簡易麻雀：1〜4人、NPC補完、13牌＋ツモ牌、初心者向けおすすめ操作
- 船長の運命盤：最大8人、8色単勝、5秒カウントダウンと同期回転
- 海賊魔獣ダービー：最大8人、4頭単勝、出走紹介と同期長距離レース
- 西港拡張：18m×38mの追加区画。Cは動物紋章ダイス建築予定地、Dは無料のアニマルじゃらβとして開放
- 共通動物紋章：陸・海・空の12種をドット絵アトラスとして先行設計
- アニマルじゃらβ：D開発地区でNPC3人入りの1人プレイを公開。現在はコイン増減なし。ローカルの `?mode=animal-jara-prototype` では配牌済み状態を確認可能
- 着席モード：カメラと移動を固定し、盤面外の個人ドックだけで進行
- 常時離席：3Dボタンまたは`X`キーで即時解除
- World Storage：プレイヤーごとのコインをインスタンスをまたいで保存
- 救済コイン：残高0枚のとき受付GMから10枚受け取り
- RIFCoin交換所：ログイン中の本人が任意の正整数を指定し、現在は1 RIF＝1枚で一方向交換
- プレイヤー間のコイン受け渡し
- Pirate Nation Art由来のCC0キャラクター・小物・アニメーション

## 現在のXRiftワールド

- World ID: `04f41fd3-3e59-45ee-9133-fd905a899ef3`
- 公開状態: 限定公開
- 検証済みリリース: version 14

### RIFCoin交換の現行制約

- 方向は `RIF → カジノコイン` のみです。カジノコインからRIFへは戻せません。
- レート、上限、方向は `src/game/rifExchange.ts` に集約しています。
- RIFCoin v0.1 APIは認証なしでクライアント申告のユーザーID／ワールドIDを信頼するため、現金・暗号資産・換金可能資産として扱いません。
- RIF決済とWorld Storage加算は単一トランザクションではありません。未完了交換はプレイヤーKVへ保存し、同じ交換IDで再試行します。
- 相互交換を有効化する前に、認証付き外部台帳とサーバー側の出金制御が必要です。

## 開発

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

設計・QA資料は[`docs/design`](docs/design)、実画面証跡は
[`docs/screenshots`](docs/screenshots)に保存しています。

---

## XRift World Template由来の開発メモ

XRiftで動作するWebXRワールドを作成するための公式テンプレートです。

## 概要

このテンプレートは、XRift CLIで新しいワールドプロジェクトを作成する際に使用されます。React Three Fiber、Rapier物理エンジン、Three.jsを使用した3Dワールドの基本構成がセットアップ済みで、すぐに開発を始められます。

## このテンプレートに含まれる機能

- **React Three Fiber**: Reactコンポーネントとして3Dシーンを構築
- **Rapier物理エンジン**: リアルな物理演算（衝突判定、重力など）
- **Three.js**: WebGLベースの3Dグラフィックス
- **Module Federation**: XRiftプラットフォームでの動的読み込み対応（`three/addons` を shared 依存として利用可能）
- **TypeScript**: 型安全な開発環境
- **サンプルワールド**: 物理演算やオブジェクト配置の実装例

## 使い方

### 1. XRift CLIをインストール

```bash
npm install -g @xrift/cli
```

### 2. XRiftにログイン

```bash
xrift login
```

### 3. 新しいワールドプロジェクトを作成

```bash
xrift create world my-world
```

### 4. 開発サーバーを起動

```bash
cd my-world
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開くと、一人称視点でワールドを確認できます。

| 操作 | キー |
|------|------|
| 視点操作 | 画面クリックでマウスロック → マウス移動 |
| 移動 | W / A / S / D |
| 上昇 / 下降 | E・Space / Q |
| インタラクト | 照準を合わせてクリック |
| マウスロック解除 | ESC |

### 5. ビルド

```bash
npm run build
```

## 開発コマンド

```bash
# 開発サーバー起動（ホットリロード有効）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# TypeScript型チェック
npm run typecheck
```

## 物理設定（physics）

xrift.jsonの`world.physics`セクションでワールドの物理動作をカスタマイズできます。

| 設定 | 型 | デフォルト | 説明 |
|------|-----|---------|------|
| `gravity` | number | 9.81 | 重力の強さ |
| `allowInfiniteJump` | boolean | true | 無限ジャンプを許可するか |

### 例：アスレチックワールド（無限ジャンプ禁止）

```json
{
  "world": {
    "physics": {
      "allowInfiniteJump": false
    }
  }
}
```

### 例：低重力ワールド

```json
{
  "world": {
    "physics": {
      "gravity": 3.0
    }
  }
}
```

## AI Agent Skills

AIコーディングエージェントを使ってワールドを制作する場合、以下のコマンドでXRiftワールド制作に必要な情報をエージェントに取り込めます。

```bash
npx skills add WebXR-JP/xrift-skills
```

対応エージェント: Claude Code, Cursor, Copilot, Codex 等（40以上）

## ドキュメント

ワールド開発の詳細（アセットの読み込み、SpawnPoint、Interactable、useInstanceStateなど）については、公式ドキュメントをご覧ください。

**[docs.xrift.net](https://docs.xrift.net)**

## 関連リンク

- [xrift-world-components](https://github.com/WebXR-JP/xrift-world-components) - ワールド開発用コンポーネントライブラリ
- [xrift-cli](https://github.com/WebXR-JP/xrift-cli) - XRift CLI
- [XRift](https://xrift.net) - XRiftプラットフォーム

## サポート

- Issues: [GitHub Issues](https://github.com/WebXR-JP/xrift-world-template/issues)

## ライセンス

MIT
