// 画面をビルドして dist/ に出す。
//
//   node scripts/build.ts            … 遊んで確かめる用（ログ機能つき）
//   node scripts/build.ts --release  … 公開用（デバッグ機能なし、圧縮あり）
//   node scripts/build.ts --out 場所  … 出力先を変える（既定は dist）

import { build } from "esbuild";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { currentBuildId } from "./lib/env.ts";
import { readContentData } from "./lib/content.ts";

const release = process.argv.includes("--release");
// 数値と定義（params/*.json）は、ビルド時に画面のコードへ埋め込む（読み込みの失敗が起きないように）。
const contentData = readContentData(".");
// 出力先。ふだんは dist/。通し操作テストが公開用ビルドを別の場所に作るときだけ、--out で変える。
const outArg = process.argv.indexOf("--out");
const outDir = outArg >= 0 && process.argv[outArg + 1] ? (process.argv[outArg + 1] as string) : "dist";
const buildId = currentBuildId();

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// 絵（src/assets/img/*.webp）。置いてある絵の id を画面のコードへ埋め込み、ファイルは dist/img/ へ写す。
const artDir = "src/assets/img";
const artIds = existsSync(artDir)
  ? (await readdir(artDir))
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.slice(0, -".webp".length))
      .sort()
  : [];
if (artIds.length > 0) {
  await mkdir(path.join(outDir, "img"), { recursive: true });
  for (const id of artIds) await copyFile(path.join(artDir, `${id}.webp`), path.join(outDir, "img", `${id}.webp`));
}

await build({
  entryPoints: ["src/ui/main.ts"],
  bundle: true,
  format: "iife",
  target: ["es2020", "safari15"],
  outfile: path.join(outDir, "app.js"),
  minify: release,
  sourcemap: release ? false : "linked",
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __DEBUG__: release ? "false" : "true",
    __CONTENT__: JSON.stringify(contentData),
    __ART__: JSON.stringify(artIds),
  },
  logLevel: "warning",
});

const html = await readFile("src/ui/index.html", "utf8");
await writeFile(path.join(outDir, "index.html"), html.replaceAll("%BUILD_ID%", encodeURIComponent(buildId)));
for (const name of ["style.css", "manifest.webmanifest", "icon-180.png"]) {
  await copyFile(path.join("src/ui", name), path.join(outDir, name));
}
await writeFile(
  path.join(outDir, "build.json"),
  JSON.stringify({ buildId, release, builtAt: new Date().toISOString() }, null, 2) + "\n",
);

console.log(`ビルドしました: ${buildId}${release ? "（公開用）" : "（確認用）"}、絵 ${artIds.length}枚 → ${outDir}/`);
