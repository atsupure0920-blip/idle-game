// ビルド（dist/）を GitHub Pages に公開し、履歴を GitHub にバックアップする。
//
//   node scripts/publish.ts            … 公開する
//   node scripts/publish.ts --dry-run  … 送らずに、準備と安全確認だけ行う
//
// 設定:   pipeline/publish.json   { "provider": "github-pages", "repo": "ユーザー名/リポジトリ名", "url": "https://..." }
// 鍵:     .secrets/github-token.txt（履歴に入らない場所。会話に貼らない）
//
// やること:
//   1. dist/ の中身を、公開用の枝（gh-pages）に送る
//   2. 履歴（main）とビルドの番号（タグ）を送る（バックアップ）
//   3. 公開用の枝に、いまのビルドが載ったことを確かめる

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, SRC_ROOT, run } from "./lib/env.ts";
import { httpGet } from "./lib/http.ts";
import type { RunResult } from "./lib/env.ts";

const dryRun = process.argv.includes("--dry-run");
const TOKEN_FILE = ".secrets/github-token.txt";

let token = "";

/** 出力に鍵が混ざらないようにする。 */
function scrub(text: string): string {
  let out = text;
  if (token !== "") out = out.split(token).join("（鍵）");
  return out.replace(/Authorization: \S+ \S+/g, "Authorization: （省略）");
}

function fail(message: string): never {
  console.error(scrub(message));
  process.exit(1);
}

// --- 設定を読む ---
interface PublishConfig {
  provider?: string | null;
  repo?: string | null;
  url?: string | null;
}
let cfg: PublishConfig = {};
try {
  cfg = JSON.parse(readFileSync(path.join(SRC_ROOT, "pipeline/publish.json"), "utf8")) as PublishConfig;
} catch {
  fail("pipeline/publish.json を読めません。");
}
const repo = (cfg.repo ?? "").trim();
const url = (cfg.url ?? "").trim();
if ((cfg.provider ?? "") !== "github-pages") fail("公開先が GitHub Pages に設定されていません（pipeline/publish.json）。");
if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) fail(`リポジトリの指定が正しくありません: "${repo}"（ユーザー名/リポジトリ名）`);
const remote = `https://github.com/${repo}.git`;

// --- ビルドを確かめる ---
// play から呼ばれたときは作業用コピーの dist/、単独で呼ばれたときは正本の dist/ を使う。
const distDir = existsSync(path.join(ROOT, "dist/build.json")) ? path.join(ROOT, "dist") : path.join(SRC_ROOT, "dist");
let buildId = "";
try {
  buildId = (JSON.parse(readFileSync(path.join(distDir, "build.json"), "utf8")) as { buildId?: string }).buildId ?? "";
} catch {
  fail("dist/ にビルドがありません。先に play を実行してください。");
}
const numbered = /^build-\d+$/.test(buildId);
if (!numbered && !dryRun) fail(`番号の付いたビルドではありません（${buildId || "不明"}）。play から実行してください。`);

// --- 鍵を読む ---
const tokenPath = path.join(SRC_ROOT, TOKEN_FILE);
if (existsSync(tokenPath)) token = readFileSync(tokenPath, "utf8").replace(/^﻿/, "").trim();
if (token === "" && !dryRun) {
  fail(`鍵がありません。${TOKEN_FILE} をメモ帳で開き、GitHub で作ったトークンを貼り付けて保存してください。`);
}
if (/\s/.test(token)) fail(`${TOKEN_FILE} に余分な空白や改行が入っています。トークンだけを1行で保存してください。`);

// --- 安全確認: 鍵が履歴や公開物に入らないこと ---
const ignored = run("git", ["check-ignore", "-q", TOKEN_FILE], SRC_ROOT);
if (ignored.code !== 0) fail(`${TOKEN_FILE} が履歴の対象外になっていません。公開を中止しました。`);
if (token !== "") {
  const inHistory = run("git", ["grep", "-F", "-q", "-e", token, "--", "."], SRC_ROOT);
  if (inHistory.code === 0) fail("鍵が、履歴に入るファイルの中に書かれています。公開を中止しました。鍵は作り直してください。");
  const inDist = run("grep", ["-r", "-F", "-q", "-e", token, distDir]);
  if (inDist.code === 0) fail("鍵が、公開するファイルの中に入っています。公開を中止しました。鍵は作り直してください。");
}

