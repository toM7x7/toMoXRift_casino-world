# ブロック遊技村｜ブラックジャック＆麻雀入門

夕暮れのスカイボックスに浮かぶ、開放型のサンドボックス風カジノワールドです。
XRift上で1〜4人のプレイヤーとNPCがブラックジャック／簡易麻雀を遊べます。

## 主な機能

- ブラックジャック：1〜4人、NPC補完、「1枚引く」「止める」の日本語操作
- 簡易麻雀：1〜4人、NPC補完、13牌＋ツモ牌、初心者向けおすすめ操作
- 着席モード：カメラと移動を固定し、盤面外の個人ドックだけで進行
- 常時離席：3Dボタンまたは`X`キーで即時解除
- World Storage：プレイヤーごとのコインをインスタンスをまたいで保存
- 救済コイン：残高0枚のとき受付GMから10枚受け取り
- プレイヤー間のコイン受け渡し
- Pirate Nation Art由来のCC0キャラクター・小物・アニメーション

## 現在のXRiftワールド

- World ID: `04f41fd3-3e59-45ee-9133-fd905a899ef3`
- 公開状態: 限定公開
- 検証済みリリース: version 14

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
