# RIF → カジノコイン 一方向交換 v25

## 今回の完成範囲

- 受付でログイン中の本人のRIF残高を取得する。
- `-100 / -10 / -1 / +1 / +10 / +100` の3Dボタンで任意の正整数を作る。
- 変換前にRIF支払額、カジノコイン受取額、逆変換不可を常時表示する。
- 明示的な確定操作後だけRIFを決済する。
- RIF決済成功後だけ `casino.coins.v1` を加算する。
- 変換失敗時はカジノコインを加算しない。
- 通信結果が不明な場合、KVに保存した同一 `clientTransactionId` で再試行する。
- カジノ残高0枚で、RIF残高も0またはRIFを利用不能な場合だけ、床の救済ボタンから10枚受け取れる。RIF確認中は無効、RIFが1以上なら交換所を案内する。

流通量ダッシュボードと秘匿風運営室は次工程とし、今回は交換成功時の参考累計値だけ保存する。

## 可変レート

設定元は `src/game/rifExchange.ts` の `RIF_EXCHANGE_CONFIG`。

```text
rateVersion: rif-to-casino-v1
rifUnits: 1
casinoCoinUnits: 1
minimumRif: 1
maximumRif: 1000000 (API技術上限。公開前に運営上限へ下げる)
rounding: reject-fraction
reverseExchangeEnabled: false
```

レートは整数比で持つ。将来、割り切れない入力が生じるレートへ変更した場合は黙って切り捨てず、その入力を拒否する。

## 交換状態機械

```text
入力・見積
  → player KVへ created を保存
  → RIFCoin pay (同一IDで冪等)
  → player KVを rif-paid へ更新
  → casino.coins.v1 を加算
  → 完了レシートを保存
  → pendingを削除
```

RIF決済とWorld Storageは別システムなので完全な原子性はない。`rif-paid` 後に障害が起きた場合は同額再試行を案内する。相互交換を始める前に、外部バックエンドでRIF引落しとカジノ裏付け残高を一体管理する。

## KVキー

| キー | スコープ | 用途 |
| --- | --- | --- |
| `casino.coins.v1` | player | 現在のカジノコイン残高 |
| `casino.exchange.pending.v1` | player | 未完了交換の再試行情報 |
| `casino.exchange.last.v1` | player | 直近の完了レシートと二重反映確認 |
| `casino.flow.rif-in.v1` | shared | RIF流入累計の参考値 |
| `casino.flow.coin-minted.v1` | shared | 交換発行累計の参考値 |
| `casino.flow.exchange-count.v1` | shared | 交換回数の参考値 |

shared集計は `increment` を使うが、監査正本ではない。World Storageのsharedは参加中の認証ユーザーが書け、読取値も秘密ではない。

## 信頼境界

- 本番worldIdは `.xrift/world.json.id` の `04f41fd3-3e59-45ee-9133-fd905a899ef3`。
- 個人決済のuserIdは `useUsers().localUser.id` 固定。入力欄を設けない。
- RIFCoin v0.1にはAPI key、OAuth、JWT、署名検証がない。
- CORS、XRift permissions、worldIdは認証ではない。
- ゲストとローカルプレビューでは交換を実行しない。
- 将来の逆変換には、認証付き外部台帳、裏付け残高、出金上限、手数料、照合画面が必須。