// --- 送る準備 ---
const authEnv: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "http.extraHeader",
  GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
};

function explain(r: RunResult): string {
  const text = scrub(`${r.out}\n${r.err}`).trim();
  if (/403|Permission .* denied|denied to/i.test(text)) return text + "\n→ 鍵に書き込みの権限がないか、対象のリポジトリが違います（Contents を Read and write に）。";
  if (/401|Authentication failed|Invalid username or token|could not read Username/i.test(text)) return text + "\n→ 鍵が正しくないか、期限が切れています。作り直して貼り替えてください。";
  if (/Repository not found|404/i.test(text)) return text + "\n→ リポジトリが見つかりません。名前と、鍵の対象リポジトリを確かめてください。";
  return text;
}

const stage = mkdtempSync(path.join(os.tmpdir(), "idle-publish-"));
// 途中で終わっても、一時フォルダは必ず片付ける。
process.on("exit", () => rmSync(stage, { recursive: true, force: true }));
{
  cpSync(distDir, stage, { recursive: true });
  writeFileSync(path.join(stage, ".nojekyll"), "");
  const g = (args: string[], env: NodeJS.ProcessEnv = process.env): RunResult =>
    run("git", ["-c", "user.name=idle-game", "-c", "user.email=idle-game@users.noreply.invalid", ...args], stage, env);
  if (g(["init", "-q", "-b", "gh-pages"]).code !== 0 || g(["add", "-A"]).code !== 0 || g(["commit", "-q", "-m", `公開: ${buildId}`]).code !== 0) {
    fail("公開用のまとまりを作れませんでした。");
  }
  const files = g(["ls-files"]).out.trim().split("\n").filter(Boolean);

  if (dryRun) {
    console.log("準備と安全確認: 問題なし（送っていません）");
    console.log(`  公開するビルド: ${buildId}${numbered ? "" : "（番号なし。実際の公開では play から実行する）"}`);
    console.log(`  公開先: ${remote} の gh-pages`);
    console.log(`  公開URL: ${url || "（未設定）"}`);
    console.log(`  ファイル: ${files.length}個（${files.join(", ")}）`);
    console.log(`  鍵: ${token === "" ? "まだ置かれていません" : "あり"}`);
    process.exit(0);
  }

  // 1. 公開用の枝へ送る
  const pushed = g(["push", "--force", remote, "gh-pages"], authEnv);
  if (pushed.code !== 0) fail("公開用の枝へ送れませんでした:\n" + explain(pushed));
  console.log(`公開用の枝へ送りました（${buildId}、${files.length}ファイル）。`);

  // 2. 履歴とビルド番号を送る（バックアップ）
  const main = run("git", ["push", remote, "main"], SRC_ROOT, authEnv);
  const tags = run("git", ["push", remote, "--tags"], SRC_ROOT, authEnv);
  if (main.code !== 0 || tags.code !== 0) {
    console.error("注意: 履歴のバックアップを送れませんでした（公開そのものは済んでいます）:\n" + explain(main.code !== 0 ? main : tags));
  } else {
    console.log("履歴をバックアップしました。");
  }

  // 3. 載ったことを確かめる
  let verified = false;
  let detail = "";
  const res = httpGet(`https://api.github.com/repos/${repo}/contents/build.json?ref=gh-pages`, {
    Accept: "application/vnd.github.raw+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "idle-game-publish",
  });
  if (!res.reached) {
    detail = `GitHub に届きませんでした（${scrub(res.error)}）`;
  } else if (res.status !== 200) {
    detail = `確認の応答が ${res.status} でした`;
  } else {
    let published = "";
    try {
      published = (JSON.parse(res.body) as { buildId?: string }).buildId ?? "";
    } catch {
      // 読めなければ空のまま
    }
    verified = published === buildId;
    if (!verified) detail = `載っているのは ${published || "不明"} でした`;
  }
  if (!verified) fail(`公開用の枝の確認に失敗しました: ${detail}`);
  console.log(`確認: 公開用の枝に ${buildId} が載っています。`);
  console.log("画面への反映には、数分かかることがあります。");
}
