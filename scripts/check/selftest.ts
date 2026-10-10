// 自己診断: 検査が「落ちるべきときに本当に落ちるか」を確かめる。
//
// プロジェクトの写しを一時フォルダに作り、わざと壊してから検査を走らせる。
// 検査が素通りしたら、その検査は役に立っていないので、この自己診断が不合格になる。
// 「元に戻す」（rollback）も、一時的な履歴の上で実際に試す。
//
//   node scripts/check/selftest.ts

import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, run, runBin, runNode } from "../lib/env.ts";
import type { RunResult } from "../lib/env.ts";

const SKIP = new Set(["node_modules", "dist", "reports", ".git"]);
const made: string[] = [];

function makeCopy(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "idle-selftest-"));
  made.push(dir);
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !SKIP.has(path.relative(ROOT, src).split(path.sep)[0] ?? ""),
  });
  symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  return dir;
}

function envFor(dir: string): NodeJS.ProcessEnv {
  return { ...process.env, IDLE_SRC: dir, BUILD_ID: "" };
}

function replaceIn(file: string, from: string, to: string): void {
  const text = readFileSync(file, "utf8");
  if (!text.includes(from)) throw new Error(`自己診断の前提が崩れています: ${file} に「${from}」がありません`);
  writeFileSync(file, text.replace(from, to));
}

interface Case {
  name: string;
  /** true なら「落ちるはず」。false なら「通るはず」。 */
  expectFail: boolean;
  run: () => RunResult;
}

