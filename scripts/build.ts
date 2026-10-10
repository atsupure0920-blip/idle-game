// 画面をビルドして dist/ に出す。
//
//   node scripts/build.ts            … 遊んで確かめる用（ログ機能つき）
//   node scripts/build.ts --release  … 公開用（デバッグ機能なし、圧縮あり）

import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentBuildId } from "./lib/env.ts";

const release = process.argv.includes("--release");
const outDir = "dist";
const buildId = currentBuildId();

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

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

console.log(`ビルドしました: ${buildId}${release ? "（公開用）" : "（確認用）"} → ${outDir}/`);
