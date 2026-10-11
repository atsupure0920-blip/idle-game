# 放置ゲーム 開発リポジトリ

個人が1本の放置RPGを完成させるためのリポジトリ。人間（ユーザー）はコードを書かず、読まない。
実装・検査・進行は Claude が行う。全体の設計は「開発パイプライン v3」に従う。

## 最初に必ずやること

1. `bash scripts/vm/run.sh status` を実行し、いまの段階と「あなた待ち」を確かめる。
2. `pipeline/HANDOFF.md`（引き継ぎメモ）と `pipeline/DECISIONS.md`（v3 から変えた点）を読む。
3. いまの段階の作業に入る。段階の定義は v3、手順は `pipeline/commands/` にある。

## ユーザーの役割（これ以外を求めない）

仕様の記入、ゲートでの合図、画像生成、プレイ評価、権限。付随して、承認、アカウント作成、
ログの受け渡し、テスター3人への依頼。**コードを書く・読む・開発者ツールを開く、は求めない。**
説明は日本語で、専門用語を使わずに行う。

## 絶対の決まり

- **合否はスクリプトが決める。** 「通った」と報告してよいのは、終了コードが0だったときだけ。
  実行していない検査を、通ったことにしない。
- **保護ファイルを黙って変えない。** `tests/`、`scripts/check/`、`scripts/lib/`、`scripts/vm/`、
  `spec/ACCEPTANCE.yaml`、`spec/CORE_LOOP_CONTRACT.md`、`tsconfig*.json`。
  変更・削除は、理由を日本語でユーザーに示し、承認を得てから `protect -- approve --reason "理由"` で登録する。
  追加だけなら `protect -- add` でよい。テストを通すためにテストを緩めない。
- **core は純粋に保つ。** `src/core` と `src/sim` は、画面にも実際の時計・乱数にも触れない
  （`pipeline/rules/core.md`）。
- **同じ不具合の修正が3回続けて失敗したら、直し続けない。** 最後に動いたビルドへ `rollback` し、別の方法を取る。
- **範囲を勝手に広げない。** 仕様にないものは作らない。G3 以後の要望は `pipeline/BACKLOG.md` に積む。
- **パッケージは `pipeline/allowed-packages.txt` にあるものだけ。** ほかを足すときはユーザーに確認する。
- **秘密情報（鍵、トークン、パスワード）をリポジトリに置かない。会話にも貼らせない。**
- **作業は「検査が通る → 記録（コミット）」の単位で進める。** 途中で止まっても、最後の記録から再開できる。

## 実行のしかた

このフォルダは OneDrive の中にあるので、依存（node_modules）とビルドは作業用コピーで行う。
コマンドは必ずラッパー経由で実行する。

```bash
bash scripts/vm/run.sh status      # 状況
bash scripts/vm/run.sh check       # 全検査
bash scripts/vm/run.sh selftest    # 検査が落ちるべきときに落ちるか
bash scripts/vm/run.sh play        # 検査 → 番号付け → ビルド → 公開
bash scripts/vm/run.sh rollback 3  # build-3 の状態へ戻す
bash scripts/vm/run.sh deploy -- --dry-run  # 公開の準備と安全確認だけ（送らない）
bash scripts/vm/run.sh exit        # いまの段階の出口の検査
bash scripts/vm/run.sh acceptance  # 合否の数字（模擬プレイ）
bash scripts/vm/run.sh e2e-gate    # 通し操作テストの記録が、いまのソースのものか
bash scripts/vm/run.sh protect -- verify    # 引数を渡すときは「--」を挟む
```

通し操作テスト（`tests/e2e/run.ts`）は、本物のブラウザが要るので、この作業環境では走らない。
画面やルールを変えたら、Claude 側の環境で実行して記録を置く（`pipeline/rules/ui.md` の「画面を変えたとき」）。

git の操作（記録、番号付け）は、このフォルダに対して直接行う。記録の前に、接続フォルダでの削除の許可が要る
（git が一時ファイルを消すため）。

## ユーザーの言葉と手順の対応

ユーザーは次の言葉を打つ（先頭の「/」はあってもなくてもよい）。

| 言葉 | 手順 |
| --- | --- |
| status | `pipeline/commands/status.md` |
| next | `pipeline/commands/next.md` |
| play | `pipeline/commands/play.md` |
| rollback 番号 | `pipeline/commands/rollback.md` |
| art-in 番号 | S4 に入るときに作る |

保護ファイルの承認は `pipeline/commands/approve.md`、段階の出口での独立した検証は `pipeline/verifier.md`。

## どこに何があるか

| 場所 | 中身 |
| --- | --- |
| `spec/GAME_BRIEF.yaml` | ユーザーが書く仕様 |
| `spec/CORE_LOOP_CONTRACT.md` | 最初の10分の台本とルール（Claudeが書き、ユーザーが承認） |
| `spec/ACCEPTANCE.yaml` | 合否の数字 |
| `src/core/` | ルール（純粋） |
| `src/sim/` | 模擬プレイ |
| `params/` | 数値と団員の定義 |
| `src/ui/` | 画面（HTML/CSS）と進行役 |
| `src/debug/` | エラー表示とログの書き出し（公開用ビルドには入らない） |
| `tests/` | テスト |
| `scripts/` | ビルド、検査、状況、ロールバック |
| `pipeline/` | 決定、承認記録、保留の要望、手順、規約 |
| `feedback/` | 感想、作業時間のメモ |