const cases: Case[] = [
  {
    name: "何も壊していなければ、全検査が通る",
    expectFail: false,
    run: () => {
      const d = makeCopy();
      return runNode(["scripts/check/all.ts"], d, envFor(d));
    },
  },
  {
    name: "テストを書き換えたら、保護の照合が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "tests/core.test.ts"), "\n// 書き換え\n");
      return runNode(["scripts/check/protected.ts", "verify"], d, envFor(d));
    },
  },
  {
    name: "テストを消したら、保護の照合が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      unlinkSync(path.join(d, "tests/core.test.ts"));
      return runNode(["scripts/check/protected.ts", "verify"], d, envFor(d));
    },
  },
  {
    name: "判定スクリプトを書き換えたら、保護の照合が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "scripts/check/all.ts"), "\n// 書き換え\n");
      return runNode(["scripts/check/protected.ts", "verify"], d, envFor(d));
    },
  },
  {
    name: "core で Math.random を使ったら、決まりの検査が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "src/core/state.ts"), "\nexport const bad = (): number => Math.random();\n");
      return runNode(["scripts/check/core-purity.ts"], d, envFor(d));
    },
  },
  {
    name: "core で Date.now を使ったら、決まりの検査が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "src/core/state.ts"), "\nexport const bad = (): number => Date.now();\n");
      return runNode(["scripts/check/core-purity.ts"], d, envFor(d));
    },
  },
  {
    name: "core が画面に触れたら、型の検査が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "src/core/state.ts"), "\nexport const bad = (): string => document.title;\n");
      return runBin("tsc", ["--noEmit", "-p", "tsconfig.core.json"], d);
    },
  },
  {
    name: "画面のコードに型の誤りがあれば、型の検査が落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      appendFileSync(path.join(d, "src/ui/main.ts"), '\nconst wrong: number = "文字";\nvoid wrong;\n');
      return runBin("tsc", ["--noEmit", "-p", "tsconfig.json"], d);
    },
  },
  {
    name: "ルールを壊したら（タップで回数が増えない）、テストが落ちる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      replaceIn(path.join(d, "src/core/state.ts"), "taps: state.taps + 1", "taps: state.taps");
      return runNode(["--test", "tests/**/*.test.ts"], d, envFor(d));
    },
  },
  {
    name: "どれか1つでも落ちたら、全検査も不合格になる",
    expectFail: true,
    run: () => {
      const d = makeCopy();
      replaceIn(path.join(d, "src/core/state.ts"), "taps: state.taps + 1", "taps: state.taps");
      return runNode(["scripts/check/all.ts"], d, envFor(d));
    },
  },
  {
    name: "元に戻す: build-1 に戻すと、コードは戻り、記録は残り、作業は退避される",
    expectFail: false,
    run: () => {
      const d = makeCopy();
      rmSync(path.join(d, "node_modules"));
      const g = (args: string[]): RunResult => run("git", ["-c", "user.name=selftest", "-c", "user.email=selftest@example.invalid", ...args], d);
      const original = readFileSync(path.join(d, "src/core/state.ts"), "utf8");
      const steps: [string, () => boolean][] = [
        ["履歴を作る", () => g(["init", "-q"]).code === 0 && g(["add", "-A"]).code === 0 && g(["commit", "-q", "-m", "初期"]).code === 0 && g(["tag", "build-1"]).code === 0],
        [
          "変更を積む",
          () => {
            appendFileSync(path.join(d, "src/core/state.ts"), "\n// 後から足した行\n");
            writeFileSync(path.join(d, "src/extra.ts"), "export const extra = 1;\n");
            writeFileSync(path.join(d, "feedback/note.md"), "感想のメモ\n");
            return g(["add", "-A"]).code === 0 && g(["commit", "-q", "-m", "変更"]).code === 0 && g(["tag", "build-2"]).code === 0;
          },
        ],
        [
          "保存していない作業がある状態で戻す",
          () => {
            writeFileSync(path.join(d, "wip.txt"), "作業中\n");
            return runNode(["scripts/rollback.ts", "1"], d, envFor(d)).code === 0;
          },
        ],
        ["コードが build-1 と同じ", () => readFileSync(path.join(d, "src/core/state.ts"), "utf8") === original],
        ["後から足したファイルが消えている", () => !existsSync(path.join(d, "src/extra.ts"))],
        ["感想の記録は残っている", () => existsSync(path.join(d, "feedback/note.md"))],
        ["作業中のファイルは履歴に退避されている", () => !existsSync(path.join(d, "wip.txt")) && g(["show", "HEAD~1:wip.txt"]).out.includes("作業中")],
        ["戻した記録がある", () => g(["log", "--format=%s", "-n", "2"]).out.includes("ロールバック: build-1") && g(["log", "--format=%s", "-n", "2"]).out.includes("退避:")],
        ["未記録の変更が残っていない", () => g(["status", "--porcelain"]).out.trim() === ""],
        ["存在しない番号は断る", () => runNode(["scripts/rollback.ts", "99"], d, envFor(d)).code === 2],
      ];
      const failed = steps.filter(([, ok]) => !ok()).map(([label]) => label);
      return { code: failed.length === 0 ? 0 : 1, out: "", err: failed.length === 0 ? "" : `うまくいかなかった手順: ${failed.join("、")}` };
    },
  },
];

let bad = 0;
for (const c of cases) {
  let r: RunResult;
  try {
    r = c.run();
  } catch (e) {
    r = { code: -1, out: "", err: String(e) };
  }
  const failed = r.code !== 0;
  const asExpected = r.code !== -1 && failed === c.expectFail;
  if (!asExpected) bad++;
  console.log(`${asExpected ? "✔" : "✘"} ${c.name}`);
  if (!asExpected) {
    console.log(`    期待: ${c.expectFail ? "落ちる" : "通る"} ／ 実際: ${failed ? "落ちた" : "通った"}`);
    for (const line of `${r.out}\n${r.err}`.trim().split("\n").slice(-15)) console.log("    " + line);
  }
}

for (const dir of made) rmSync(dir, { recursive: true, force: true });

console.log(bad === 0 ? `\n自己診断: ${cases.length}件すべて期待どおり` : `\n自己診断: ${bad}件が期待と違います`);
process.exit(bad === 0 ? 0 : 1);
