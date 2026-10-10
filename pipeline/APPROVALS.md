# 保護ファイルの承認記録

テスト・判定スクリプト・合否の数字を変えたときの記録。新しいものが下。

- 2026-10-10 追加: scripts/check/all.ts, scripts/check/core-purity.ts, scripts/check/exit.ts, scripts/check/exit/S0.ts, scripts/check/protected.ts, scripts/check/selftest.ts, scripts/lib/env.ts, scripts/vm/run.sh, spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md, tests/core.test.ts, tsconfig.core.json, tsconfig.json
- 2026-10-10 承認: S0の出口の検査: 作業環境から github.io に届かないため、届かない場合は GitHub 上の公開用の置き場に最新のビルドが載っているかを確かめる方式に切り替える。実際のURLでの表示は iPhone と Claude 側の別経路で確かめる（ユーザー承認 2026-10-10）。あわせて問い合わせ用の scripts/lib/http.ts を追加（変更: scripts/check/exit/S0.ts／追加: scripts/lib/http.ts）
- 2026-10-10 追加: scripts/check/exit/S1.ts
- 2026-10-10 承認: G0: ユーザーが契約書（最初の10分の台本、ルール、補完した決定1〜12）と合否の数字（最初の30分）を承認（2026-10-10）（変更: spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md）
- 2026-10-10 追加: scripts/check/acceptance.ts, scripts/check/exit/S2.ts, tests/game.test.ts
