// S0（準備と導通）の出口。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SRC_ROOT, buildTags, dirtyFiles, gitOk, runNode } from "../../lib/env.ts";
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

/** 公開されているビルドが最新かを確かめる。 */
function checkPublished(url: string, repo: string, latest: string): ExitItem {
  // 1. 公開URLそのものに問い合わせる
  const direct = httpGet(`${url.replace(/\/$/, "")}/build.json?t=${Date.now()}`);
  if (direct.reached) {
    const name = "公開URLが最新のビルドを返す";
    if (direct.status !== 200) return { name, ok: false, detail: `応答が ${direct.status} でした: ${url}` };
    const id = buildIdOf(direct.body);
    return id === latest ? { name, ok: true } : { name, ok: false, detail: `公開されているのは ${id || "不明"}、最新は ${latest} です` };
  }

  // 2. 作業環境から公開URLに届かない場合は、GitHub 上の公開用の置き場（gh-pages）を確かめる。
  //    「実際のURLで表示されること」は、ここでは確かめられない（ユーザーの iPhone と Claude 側の別経路で確かめる）。
  const name = "公開用の置き場に最新のビルドが載っている（公開URLには作業環境から届かない）";
  if (repo === "") return { name, ok: false, detail: `公開URLに届かず、リポジトリの指定もありません（${direct.error}）` };
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

  const all = runNode(["scripts/check/all.ts"]);
  items.push({ name: "全検査が通る", ok: all.code === 0, detail: all.code === 0 ? undefined : lastLines(all.out + all.err, 12) });

  const self = runNode(["scripts/check/selftest.ts"]);
  items.push({
    name: "検査が落ちるべきときに落ちる（自己診断）と、元に戻せる",
    ok: self.code === 0,
    detail: self.code === 0 ? undefined : lastLines(self.out + self.err, 12),
  });

  const hasGit = gitOk();
  const tags = hasGit ? buildTags() : [];
  const dirty = hasGit ? dirtyFiles() : [];
  items.push({
    name: "履歴があり、ビルドが1つ以上あり、未記録の変更がない",
    ok: hasGit && tags.length > 0 && dirty.length === 0,
    detail: !hasGit ? "履歴（git）がありません" : tags.length === 0 ? "ビルドがまだありません（play を実行）" : dirty.length > 0 ? `未記録の変更: ${dirty.length}件` : undefined,
  });

  let url = "";
  let repo = "";
  try {
    const cfg = JSON.parse(readFileSync(path.join(SRC_ROOT, "pipeline/publish.json"), "utf8")) as { url?: string | null; repo?: string | null };
    url = (cfg.url ?? "").trim();
    repo = (cfg.repo ?? "").trim();
  } catch {
    // 未設定として扱う
  }
  if (url === "") {
    items.push({ name: "公開URLが最新のビルドを返す", ok: false, detail: "公開先がまだ決まっていません（pipeline/publish.json）" });
  } else {
    const latest = tags.length > 0 ? `build-${tags[tags.length - 1]}` : "";
    items.push(checkPublished(url, repo, latest));
  }

  return {
    items,
    human: [
      "iPhoneで公開URLを開き、「導通確認」の画面が出た",
      "ホーム画面に追加し、そのアイコンから開けた（「開き方」が「ホーム画面から」になる）",
      "タップ → 閉じる → 開き直す、で回数が残っていた",
      "「ログ」ボタンからログを取り出して、Claudeに渡せた",
    ],
  };
}
