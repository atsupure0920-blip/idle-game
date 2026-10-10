// S2（最小の核）の出口。ゲートはない（次のゲートは S3 のあとの G1）。
//
// 確かめること:
//   - ルール（戦闘、進行、団員、育成、放置報酬）と模擬プレイがある
//   - 本番の数値で、合否の数字（spec/ACCEPTANCE.yaml）にすべて合格する
//   - 最初の30分の報告が残っている
//   - 既存の検査が壊れていない

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SRC_ROOT, runNode } from "../../lib/env.ts";
import type { ExitReport, ExitItem } from "../exit.ts";

function lastLines(text: string, n: number): string {
  return text.trim().split("\n").slice(-n).join("\n");
}

export async function check(): Promise<ExitReport> {
  const items: ExitItem[] = [];

  // 1. あるべきファイル
  const need = [
    "src/core/params.ts",
    "src/core/battle.ts",
    "src/core/game.ts",
    "src/sim/policies.ts",
    "src/sim/run.ts",
    "params/base.json",
    "params/members.json",
    "tests/game.test.ts",
    "scripts/check/acceptance.ts",
  ];
  const missing = need.filter((f) => !existsSync(path.join(SRC_ROOT, f)));
  items.push({ name: "ルール、模擬プレイ、数値、テストがそろっている", ok: missing.length === 0, detail: missing.length > 0 ? `ありません: ${missing.join("、")}` : undefined });

  // 2. 全検査（型、core の決まり、テスト、ビルド、保護ファイルの照合）
  const all = runNode(["scripts/check/all.ts"]);
  items.push({ name: "全検査が通る", ok: all.code === 0, detail: all.code === 0 ? undefined : lastLines(all.out + all.err, 10) });

  // 3. 合否の数字
  const acc = runNode(["scripts/check/acceptance.ts"]);
  items.push({
    name: "模擬プレイが、合否の数字にすべて合格する",
    ok: acc.code === 0,
    detail: lastLines(acc.out + acc.err, 12),
  });

  // 4. 報告
  const reportFile = path.join(SRC_ROOT, "pipeline/reports/S2-first30.md");
  const report = existsSync(reportFile) ? readFileSync(reportFile, "utf8") : "";
  items.push({
    name: "最初の30分の報告が残っている",
    ok: report.includes("## 合否") && !report.includes("不合格 |"),
    detail: report === "" ? "pipeline/reports/S2-first30.md がありません" : undefined,
  });

  // 5. 承認待ちの提案（契約書にないルールを、黙って確定させない）
  const decisions = existsSync(path.join(SRC_ROOT, "pipeline/DECISIONS.md")) ? readFileSync(path.join(SRC_ROOT, "pipeline/DECISIONS.md"), "utf8") : "";
  const pending = decisions.split("\n").filter((l) => l.trim().startsWith("|") && l.includes("□")).length;

  return {
    items,
    human: pending > 0 ? [`契約書にないルールの提案が ${pending}件あります。○（採用）か ✕（不採用）を返してください（pipeline/DECISIONS.md）`] : [],
  };
}
