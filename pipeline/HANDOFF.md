# 引き継ぎメモ（新しいチャットで続きを始めるとき）

チャットが長くなったら、新しいチャットに切り替えてよい。必要なことは、すべてこのフォルダと GitHub に残してある。
新しいチャットの Claude は、まず `CLAUDE.md` とこのメモを読み、`status` を実行する。

## ユーザーがやること

1. Claude のアプリで新しいチャットを開き、このフォルダ（デスクトップの「idle game」）をつなぐ。
2. 「idle game の続き。CLAUDE.md と pipeline/HANDOFF.md を読んで、status を見せて」と送る。

## どこに何が残っているか

| 知りたいこと | 見る場所 |
| --- | --- |
| いまの段階と、あなた待ち | `bash scripts/vm/run.sh status` |
| 全体の進め方（段階 S0〜S7、ゲート G0〜G5） | 開発パイプライン v3（Claude の Docs。題名「中華系放置RPG 開発パイプライン v3（レビュー反映版）」）。要点は `pipeline/commands/` と `scripts/check/exit/` に実装済み |
| v3 から変えたこと、その理由 | `pipeline/DECISIONS.md` |
| ゲームの仕様 | `spec/GAME_BRIEF.yaml`（ユーザーが書いた）、`spec/CORE_LOOP_CONTRACT.md`（台本、ルール、決定） |
| 合否の数字 | `spec/ACCEPTANCE.yaml` |
| ユーザーの感想と要望 | `feedback/F-*.md`（1件1票）、`feedback/G1.md`（採点表） |
| 保留にした要望 | `pipeline/BACKLOG.md` |
| 承認の記録 | `pipeline/APPROVALS.md` |
| 最初の30分の計算結果 | 第2版は `pipeline/reports/S3-v2-first30.md`（第1版は `S2-first30.md`） |
| 第2版の作り（セーブの扱い、画面の構成、数値の作り、宿題） | `pipeline/DECISIONS.md` の D-013、D-014 |

## 作業のしかた（この環境に特有のこと）

- ユーザーのPCは Windows。このフォルダは OneDrive の中にある。Claude は、PC上の小さな Linux の作業環境からこのフォルダを読み書きする。
- 検査とビルドは、必ず `bash scripts/vm/run.sh <名前>` で行う（依存を OneDrive に置かないため。D-002）。
- **記録（git の commit や pull）の前に、このフォルダでの削除の許可を取る**（チャットごとに取り直しが要る）。
  許可がないと、git が途中で止まり、`.git/index.lock` が残る。残ったら、許可を取ってから消す。
- 作業環境から届くのは GitHub と npm だけ。公開URL（`*.github.io`）には届かないので、公開の確認は Claude 側の別の経路で行う。
- 作業環境にはブラウザがない。通し操作テスト（`tests/e2e/run.ts`）は Claude 側の環境で走らせ、
  結果の記録（`pipeline/reports/e2e-last.json`）をソースと一緒に記録する（D-012、`pipeline/rules/ui.md`）。
- Claude 側の環境で編集した場合は、`git bundle` で1つのファイルにまとめてこのフォルダへ送り、`git pull` で取り込む。
  **まとめたファイルの名前は、毎回変える**（同じ名前だと、古い中身が届いたことがあった）。
  このフォルダ側で番号（build-N）が付いたら、Claude 側にも同じ番号を付けておく。
- 鍵（GitHub のトークン）は `.secrets/github-token.txt` にある。中身を表示しない、会話に出さない、履歴に入れない。
- 履歴の作成者名は `idle-game <idle-game@users.noreply.invalid>`（ユーザーのメールアドレスを公開リポジトリに出さないため）。
  GitHub 上では「未検証」と表示されるが、動作には関係しない。過去の履歴は書き換えない（番号の目印が壊れる）。

## ユーザーとの決めごと

- ユーザーはコードを書かず、読まない。説明は日本語で、専門用語を使わず、結論から。
- ユーザーの役割は、仕様の記入、ゲートでの合図、画像生成（ChatGPT を使う）、プレイ評価、権限。
- 保護ファイル（テスト、判定スクリプト、契約書、合否の数字）は、理由を示して承認を得てから変える。
- 契約書にないルールは、黙って確定させない。提案として ○ ✕ を聞く。
- 質問は少なく。決められることは決めて、決めた内容を伝える。
