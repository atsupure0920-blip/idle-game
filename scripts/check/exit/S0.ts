// S0（準備と導通）の出口。

import { readFileSync } from "node:fs";
import path from "node:path";
import { SRC_ROOT, buildTags, dirtyFiles, gitOk, runNode } from "../../lib/env.ts";
import type { ExitReport, ExitItem } from "../exit.ts";

function lastLines(text: string, n: number): string {
  return text.trim().split("\n").slice(-n).join("\n");
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
  try {
    const cfg = JSON.parse(readFileSync(path.join(SRC_ROOT, "pipeline/publish.json"), "utf8")) as { url?: string | null };
    url = (cfg.url ?? "").trim();
  } catch {
    // 未設定として扱う
  }
  if (url === "") {
    items.push({ name: "公開URLが最新のビルドを返す", ok: false, detail: "公開先がまだ決まっていません（pipeline/publish.json）" });
  } else {
    const latest = tags.length > 0 ? `build-${tags[tags.length - 1]}` : "";
    let detail: string | undefined;
    let ok = false;
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/build.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) detail = `応答が ${res.status} でした: ${url}`;
      else {
        const info = (await res.json()) as { buildId?: string };
        ok = info.buildId === latest;
        if (!ok) detail = `公開されているのは ${info.buildId ?? "不明"}、最新は ${latest} です`;
      }
    } catch (e) {
      detail = `つながりませんでした: ${url}（${String(e)}）`;
    }
    items.push({ name: "公開URLが最新のビルドを返す", ok, detail });
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
