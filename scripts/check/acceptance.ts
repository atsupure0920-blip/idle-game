// 合否の数字（spec/ACCEPTANCE.yaml）を、模擬プレイで検査する。
//
//   node scripts/check/acceptance.ts
//
// やること:
//   1. 本番の数値（params/）で、3種類のプレイヤー × 決められた本数の模擬プレイを走らせる
//      （続けて30分。そのあと8時間あけて戻り、10分遊ぶ）
//   2. ACCEPTANCE.yaml の各項目と比べる
//   3. 結果を画面と reports/acceptance.json、reports/acceptance.md に出す
//
// 終了コード: 0 = 全項目合格、1 = 不合格、2 = 検査できない（数字が未承認、読めない など）
//
// 項目の書き方（ACCEPTANCE.yaml）:
//   <プレイヤー>_p<百分位>: [下限, 上限]   … その百分位の値が範囲内
//   <プレイヤー>_p<百分位>_min: 値         … その百分位の値が、値以上
//   <プレイヤー>_p<百分位>_max: 値         … その百分位の値が、値以下
// 百分位は「小さい順に並べて、下から q% の位置にある値」（最近順位法）。
// 一度も起きなかった出来事（負け、相棒）は「無限に遅い」として扱う。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { stageLabel } from "../../src/core/params.ts";
import type { Content } from "../../src/core/params.ts";
import { simulate } from "../../src/sim/run.ts";
import type { SimResult } from "../../src/sim/run.ts";
import { POLICIES } from "../../src/sim/policies.ts";
import type { PolicyName } from "../../src/sim/policies.ts";
import { ROOT } from "../lib/env.ts";
import { loadContent } from "../lib/content.ts";

type Dict = Record<string, unknown>;

const DURATION_SEC = 30 * 60;
const AWAY = { awaySec: 8 * 3600, afterSec: 10 * 60 };

interface MetricDef {
  label: string;
  unit: string;
  get: (r: SimResult) => number | null;
}

/** ACCEPTANCE.yaml の区分と項目名と、模擬プレイの結果の対応。 */
const SECTIONS: Record<string, { title: string; metrics: Record<string, MetricDef> }> = {
  first_30min: {
    title: "続けて30分",
    metrics: {
      stage_reached: { label: "到達した面", unit: "面目", get: (r) => r.stageReached },
      first_defeat_min: { label: "初めて負けるまで", unit: "分", get: (r) => r.firstDefeatMin },
      first_companion_min: { label: "初めてボスが相棒になるまで", unit: "分", get: (r) => r.firstCompanionMin },
      recruits_10min: { label: "最初の10分に勧誘した回数", unit: "回", get: (r) => r.recruits10Min },
      members_owned: { label: "持っている団員", unit: "人", get: (r) => r.membersOwned },
      longest_stall_min: { label: "新しい面を突破できなかった時間の最長", unit: "分", get: (r) => r.longestStallMin },
      taps_per_min: { label: "1分あたりの操作", unit: "回", get: (r) => r.tapsPerMin },
    },
  },
  return_after_8h: {
    title: "8時間あけて戻ったあと",
    metrics: {
      stages_gained_10min: { label: "戻ってからの10分で突破した面", unit: "面", get: (r) => r.stagesGainedAfterAway },
    },
  },
};

const PLAYER_LABEL: Record<PolicyName, string> = { optimal: "熱心な人", normal: "ふつうの人", lazy: "あまり開かない人" };

function stop(message: string): never {
  console.error(message);
  process.exit(2);
}

function dict(v: unknown): Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Dict) : {};
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 最近順位法の百分位。 */
function percentile(values: number[], q: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((q / 100) * sorted.length) - 1));
  return sorted[index] as number;
}

