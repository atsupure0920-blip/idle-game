// いまの状況を表示する。記録を読むのではなく、履歴（git）とファイルの中身から計算する。
//
//   node scripts/status.ts

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { SRC_ROOT, STAGE_NAMES, buildTags, currentStage, dirtyFiles, doneStages, git, gitOk, runNode } from "./lib/env.ts";
import type { Stage } from "./lib/env.ts";

const GATE_AFTER: Partial<Record<Stage, string>> = {
  S1: "G0 契約の承認",
  S3: "G1 続行の採点",
  S4: "G2 画風の固定",
  S5: "G3 範囲の凍結",
  S6: "G4 7日分が通る",
  S7: "G5 Web公開",
};

function read(rel: string): string | null {
  const file = path.join(SRC_ROOT, rel);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/** GAME_BRIEF.yaml の必須項目のうち、まだ埋まっていないもの。 */
function missingBriefFields(): string[] {
  const text = read("spec/GAME_BRIEF.yaml");
  if (text === null) return ["spec/GAME_BRIEF.yaml がありません"];
  let doc: Record<string, unknown>;
  try {
    doc = (parse(text) ?? {}) as Record<string, unknown>;
  } catch (e) {
    return [`GAME_BRIEF.yaml の書式が崩れています（${String(e).split("\n")[0]}）`];
  }
  const concept = (doc["concept"] ?? {}) as Record<string, unknown>;
  const art = (doc["art"] ?? {}) as Record<string, unknown>;
  const missing: string[] = [];
  if (!["chest", "card", "tap"].includes(String(concept["base_type"] ?? ""))) missing.push("concept.base_type（型: chest / card / tap）");
  if (isBlank(concept["theme"])) missing.push("concept.theme（題材を1文で）");
  const refs = Array.isArray(concept["references"]) ? (concept["references"] as Record<string, unknown>[]) : [];
  if (!refs.some((r) => r && !isBlank(r["title"]))) missing.push("concept.references（参考にする既存作を1つ以上）");
  if (isBlank(art["style_words"])) missing.push("art.style_words（絵柄を表す言葉）");
  return missing;
}

function publishUrl(): string {
  try {
    const cfg = JSON.parse(read("pipeline/publish.json") ?? "{}") as { url?: string | null };
    return (cfg.url ?? "").trim();
  } catch {
    return "";
  }
}

const lines: string[] = [];
const waiting: string[] = [];
const next: string[] = [];

lines.push(`■ 放置ゲーム 状況（${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC）`);

if (!gitOk()) {
  lines.push("履歴（git）がまだありません。S0 の準備が終わっていません。");
  console.log(lines.join("\n"));
  process.exit(0);
}

const stage = currentStage();
const done = doneStages();
if (stage === null) {
  lines.push("段階: すべて完了");
} else {
  lines.push(`段階: ${stage} ${STAGE_NAMES[stage]}（完了: ${done.length > 0 ? done.join(", ") : "なし"}）`);
  lines.push(`次のゲート: ${GATE_AFTER[stage] ?? "なし（機械の判定とあなたの確認で進む）"}`);
}

// ビルド
const tags = buildTags();
if (tags.length === 0) {
  lines.push("ビルド: まだありません");
} else {
  const dates = git(["for-each-ref", "--format=%(refname:short) %(creatordate:short)", "refs/tags/build-*"])
    .out.split("\n")
    .map((l) => l.trim().split(" "))
    .filter((p) => p.length === 2);
  const latest = `build-${tags[tags.length - 1]}`;
  const latestDate = dates.find((p) => p[0] === latest)?.[1] ?? "";
  const first = dates.map((p) => p[1] ?? "").sort()[0] ?? "";
  lines.push(`ビルド: 最新は ${latest}（${latestDate}）。これまで ${tags.length}回、最初は ${first}`);
}

// 作業の状態
const dirty = dirtyFiles();
lines.push(dirty.length === 0 ? "作業: すべて記録済み" : `作業: 未記録の変更が ${dirty.length}件あります`);

// 検査
const lastCheck = read("reports/last-check.json");
if (lastCheck) {
  try {
    const c = JSON.parse(lastCheck) as { at: string; ok: boolean; buildId: string };
    lines.push(`直近の検査: ${c.ok ? "合格" : "不合格"}（${c.at.slice(0, 16).replace("T", " ")} UTC、${c.buildId}）`);
  } catch {
    lines.push("直近の検査: 記録を読めません");
  }
} else {
  lines.push("直近の検査: まだ実行していません");
}

// 保護ファイル
const prot = runNode(["scripts/check/protected.ts", "verify"]);
lines.push(prot.code === 0 ? prot.out.trim() : "保護ファイル: 承認時の記録と食い違っています（下を参照）");
if (prot.code !== 0) for (const l of prot.err.trim().split("\n")) lines.push("    " + l);

const approvals = (read("pipeline/APPROVALS.md") ?? "").split("\n").filter((l) => l.startsWith("- "));
if (approvals.length > 0) {
  lines.push("直近の承認記録:");
  for (const l of approvals.slice(-3)) lines.push("    " + l.slice(2));
}

// あなた待ち・次の一手
if (stage === "S0") {
  const url = publishUrl();
  if (url === "") {
    waiting.push("公開先を決める（Claudeが選択肢を示します）");
    next.push("公開先が決まったら、空の画面を公開して iPhone で開く");
  } else {
    waiting.push(`iPhoneで開いて確かめる: ${url}`);
    next.push("確かめられたら「next」で S1 へ");
  }
} else if (stage === "S1") {
  const missing = missingBriefFields();
  if (missing.length > 0) {
    waiting.push("spec/GAME_BRIEF.yaml の必須項目を埋める:");
    for (const m of missing) waiting.push(`    ・${m}`);
    next.push("埋まったら、Claudeが「最初の10分の台本」と合否の数字を書く");
  } else {
    const contract = read("spec/CORE_LOOP_CONTRACT.md") ?? "";
    if (contract.includes("（未作成）")) next.push("Claudeが spec/CORE_LOOP_CONTRACT.md と spec/ACCEPTANCE.yaml を書く");
    else waiting.push("契約書（spec/CORE_LOOP_CONTRACT.md）を読み、補完された決定に承認か却下を付ける");
  }
} else if (stage === "S2") {
  const pending = (read("pipeline/DECISIONS.md") ?? "").split("\n").filter((l) => l.trim().startsWith("|") && l.includes("□")).length;
  if (pending > 0) waiting.push(`契約書にないルールの提案 ${pending}件に、○（採用）か ✕（不採用）を返す（pipeline/DECISIONS.md）`);
  const acc = read("reports/acceptance.json");
  let accOk = false;
  try {
    accOk = acc !== null && (JSON.parse(acc) as { ok?: boolean }).ok === true;
  } catch {
    accOk = false;
  }
  next.push(accOk ? "模擬プレイは合否の数字に合格。出口の検査（exit）が通れば「next」で S3 へ" : "模擬プレイが合否の数字に合格するまで、数値（params/）を調整する");
} else if (stage !== null) {
  next.push(`${stage} の表示は、この段階に入るときに追加します`);
}
if (dirty.length > 0) next.unshift("未記録の変更を記録（コミット）する");

lines.push("");
lines.push("▼ あなた待ち");
if (waiting.length === 0) lines.push("  なし");
for (const w of waiting) lines.push(w.startsWith("    ") ? w : `  - ${w}`);
lines.push("▼ 次の一手");
if (next.length === 0) lines.push("  なし");
for (const n of next) lines.push(`  - ${n}`);

console.log(lines.join("\n"));
