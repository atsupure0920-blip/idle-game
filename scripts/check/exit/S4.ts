// S4（絵付け）の出口の検査。ゲート G2「画風の固定」の前に、機械で確かめられることを確かめる。
//
// - 絵の決まり（art/ART_GUIDE.md）と、依頼文がある
// - ゲームに入っている絵（src/assets/img/*.webp）が、名前の一覧にあり、大きすぎず、枚数が上限に収まる
// - 「見た目の試し」の絵（依頼 1回目）が、すべて入っている
// - 全検査と、通し操作テストが、いまのソースで通る
// - 絵の入ったビルドに番号が付いている

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { SRC_ROOT, buildTags, dirtyFiles, git, runNode } from "../../lib/env.ts";
import type { ExitReport, ExitItem } from "../exit.ts";

const MAX_KB = 200;
/** 依頼 1回目（見た目の試し）の絵。 */
const FIRST_BATCH = ["h_stagehand", "h_apprentice", "h_barker", "h_star", "h_costume", "e_scarecrow", "e_mushroom", "e_rat", "c_bear", "bg_ch1"];

function lastLines(text: string, n: number): string {
  return text.trim().split("\n").slice(-n).join("\n");
}

function knownIds(): Set<string> {
  const ids = new Set<string>();
  for (const f of ["members", "companions"]) {
    const list = JSON.parse(readFileSync(path.join(SRC_ROOT, `params/${f}.json`), "utf8")) as { id: string }[];
    for (const x of list) ids.add(x.id);
  }
  for (const e of ["e_bat", "e_mushroom", "e_rat", "e_thorn", "e_scarecrow", "e_wisp"]) ids.add(e);
  for (let i = 1; i <= 4; i++) ids.add(`bg_ch${i}`);
  return ids;
}

export async function check(): Promise<ExitReport> {
  const items: ExitItem[] = [];

  const guide = ["art/ART_GUIDE.md", "art/requests/batch-01.md", "scripts/art/process.py"].filter((f) => !existsSync(path.join(SRC_ROOT, f)));
  items.push({ name: "絵の決まりと依頼文がある", ok: guide.length === 0, detail: guide.length > 0 ? `ありません: ${guide.join("、")}` : undefined });

  const dir = path.join(SRC_ROOT, "src/assets/img");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".webp")) : [];
  const ids = files.map((f) => f.slice(0, -".webp".length));
  const known = knownIds();
  const unknown = ids.filter((id) => !known.has(id));
  const big = files.filter((f) => statSync(path.join(dir, f)).size > MAX_KB * 1024);
  const brief = parse(readFileSync(path.join(SRC_ROOT, "spec/GAME_BRIEF.yaml"), "utf8")) as { limits?: { max_images?: number } };
  const max = brief.limits?.max_images ?? 0;
  const bad: string[] = [];
  if (unknown.length > 0) bad.push(`名前の一覧にない絵: ${unknown.join("、")}`);
  if (big.length > 0) bad.push(`${MAX_KB}KB より大きい絵: ${big.join("、")}`);
  if (max > 0 && ids.length > max) bad.push(`枚数が上限を超えています（${ids.length} > ${max}）`);
  items.push({ name: "入っている絵が、名前・大きさ・枚数の決まりを守っている", ok: bad.length === 0, detail: bad.length > 0 ? bad.join(" / ") : `${ids.length}枚` });

  const missing = FIRST_BATCH.filter((id) => !ids.includes(id));
  items.push({
    name: "見た目の試し（依頼 1回目の10枚）が入っている",
    ok: missing.length === 0,
    detail: missing.length > 0 ? `まだの絵: ${missing.join("、")}` : undefined,
  });

  const all = runNode(["scripts/check/all.ts"]);
  items.push({ name: "全検査が通る", ok: all.code === 0, detail: all.code === 0 ? undefined : lastLines(all.out + all.err, 10) });
  const e2e = runNode(["scripts/check/e2e-gate.ts"]);
  items.push({ name: "通し操作テスト（本物のブラウザ）が、いまのソースで合格している", ok: e2e.code === 0, detail: lastLines(e2e.out + e2e.err, 4) });

  const tags = buildTags();
  const latest = tags.length > 0 ? `build-${tags[tags.length - 1]}` : "";
  const hasArt = latest !== "" && FIRST_BATCH.every((id) => git(["cat-file", "-e", `${latest}:src/assets/img/${id}.webp`]).code === 0);
  const dirty = dirtyFiles();
  items.push({
    name: "見た目の試しの絵が入ったビルドがあり、未記録の変更がない",
    ok: hasArt && dirty.length === 0,
    detail: !hasArt ? "見た目の試しの絵が入ったビルドが、まだありません（art-in のあと play）" : dirty.length > 0 ? `未記録の変更: ${dirty.length}件` : undefined,
  });

  return {
    items,
    human: [
      "公開URLを iPhone で開き、絵の入った画面（旅、団員、勧誘）を見る",
      "G2: この絵柄で残りの絵を作ってよいか（画風の固定）を決める。直したい点があれば、依頼文の直し方を Claude に頼む",
      "G1 の残り: やめたくなった時刻、最後の10分に次が見たいと思えたか、初見の3人（絵の入ったビルドで）",
    ],
  };
}
