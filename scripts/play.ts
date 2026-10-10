// 遊べるビルドを出す。検査に落ちたビルドは出さない。
//
//   node scripts/play.ts
//
// 流れ: 未記録の変更がないか → 全検査 → 番号を付ける（build-N）→ ビルド → 公開

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SRC_ROOT, buildTags, dirtyFiles, git, gitOk, runNode } from "./lib/env.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!gitOk()) fail("履歴（git）がまだありません。");

const dirty = dirtyFiles();
if (dirty.length > 0) {
  fail(`未記録の変更が ${dirty.length}件あります。先に記録（コミット）してください:\n${dirty.map((l) => "  " + l).join("\n")}`);
}

console.log("検査を実行します…");
const check = runNode(["scripts/check/all.ts"]);
process.stdout.write(check.out);
if (check.code !== 0) {
  process.stderr.write(check.err);
  fail("検査に落ちたので、ビルドは出しません。");
}

// 番号を付ける（いまの状態にすでに番号があれば、それを使う）
const here = git(["tag", "--points-at", "HEAD", "-l", "build-*"]).out.split("\n").map((t) => t.trim()).filter(Boolean);
let tag = here.sort((a, b) => Number(b.replace("build-", "")) - Number(a.replace("build-", "")))[0];
if (!tag) {
  const tags = buildTags();
  tag = `build-${(tags[tags.length - 1] ?? 0) + 1}`;
  const made = git(["tag", tag]);
  if (made.code !== 0) fail("番号を付けられませんでした:\n" + made.err);
}

const built = runNode(["scripts/build.ts"]);
process.stdout.write(built.out);
if (built.code !== 0) {
  process.stderr.write(built.err);
  fail("ビルドに失敗しました。");
}

// 公開
let provider = "";
let url = "";
const cfgFile = path.join(SRC_ROOT, "pipeline/publish.json");
if (existsSync(cfgFile)) {
  try {
    const cfg = JSON.parse(readFileSync(cfgFile, "utf8")) as { provider?: string | null; url?: string | null };
    provider = (cfg.provider ?? "").trim();
    url = (cfg.url ?? "").trim();
  } catch {
    // 未設定として扱う
  }
}

console.log("");
console.log(`ビルド: ${tag}`);
if (provider === "" || url === "") {
  console.log("公開: 公開先がまだ決まっていないので、公開はしていません（dist/ にビルドがあります）。");
} else if (!existsSync("scripts/publish.ts")) {
  console.log(`公開: 公開の手順（scripts/publish.ts）がまだありません。公開先は ${provider} です。`);
} else {
  const pub = runNode(["scripts/publish.ts"]);
  process.stdout.write(pub.out);
  if (pub.code !== 0) {
    process.stderr.write(pub.err);
    fail("公開に失敗しました。ビルドは dist/ にあります。");
  }
  console.log(`公開: ${url}`);
  console.log(`iPhoneで開いたら、画面の「ビルド」が ${tag} になっていることを確かめてください。`);
}
