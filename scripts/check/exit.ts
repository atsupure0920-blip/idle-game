// 段階の出口の検査。「次へ進んでよいか」を機械で判定できる分だけ判定する。
//
//   node scripts/check/exit.ts        … いまの段階
//   node scripts/check/exit.ts S0     … 段階を指定
//
// 段階ごとの中身は scripts/check/exit/<段階>.ts にある。

import { existsSync } from "node:fs";
import path from "node:path";
import { STAGES, STAGE_NAMES, currentStage } from "../lib/env.ts";
import type { Stage } from "../lib/env.ts";

export interface ExitItem {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface ExitReport {
  items: ExitItem[];
  /** 機械では判定できず、ユーザーに確かめてもらうこと。 */
  human: string[];
}

const arg = process.argv[2];
const stage = (arg ?? currentStage() ?? "") as Stage;
if (!STAGES.includes(stage)) {
  console.error(arg ? `知らない段階です: ${arg}` : "すべての段階が終わっています。");
  process.exit(2);
}

const file = path.join(import.meta.dirname, "exit", `${stage}.ts`);
if (!existsSync(file)) {
  console.error(`${stage} の出口の検査はまだ作られていません。この段階に入るときに作ります。`);
  process.exit(2);
}

const mod = (await import(`./exit/${stage}.ts`)) as { check: () => Promise<ExitReport> };
const report = await mod.check();

console.log(`■ ${stage} ${STAGE_NAMES[stage]} の出口`);
for (const item of report.items) {
  console.log(`${item.ok ? "✔" : "✘"} ${item.name}`);
  if (item.detail) for (const line of item.detail.split("\n")) console.log("    " + line);
}
const ok = report.items.every((i) => i.ok);
if (report.human.length > 0) {
  console.log("\nあなたに確かめてもらうこと:");
  for (const h of report.human) console.log(`  □ ${h}`);
}
console.log(ok ? "\n機械で判定できる分は合格です。" : "\nまだ出口の条件を満たしていません。");
process.exit(ok ? 0 : 1);
