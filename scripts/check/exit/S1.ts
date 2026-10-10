// S1（仕様と契約）の出口。G0（契約の承認）の前提になる。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { SRC_ROOT, runNode } from "../../lib/env.ts";
import type { ExitReport, ExitItem } from "../exit.ts";

type Dict = Record<string, unknown>;

function read(rel: string): string | null {
  const file = path.join(SRC_ROOT, rel);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function readYaml(rel: string): Dict | null {
  const text = read(rel);
  if (text === null) return null;
  try {
    const doc: unknown = parse(text);
    return typeof doc === "object" && doc !== null && !Array.isArray(doc) ? (doc as Dict) : {};
  } catch {
    return null;
  }
}

function dict(v: unknown): Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Dict) : {};
}

function blank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function check(): Promise<ExitReport> {
  const items: ExitItem[] = [];

  // 1. 仕様の必須項目
  const brief = readYaml("spec/GAME_BRIEF.yaml");
  const missing: string[] = [];
  if (brief === null) {
    missing.push("spec/GAME_BRIEF.yaml を読めません");
  } else {
    const concept = dict(brief["concept"]);
    const art = dict(brief["art"]);
    if (!["chest", "card", "tap"].includes(String(concept["base_type"] ?? ""))) missing.push("concept.base_type");
    if (blank(concept["theme"])) missing.push("concept.theme");
    const refs = Array.isArray(concept["references"]) ? concept["references"] : [];
    if (!refs.some((r) => !blank(dict(r)["title"]))) missing.push("concept.references");
    if (blank(concept["hook"])) missing.push("concept.hook（S1 で案から選ぶ）");
    if (blank(art["style_words"])) missing.push("art.style_words");
  }
  items.push({ name: "仕様の必須項目が埋まっている", ok: missing.length === 0, detail: missing.length > 0 ? `未記入: ${missing.join("、")}` : undefined });

  // 2. 契約書
  const contract = read("spec/CORE_LOOP_CONTRACT.md");
  const written = contract !== null && !contract.includes("（未作成）");
  items.push({ name: "契約書が書かれている（最初の10分の台本、ルール、補完した決定）", ok: written, detail: written ? undefined : "spec/CORE_LOOP_CONTRACT.md がひな形のままです" });

  // 3. 補完した決定への回答（表の承認欄が □ のままなら未回答）
  const pending = (contract ?? "").split("\n").filter((l) => l.trim().startsWith("|") && l.includes("□")).length;
  items.push({ name: "AIが補完した決定に、未回答が残っていない", ok: written && pending === 0, detail: pending > 0 ? `未回答: ${pending}件（承認なら ○、却下なら ✕）` : undefined });

  // 4. 合否の数字
  const acc = readYaml("spec/ACCEPTANCE.yaml");
  const accOk = acc !== null && acc["status"] === "approved" && Object.keys(dict(acc["first_30min"])).length > 0;
  items.push({ name: "合否の数字が決まり、承認されている", ok: accOk, detail: accOk ? undefined : "spec/ACCEPTANCE.yaml の status が approved でないか、first_30min が空です" });

  // 5. 規模が上限に収まる（Claude が spec/SCOPE.yaml に見積もりを書く）
  const scope = readYaml("spec/SCOPE.yaml");
  const limits = dict(brief?.["limits"]);
  const over: string[] = [];
  if (scope === null) {
    over.push("spec/SCOPE.yaml がありません（規模の見積もり）");
  } else {
    const pairs: [string, number | null, number | null][] = [
      ["内容の日数", num(scope["days_of_content"]), num(limits["days_of_content"])],
      ["画像の枚数", num(scope["images"]), num(limits["max_images"])],
      ["画面の数", num(scope["screens"]), num(limits["max_screens"])],
      ["仕組みの数", Array.isArray(scope["systems"]) ? scope["systems"].length : null, num(limits["max_systems"])],
    ];
    for (const [label, value, limit] of pairs) {
      if (value === null || limit === null) over.push(`${label}: 見積もりか上限がありません`);
      else if (value > limit) over.push(`${label}: 見積もり ${value} が上限 ${limit} を超えています`);
    }
  }
  items.push({ name: "規模が上限（limits）に収まる", ok: over.length === 0, detail: over.length > 0 ? over.join("\n") : undefined });

  // 6. 既存の検査が壊れていない
  const all = runNode(["scripts/check/all.ts"]);
  items.push({ name: "全検査が通る", ok: all.code === 0, detail: all.code === 0 ? undefined : (all.out + all.err).trim().split("\n").slice(-10).join("\n") });

  return {
    items,
    human: ["最初の10分の台本を読み、この内容で作り始めてよい（G0: 進める・直す・やめる）"],
  };
}