function show(v: number): string {
  if (!Number.isFinite(v)) return "起きなかった";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// --- 合否の数字を読む ---
const accFile = path.join(ROOT, "spec/ACCEPTANCE.yaml");
if (!existsSync(accFile)) stop("spec/ACCEPTANCE.yaml がありません。");
let acc: Dict = {};
try {
  acc = dict(parse(readFileSync(accFile, "utf8")));
} catch {
  stop("spec/ACCEPTANCE.yaml を読めません（書式の誤り）。");
}
if (acc["status"] !== "approved") stop("合否の数字がまだ承認されていません（spec/ACCEPTANCE.yaml の status）。");

const players = (Array.isArray(acc["players"]) ? acc["players"] : []).map(String);
for (const p of players) if (!(p in POLICIES)) stop(`知らないプレイヤーの種類です: ${p}`);
if (players.length === 0) stop("players が空です。");
const seeds = acc["seeds"];
if (!isNum(seeds) || !Number.isInteger(seeds) || seeds < 10) stop("seeds は10以上の整数にしてください。");

interface Rule {
  section: string;
  metric: string;
  def: MetricDef;
  player: PolicyName;
  q: number;
  lo: number;
  hi: number;
  text: string;
}

const KNOWN_TOP = new Set(["status", "players", "seeds", "day7", ...Object.keys(SECTIONS)]);
for (const key of Object.keys(acc)) {
  if (!KNOWN_TOP.has(key)) stop(`知らない区分です: ${key}（検査のしかたが決まっていません）`);
}

const rules: Rule[] = [];
for (const [section, sdef] of Object.entries(SECTIONS)) {
  const block = dict(acc[section]);
  if (section === "first_30min" && Object.keys(block).length === 0) stop("first_30min が空です。");
  for (const [metric, raw] of Object.entries(block)) {
    const def = sdef.metrics[metric];
    if (!def) stop(`知らない項目です: ${section}.${metric}（検査のしかたが決まっていません）`);
    const spec = dict(raw);
    if (Object.keys(spec).length === 0) stop(`${section}.${metric} に条件がありません。`);
    for (const [key, value] of Object.entries(spec)) {
      const m = /^([a-z]+)_p(\d{1,3})(?:_(min|max))?$/.exec(key);
      if (!m) stop(`条件の書き方が正しくありません: ${section}.${metric}.${key}`);
      const player = m[1] as PolicyName;
      const q = Number(m[2]);
      if (!players.includes(player)) stop(`players にないプレイヤーです: ${section}.${metric}.${key}`);
      if (q < 1 || q > 100) stop(`百分位は1〜100です: ${section}.${metric}.${key}`);
      let lo = -Infinity;
      let hi = Infinity;
      if (m[3] === "min" && isNum(value)) lo = value;
      else if (m[3] === "max" && isNum(value)) hi = value;
      else if (m[3] === undefined && Array.isArray(value) && value.length === 2 && isNum(value[0]) && isNum(value[1]) && value[0] <= value[1]) {
        lo = value[0];
        hi = value[1];
      } else stop(`値の書き方が正しくありません: ${section}.${metric}.${key}`);
      const text = m[3] === "min" ? `${lo} 以上` : m[3] === "max" ? `${hi} 以下` : `${lo}〜${hi}`;
      rules.push({ section, metric, def, player, q, lo, hi, text });
    }
  }
}

// --- 模擬プレイ ---
let content: Content;
try {
  content = loadContent(ROOT);
} catch (e) {
  stop(`数値か定義に誤りがあります: ${e instanceof Error ? e.message : String(e)}`);
}

const started = Date.now();
const runs: Record<string, SimResult[]> = {};
for (const player of players) {
  runs[player] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    (runs[player] as SimResult[]).push(simulate({ policy: player as PolicyName, seed, durationSec: DURATION_SEC, content, away: AWAY }));
  }
}

// --- 判定 ---
interface Row {
  section: string;
  metric: string;
  label: string;
  player: PolicyName;
  q: number;
  value: number;
  need: string;
  ok: boolean;
}

const rows: Row[] = rules.map((rule) => {
  const values = (runs[rule.player] as SimResult[]).map((r) => rule.def.get(r) ?? Infinity);
  const value = percentile(values, rule.q);
  return {
    section: rule.section,
    metric: rule.metric,
    label: `${rule.def.label}（${rule.def.unit}）`,
    player: rule.player,
    q: rule.q,
    value,
    need: rule.text,
    ok: value >= rule.lo && value <= rule.hi,
  };
});
const allOk = rows.every((r) => r.ok);

function describeQ(q: number): string {
  return q === 50 ? "中央値" : `下から${q}%`;
}

