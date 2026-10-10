// 保護ファイルの照合。
//
// テスト、判定スクリプト、合否の数字は「合格の基準」そのものなので、
// 作業の途中で都合よく書き換えられていないかを、承認時の記録（指紋）と比べて確かめる。
//
//   node scripts/check/protected.ts verify              … 照合する。食い違えば終了コード1
//   node scripts/check/protected.ts add                 … 新しく増えたファイルだけを登録する
//   node scripts/check/protected.ts approve --reason "理由"
//                                                        … 変更・削除を承認として登録する
//
// approve は、ユーザーが理由を聞いて承認した場合にだけ実行する。記録は pipeline/APPROVALS.md に残る。

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, SRC_ROOT } from "../lib/env.ts";

const MANIFEST = "scripts/check/protected.manifest.json";
const APPROVALS = "pipeline/APPROVALS.md";

const PROTECTED_DIRS = ["tests", "scripts/check", "scripts/lib", "scripts/vm"];
const PROTECTED_FILES = ["spec/ACCEPTANCE.yaml", "spec/CORE_LOOP_CONTRACT.md", "tsconfig.json", "tsconfig.core.json"];

interface Manifest {
  note: string;
  files: Record<string, string>;
}

interface Diff {
  modified: string[];
  removed: string[];
  added: string[];
}

function walk(base: string, rel: string): string[] {
  const full = path.join(base, rel);
  if (!existsSync(full)) return [];
  const out: string[] = [];
  for (const name of readdirSync(full).sort()) {
    const childRel = `${rel}/${name}`;
    if (statSync(path.join(base, childRel)).isDirectory()) out.push(...walk(base, childRel));
    else out.push(childRel);
  }
  return out;
}

function currentHashes(base: string): Record<string, string> {
  const files = [...PROTECTED_DIRS.flatMap((d) => walk(base, d)), ...PROTECTED_FILES.filter((f) => existsSync(path.join(base, f)))]
    .filter((f) => f !== MANIFEST)
    .sort();
  const out: Record<string, string> = {};
  for (const f of files) {
    out[f] = createHash("sha256").update(readFileSync(path.join(base, f))).digest("hex");
  }
  return out;
}

function loadManifest(base: string): Manifest {
  const file = path.join(base, MANIFEST);
  if (!existsSync(file)) return { note: "", files: {} };
  return JSON.parse(readFileSync(file, "utf8")) as Manifest;
}

function diff(base: string): Diff {
  const now = currentHashes(base);
  const approved = loadManifest(base).files;
  return {
    modified: Object.keys(now).filter((f) => f in approved && approved[f] !== now[f]),
    removed: Object.keys(approved).filter((f) => !(f in now)),
    added: Object.keys(now).filter((f) => !(f in approved)),
  };
}

function writeManifest(base: string, files: Record<string, string>): void {
  const manifest: Manifest = {
    note: "保護ファイルの指紋。手で編集しない。更新は scripts/check/protected.ts の add / approve で行う。",
    files,
  };
  writeFileSync(path.join(base, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
}

function log(base: string, line: string): void {
  const file = path.join(base, APPROVALS);
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) {
    writeFileSync(file, "# 保護ファイルの承認記録\n\nテスト・判定スクリプト・合否の数字を変えたときの記録。新しいものが下。\n\n");
  }
  appendFileSync(file, line + "\n");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const command = process.argv[2] ?? "verify";

if (command === "verify") {
  const d = diff(ROOT);
  const total = Object.keys(currentHashes(ROOT)).length;
  if (d.modified.length === 0 && d.removed.length === 0 && d.added.length === 0) {
    console.log(`保護ファイル: 承認時から変わっていません（${total}ファイル）`);
    process.exit(0);
  }
  console.error("保護ファイルが承認時の記録と食い違っています:");
  for (const f of d.modified) console.error(`  変更された: ${f}`);
  for (const f of d.removed) console.error(`  消された:   ${f}`);
  for (const f of d.added) console.error(`  未登録:     ${f}`);
  if (d.modified.length > 0 || d.removed.length > 0) {
    console.error("変更・削除は、理由を示してユーザーの承認を得てから approve で登録します。");
  } else {
    console.error("追加だけなら add で登録できます。");
  }
  process.exit(1);
} else if (command === "add") {
  const d = diff(SRC_ROOT);
  if (d.added.length === 0) {
    console.log("新しく登録するファイルはありません。");
    process.exit(0);
  }
  const now = currentHashes(SRC_ROOT);
  const files = { ...loadManifest(SRC_ROOT).files };
  for (const f of d.added) files[f] = now[f] as string;
  writeManifest(SRC_ROOT, Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))));
  log(SRC_ROOT, `- ${today()} 追加: ${d.added.join(", ")}`);
  console.log(`登録しました（追加 ${d.added.length}件）: ${d.added.join(", ")}`);
} else if (command === "approve") {
  const idx = process.argv.indexOf("--reason");
  const reason = idx >= 0 ? (process.argv[idx + 1] ?? "").trim() : "";
  if (reason === "") {
    console.error('理由が必要です: approve --reason "なぜ変えるのか"');
    process.exit(2);
  }
  const d = diff(SRC_ROOT);
  if (d.modified.length === 0 && d.removed.length === 0 && d.added.length === 0) {
    console.log("承認が必要な変更はありません。");
    process.exit(0);
  }
  writeManifest(SRC_ROOT, currentHashes(SRC_ROOT));
  const parts: string[] = [];
  if (d.modified.length > 0) parts.push(`変更: ${d.modified.join(", ")}`);
  if (d.removed.length > 0) parts.push(`削除: ${d.removed.join(", ")}`);
  if (d.added.length > 0) parts.push(`追加: ${d.added.join(", ")}`);
  log(SRC_ROOT, `- ${today()} 承認: ${reason}（${parts.join("／")}）`);
  console.log(`承認として登録しました。${parts.join("／")}`);
} else {
  console.error(`知らない指示です: ${command}（verify / add / approve のどれか）`);
  process.exit(2);
}
