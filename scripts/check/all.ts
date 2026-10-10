// 全部の検査を順に走らせ、合否を終了コードで返す。
// 合格は「全部通ったとき」だけ。途中で落ちても最後まで走らせ、何が落ちたかを全部見せる。
//
//   node scripts/check/all.ts

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { currentBuildId, runBin, runNode } from "../lib/env.ts";
import type { RunResult } from "../lib/env.ts";

interface Step {
  name: string;
  run: () => RunResult;
  /** 通ったときに横へ出す一言。 */
  summary?: (r: RunResult) => string;
}

function checkDist(): RunResult {
  const problems: string[] = [];
  const need = ["dist/index.html", "dist/app.js", "dist/style.css", "dist/manifest.webmanifest", "dist/icon-180.png", "dist/build.json"];
  for (const f of need) if (!existsSync(f)) problems.push(`ありません: ${f}`);
  if (problems.length === 0) {
    const html = readFileSync("dist/index.html", "utf8");
    if (!html.includes("app.js")) problems.push("index.html が app.js を読み込んでいません");
    if (html.includes("%BUILD_ID%")) problems.push("index.html にビルド名が埋め込まれていません");
    if (statSync("dist/app.js").size < 500) problems.push("app.js が小さすぎます");
    try {
      const info = JSON.parse(readFileSync("dist/build.json", "utf8")) as { buildId?: string };
      if (!info.buildId) problems.push("build.json にビルド名がありません");
    } catch {
      problems.push("build.json を読めません");
    }
  }
  return { code: problems.length === 0 ? 0 : 1, out: "", err: problems.join("\n") };
}

function testCount(r: RunResult): number {
  const m = /(?:#|ℹ) pass (\d+)/.exec(r.out);
  return m ? Number(m[1]) : 0;
}

const steps: Step[] = [
  { name: "保護ファイルの照合", run: () => runNode(["scripts/check/protected.ts", "verify"]) },
  { name: "型の検査（全体）", run: () => runBin("tsc", ["--noEmit", "-p", "tsconfig.json"]) },
  { name: "型の検査（coreは画面なし）", run: () => runBin("tsc", ["--noEmit", "-p", "tsconfig.core.json"]) },
  { name: "coreの決まり", run: () => runNode(["scripts/check/core-purity.ts"]) },
  {
    name: "テスト",
    run: () => {
      const r = runNode(["--test", "tests/**/*.test.ts"]);
      if (r.code === 0 && testCount(r) === 0) return { code: 1, out: r.out, err: "テストが1件も実行されていません" };
      return r;
    },
    summary: (r) => `${testCount(r)}件`,
  },
  { name: "ビルド", run: () => runNode(["scripts/build.ts"]) },
  { name: "成果物の確認", run: checkDist },
];

const results: { name: string; ok: boolean; ms: number }[] = [];
let allOk = true;

for (const step of steps) {
  const t0 = performance.now();
  const r = step.run();
  const ms = Math.round(performance.now() - t0);
  const ok = r.code === 0;
  allOk = allOk && ok;
  results.push({ name: step.name, ok, ms });
  const extra = ok && step.summary ? `（${step.summary(r)}）` : "";
  console.log(`${ok ? "✔" : "✘"} ${step.name}${extra}  ${ms}ms`);
  if (!ok) {
    const text = `${r.out}\n${r.err}`.trim().split("\n").slice(-40);
    for (const line of text) console.log("    " + line);
  }
}

mkdirSync("reports", { recursive: true });
writeFileSync(
  "reports/last-check.json",
  JSON.stringify({ at: new Date().toISOString(), buildId: currentBuildId(), ok: allOk, steps: results }, null, 2) + "\n",
);

console.log(allOk ? "\n検査: すべて合格" : "\n検査: 不合格（上の ✘ を直してください）");
process.exit(allOk ? 0 : 1);