const lines: string[] = [];
lines.push("# 模擬プレイの結果");
lines.push("");
lines.push(`プレイヤー3種類 × ${seeds}本。続けて30分遊び、そのあと8時間あけて戻り、10分遊ぶ。数値は params/、合否の数字は spec/ACCEPTANCE.yaml。`);
lines.push("");
lines.push("## 合否");
lines.push("");
lines.push("| 場面 | 項目 | 誰の | どの位置 | 結果 | 合格の範囲 | 判定 |");
lines.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  lines.push(`| ${SECTIONS[r.section]?.title ?? r.section} | ${r.label} | ${PLAYER_LABEL[r.player]} | ${describeQ(r.q)} | ${show(r.value)} | ${r.need} | ${r.ok ? "合格" : "不合格"} |`);
}
lines.push("");
lines.push("## 3種類のプレイヤーの比較（中央値）");
lines.push("");
lines.push("| 項目 | " + players.map((p) => PLAYER_LABEL[p as PolicyName]).join(" | ") + " |");
lines.push("| --- | " + players.map(() => "---").join(" | ") + " |");
const median = (p: string, get: (r: SimResult) => number | null): number => percentile((runs[p] as SimResult[]).map((r) => get(r) ?? Infinity), 50);
for (const sdef of Object.values(SECTIONS)) {
  for (const [metric, def] of Object.entries(sdef.metrics)) {
    const cells = players.map((p) => {
      const v = median(p, def.get);
      return metric === "stage_reached" && Number.isFinite(v) ? `${show(v)}（${stageLabel(v, content.params)}）` : show(v);
    });
    lines.push(`| ${def.label}（${def.unit}） | ${cells.join(" | ")} |`);
  }
}
lines.push(`| 戦闘1回の長さ（秒。面の紹介と結果の表示を除く） | ${players.map((p) => show(median(p, (r) => r.battleSecMedian))).join(" | ")} |`);
lines.push(`| 負けた回数（回） | ${players.map((p) => show(median(p, (r) => r.defeats))).join(" | ")} |`);
lines.push("");

// ふつうの人の、まんなかの1本の経過
const normal = runs["normal"];
if (normal && normal.length > 0) {
  const byStage = normal.slice().sort((a, b) => a.stageReached - b.stageReached || a.seed - b.seed);
  const typical = byStage[Math.floor(byStage.length / 2)] as SimResult;
  lines.push(`## ふつうの人の例（${seeds}本のうち、到達した面がまんなかの1本。最初の30分）`);
  lines.push("");
  lines.push("| 時刻 | 起きたこと |");
  lines.push("| --- | --- |");
  // 同じ時刻の出来事は、1行にまとめる
  let lastKey = "";
  for (const e of typical.timeline) {
    const mm = Math.floor(e.tSec / 60);
    const ss = String(e.tSec % 60).padStart(2, "0");
    const key = `${mm}:${ss}`;
    if (key === lastKey) lines[lines.length - 1] = (lines[lines.length - 1] as string).replace(/ \|$/, `、${e.text} |`);
    else lines.push(`| ${key} | ${e.text} |`);
    lastKey = key;
  }
  lines.push("");
}

const outDir = path.join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "acceptance.md"), lines.join("\n"));
writeFileSync(
  path.join(outDir, "acceptance.json"),
  JSON.stringify({ ok: allOk, seeds, players, rows: rows.map((r) => ({ ...r, value: Number.isFinite(r.value) ? r.value : null })), ms: Date.now() - started }, null, 2),
);

console.log(`模擬プレイ（${players.length}種類 × ${seeds}本。続けて30分 → 8時間あけて → 10分）`);
for (const r of rows) {
  console.log(`${r.ok ? "✔" : "✘"} ${r.label} ／ ${PLAYER_LABEL[r.player]}の${describeQ(r.q)}: ${show(r.value)}（合格の範囲: ${r.need}）`);
}
if (Object.keys(dict(acc["day7"])).length === 0) console.log("・7日目の数字は、まだ決まっていません（G1 の後で決める）。");
console.log(allOk ? "合否の数字: すべて合格" : "合否の数字: 不合格の項目があります");
console.log("くわしい結果: reports/acceptance.md");
process.exit(allOk ? 0 : 1);
