// 通し操作テスト（本物のブラウザ）の記録が、いまのソースで取ったものかを確かめる。
//
//   node scripts/check/e2e-gate.ts
//
// 通し操作テスト（tests/e2e/run.ts）はブラウザが要るので、ユーザーのPCの作業環境では実行できない。
// そこで、Claude 側の環境で実行した結果を pipeline/reports/e2e-last.json に記録し、
// ここでは「記録が合格で、そのときのソース（src/、params/）がいまと同じか」を確かめる。
// ソースを1文字でも変えたら、通し操作テストをやり直すまで、ここは落ちる。
//
// 終了コード: 0 = 合格の記録があり、いまのソースと一致、1 = それ以外

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../lib/env.ts";
import { sourceHash } from "../lib/source-hash.ts";

const file = path.join(ROOT, "pipeline/reports/e2e-last.json");
if (!existsSync(file)) {
  console.error("通し操作テストの記録がありません（tests/e2e/run.ts を、ブラウザのある環境で実行する）。");
  process.exit(1);
}

interface Record_ {
  ok?: boolean;
  at?: string;
  sourceHash?: string;
  steps?: { name: string; ok: boolean; detail?: string }[];
}
let rec: Record_;
try {
  rec = JSON.parse(readFileSync(file, "utf8")) as Record_;
} catch {
  console.error("通し操作テストの記録を読めません。");
  process.exit(1);
}

const now = sourceHash(ROOT);
const steps = rec.steps ?? [];
const failed = steps.filter((s) => !s.ok);
if (rec.ok !== true || failed.length > 0 || steps.length === 0) {
  console.error(`通し操作テストの記録が不合格です（${rec.at ?? "時刻不明"}）。`);
  for (const s of failed) console.error(`  ✘ ${s.name}${s.detail ? `: ${s.detail}` : ""}`);
  process.exit(1);
}
if (rec.sourceHash !== now) {
  console.error("通し操作テストの記録が、いまのソースのものではありません（記録のあとでソースが変わっています）。");
  console.error(`  記録: ${rec.sourceHash ?? "なし"} ／ いま: ${now}`);
  console.error("  ブラウザのある環境で、tests/e2e/run.ts を実行し直してください。");
  process.exit(1);
}
console.log(`通し操作テスト: ${steps.length}件すべて合格の記録があり、いまのソースと一致（${(rec.at ?? "").slice(0, 16).replace("T", " ")} UTC に実行）`);
