// core（ルール）と sim（模擬プレイ）が、画面や実際の時計・乱数に触れていないかを調べる。
// 触れていると、テストや模擬プレイの結果が再現できなくなる。

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const TARGET_DIRS = ["src/core", "src/sim"];

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /\bMath\.random\b/, why: "Math.random は使えません。Rng を引数で受け取ってください" },
  { pattern: /\bDate\.now\b/, why: "Date.now は使えません。時刻は nowMs で受け取ってください" },
  { pattern: /\bnew\s+Date\s*\(/, why: "new Date() は使えません。時刻は nowMs で受け取ってください" },
  { pattern: /\bperformance\.now\b/, why: "performance.now は使えません" },
  { pattern: /\b(setTimeout|setInterval|requestAnimationFrame)\b/, why: "タイマーは使えません。時間の経過は引数で受け取ってください" },
  { pattern: /\b(document|window|localStorage|navigator)\b\s*[.[]/, why: "画面や保存領域には触れられません" },
  { pattern: /from\s+["'](\.\.\/)+(ui|debug|battle)\//, why: "core から画面側のコードは読み込めません" },
  { pattern: /from\s+["']node:/, why: "core から Node.js の機能は読み込めません" },
];

function listFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...listFiles(full));
    else if (name.endsWith(".ts")) files.push(full);
  }
  return files;
}

function stripComments(line: string): string {
  const idx = line.indexOf("//");
  return idx >= 0 ? line.slice(0, idx) : line;
}

const problems: string[] = [];
let scanned = 0;
for (const dir of TARGET_DIRS) {
  for (const file of listFiles(dir)) {
    scanned++;
    const lines = readFileSync(file, "utf8").split("\n");
    let inBlock = false;
    lines.forEach((raw, i) => {
      let line = raw;
      if (inBlock) {
        const end = line.indexOf("*/");
        if (end < 0) return;
        line = line.slice(end + 2);
        inBlock = false;
      }
      const start = line.indexOf("/*");
      if (start >= 0 && line.indexOf("*/", start) < 0) {
        inBlock = true;
        line = line.slice(0, start);
      }
      line = stripComments(line);
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) problems.push(`${file}:${i + 1}  ${rule.why}\n    ${raw.trim()}`);
      }
    });
  }
}

if (problems.length > 0) {
  console.error(`core の決まりに反する箇所が ${problems.length} 件あります:`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`core の決まり: 問題なし（${scanned}ファイル）`);
