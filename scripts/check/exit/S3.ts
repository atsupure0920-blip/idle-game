// S3（灰色試作）の出口。この先のゲートは G1（続行の採点）。
//
// 機械で確かめること:
//   - 画面、進行役、通しのテストがそろっている
//   - 全検査、合否の数字、通し操作テスト（本物のブラウザ）の記録
//   - 遊べるビルドが公開されている
//   - G1 の採点が記録されている（feedback/G1.md。ユーザーの記録をもとに Claude が書く）

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SRC_ROOT, buildTags, dirtyFiles, git, runNode } from "../../lib/env.ts";
import { httpGet } from "../../lib/http.ts";
import type { ExitReport, ExitItem } from "../exit.ts";

function lastLines(text: string, n: number): string {
  return text.trim().split("\n").slice(-n).join("\n");
}

function buildIdOf(body: string): string {
  try {
    return (JSON.parse(body) as { buildId?: string }).buildId ?? "";
  } catch {
    return "";
  }
}

/** 公開されているビルドが、最新の番号か。 */
function checkPublished(latest: string): ExitItem {
  let url = "";
  let repo = "";
  try {
    const cfg = JSON.parse(readFileSync(path.join(SRC_ROOT, "pipeline/publish.json"), "utf8")) as { url?: string | null; repo?: string | null };
    url = (cfg.url ?? "").trim();
    repo = (cfg.repo ?? "").trim();
  } catch {
    // 未設定として扱う
  }
  if (url === "") return { name: "遊べるビルドが公開されている", ok: false, detail: "公開先が決まっていません" };

  const direct = httpGet(`${url.replace(/\/$/, "")}/build.json?t=${Date.now()}`);
  if (direct.reached) {
    const name = "公開URLが最新のビルドを返す";
    if (direct.status !== 200) return { name, ok: false, detail: `応答が ${direct.status} でした: ${url}` };
    const id = buildIdOf(direct.body);
    return id === latest ? { name, ok: true } : { name, ok: false, detail: `公開されているのは ${id || "不明"}、最新は ${latest} です` };
  }

  const name = "公開用の置き場に最新のビルドが載っている（公開URLには作業環境から届かない）";
  if (repo === "") return { name, ok: false, detail: "公開URLに届かず、リポジトリの指定もありません" };
  const headers: Record<string, string> = { Accept: "application/vnd.github.raw+json", "User-Agent": "idle-game-check" };
  const tokenFile = path.join(SRC_ROOT, ".secrets/github-token.txt");
  if (existsSync(tokenFile)) {
    const token = readFileSync(tokenFile, "utf8").replace(/^﻿/, "").trim();
    if (token !== "" && !/\s/.test(token)) headers["Authorization"] = `Bearer ${token}`;
  }
  const api = httpGet(`https://api.github.com/repos/${repo}/contents/build.json?ref=gh-pages`, headers);
  if (!api.reached) return { name, ok: false, detail: `GitHub に届きませんでした（${api.error}）` };
  if (api.status !== 200) return { name, ok: false, detail: `公開用の置き場を読めませんでした（応答 ${api.status}）` };
  const id = buildIdOf(api.body);
  return id === latest ? { name, ok: true } : { name, ok: false, detail: `載っているのは ${id || "不明"}、最新は ${latest} です` };
}

export async function check(): Promise<ExitReport> {
  const items: ExitItem[] = [];

  const need = ["src/ui/session.ts", "src/ui/views.ts", "src/ui/battleview.ts", "tests/flow.test.ts", "tests/e2e/run.ts", "scripts/check/e2e-gate.ts"];
  const missing = need.filter((f) => !existsSync(path.join(SRC_ROOT, f)));
  items.push({ name: "画面、進行役、通しのテストがそろっている", ok: missing.length === 0, detail: missing.length > 0 ? `ありません: ${missing.join("、")}` : undefined });

  const all = runNode(["scripts/check/all.ts"]);
  items.push({ name: "全検査が通る（通しの流れのテストを含む）", ok: all.code === 0, detail: all.code === 0 ? undefined : lastLines(all.out + all.err, 10) });

  const acc = runNode(["scripts/check/acceptance.ts"]);
  items.push({ name: "模擬プレイが、合否の数字にすべて合格する", ok: acc.code === 0, detail: acc.code === 0 ? undefined : lastLines(acc.out + acc.err, 12) });

  const e2e = runNode(["scripts/check/e2e-gate.ts"]);
  items.push({ name: "通し操作テスト（本物のブラウザ）が、いまのソースで合格している", ok: e2e.code === 0, detail: lastLines(e2e.out + e2e.err, 6) });

  // 遊べるビルド: ゲームの画面を含むビルドに番号が付き、それが公開されている
  const tags = buildTags();
  const latest = tags.length > 0 ? `build-${tags[tags.length - 1]}` : "";
  const hasGame = latest !== "" && git(["cat-file", "-e", `${latest}:src/ui/session.ts`]).code === 0;
  const dirty = dirtyFiles();
  items.push({
    name: "ゲームの画面を含むビルドがあり、未記録の変更がない",
    ok: hasGame && dirty.length === 0,
    detail: !hasGame ? "ゲームの画面を含むビルドが、まだありません（play を実行）" : dirty.length > 0 ? `未記録の変更: ${dirty.length}件` : undefined,
  });
  if (hasGame) items.push(checkPublished(latest));

  // G1 の採点
  const g1File = path.join(SRC_ROOT, "feedback/G1.md");
  const g1 = existsSync(g1File) ? readFileSync(g1File, "utf8") : "";
  const verdict = /^判定:\s*(.+)$/m.exec(g1)?.[1]?.trim() ?? "";
  const decided = ["進める", "もう1反復", "やめる", "型を変える"].some((v) => verdict.startsWith(v));
  items.push({
    name: "G1 の採点が記録されている（feedback/G1.md）",
    ok: decided,
    detail: decided ? `判定: ${verdict}` : g1 === "" ? "feedback/G1.md がありません" : "まだ判定が書かれていません（あなたのプレイの記録を待っています）",
  });

  return {
    items,
    human: [
      "公開URLを iPhone で開き、速度変更なしで30分遊ぶ。終わったら「ログ」→「コピー」で記録を送る",
      "遊びながら、やめたくなった時刻（あれば）と、「次が見たい」と思えた場面をメモする",
      "翌日にもう一度開き、放置報酬を受け取って、続きを遊ぶ",
      "初見の3人に、説明なしで10分遊んでもらい、止まった場所と最初の疑問を聞く",
      "G1: 数えた結果を見て、進める・削る・やめる を決める",
    ],
  };
}
