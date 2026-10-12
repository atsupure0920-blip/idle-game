# 保護ファイルの承認記録

テスト・判定スクリプト・合否の数字を変えたときの記録。新しいものが下。

- 2026-10-10 追加: scripts/check/all.ts, scripts/check/core-purity.ts, scripts/check/exit.ts, scripts/check/exit/S0.ts, scripts/check/protected.ts, scripts/check/selftest.ts, scripts/lib/env.ts, scripts/vm/run.sh, spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md, tests/core.test.ts, tsconfig.core.json, tsconfig.json
- 2026-10-10 承認: S0の出口の検査: 作業環境から github.io に届かないため、届かない場合は GitHub 上の公開用の置き場に最新のビルドが載っているかを確かめる方式に切り替える。実際のURLでの表示は iPhone と Claude 側の別経路で確かめる（ユーザー承認 2026-10-10）。あわせて問い合わせ用の scripts/lib/http.ts を追加（変更: scripts/check/exit/S0.ts／追加: scripts/lib/http.ts）
- 2026-10-10 追加: scripts/check/exit/S1.ts
- 2026-10-10 承認: G0: ユーザーが契約書（最初の10分の台本、ルール、補完した決定1〜12）と合否の数字（最初の30分）を承認（2026-10-10）（変更: spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md）
- 2026-10-10 追加: scripts/check/acceptance.ts, scripts/check/exit/S2.ts, tests/game.test.ts
- 2026-10-10 承認: 2026-10-11 ユーザーの回答（提案13は却下、14は採用、15は採用＋挑発と優先攻撃の能力を追加）を契約書に反映。テストは、13の却下に合わせて「新しい団員はレベル1から」に直し、狙う相手・挑発・後列ねらいのテスト3件を足した（緩める変更はなし）（変更: spec/CORE_LOOP_CONTRACT.md, tests/game.test.ts）
- 2026-10-10 追加: scripts/check/e2e-gate.ts, scripts/check/exit/S3.ts, scripts/lib/source-hash.ts, tests/e2e/run.ts, tests/flow.test.ts
- 2026-10-11 追加: scripts/lib/content.ts, tests/fixtures/save-build-4.json
- 2026-10-11 承認: 第2版（核の循環の作り直し）: ユーザーが 2026-10-11 に、契約書の第2版（決定16〜27への回答と最初の10分の台本）と合否の数字の第2版を承認した。それに合わせて、ルールのテスト（tests/game.test.ts）、通しの流れのテスト（tests/flow.test.ts）、通し操作テスト（tests/e2e/run.ts）、模擬プレイの判定（scripts/check/acceptance.ts）を第2版のルールで書き直した。なくなった仕組み（自動で進む、手前の面での稼ぎ、勝てる見込み、ボスの入団）の検査は外し、新しい仕組み（挑戦、箱、相棒、ミッション、日課、レア度、まとめて稽古、第1版のセーブの扱い）の検査を足した。テストは51件から80件に増えた（変更: scripts/check/acceptance.ts, spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md, tests/e2e/run.ts, tests/flow.test.ts, tests/game.test.ts）
- 2026-10-11 承認: 合否の数字のうち「新しい面を突破できなかった時間の最長（ふつうの人の9割）」を 6分以下 → 8分以下 に変更。ユーザーが 2026-10-11 に、理由（「12分までは負けない」と「30分で26面目まで」を両方守ると、負けて稽古してもう一度負けた面が6分を超える。6分は第1版の数字の持ち越しだった）を聞いたうえで承認。ほかの項目と、ゲームの数値は変えていない（変更: spec/ACCEPTANCE.yaml）
- 2026-10-11 追加: tests/fixtures/save-build-5.json
- 2026-10-11 承認: 第3版（稽古・レア度・勧誘・装備・6人編成の作り直し）: ユーザーが 2026-10-12 に、改訂28〜41への回答のうえで、契約書の第3版（最初の10分の台本、読み取り5件）と合否の数字の第3版を承認した。それに合わせて、ルールのテスト（tests/game.test.ts）、通しの流れのテスト（tests/flow.test.ts）、通し操作テスト（tests/e2e/run.ts）、模擬プレイの判定（scripts/check/acceptance.ts）、定義の読み込み（scripts/lib/content.ts）を第3版のルールで書き直した。なくなった仕組み（まとめて稽古、上げられるだけ全部、まとめて勧誘、最初の1回の確定）の検査は外し、新しい仕組み（+1・+10・レベルの指定、リセットと全額の払い戻し、★1〜★3 とエリート、通常と高級の勧誘、10連の確定、天井、最初の高級10連の約束、装備の入手・付け替え・強化・おまかせ、6人編成、箱の装備、build-5 のセーブの扱い、ポップアップのはみ出し）の検査を足した。合否の数字は9項目から11項目に、テストは80件から90件に、通し操作テストは26件から30件に増えた。通し操作テストは、続きものの手順が1つ落ちたら残りを実行せず不合格にする形にした（落ちたあと、待ち時間が積み重なって終わらなくなるのを防ぐため）（変更: scripts/check/acceptance.ts, scripts/lib/content.ts, spec/ACCEPTANCE.yaml, spec/CORE_LOOP_CONTRACT.md, tests/e2e/run.ts, tests/flow.test.ts, tests/game.test.ts）
- 2026-10-12 追加: tests/fixtures/save-build-6.json
- 2026-10-12 承認: build-6 のあとの画面の作り直し（F-012〜015）に合わせたテストの書き直し: ユーザーが 2026-10-12 に「書き直してよい」と承認した。団員の画面がポップアップから「上に選んだ団員の札、下に一覧」に変わり、編成の全員のおまかせ装備をなくし、全部外すを足したため、ルールのテスト（全部外す、おまかせで付け替えが起きるかの判定）、通しの流れのテスト（1人ずつのおまかせ、全部外す、新しい団員の画面、build-6 のセーブがそのまま続きから遊べること）、通し操作テスト（一覧で選ぶ、札の育成と装備、全部外す、ポップアップの外を押して閉じる、操作してもスクロールの位置が戻らない）を書き直した。確かめる中身は減らしていない。テストは90件から92件に、通し操作テストは30件から31件に増えた（変更: tests/e2e/run.ts, tests/flow.test.ts, tests/game.test.ts）
