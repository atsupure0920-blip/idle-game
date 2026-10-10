// スクリプト共通の道具。
//
// ROOT      … いま実行している場所（作業用コピー、またはプロジェクトそのもの）
// SRC_ROOT  … git のリポジトリがある正本の場所（scripts/vm/run.sh が IDLE_SRC で渡す）

import { spawnSync } from "node:child_process";
import path from "node:path";

export const ROOT = process.cwd();
export const SRC_ROOT = process.env["IDLE_SRC"] && process.env["IDLE_SRC"] !== "" ? process.env["IDLE_SRC"] : ROOT;

export interface RunResult {
  code: number;
  out: string;
  err: string;
}

export function run(cmd: string, args: string[], cwd: string = ROOT, env: NodeJS.ProcessEnv = process.env): RunResult {
  const r = spawnSync(cmd, args, { cwd, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return {
    code: r.status ?? (r.error ? 127 : 1),
    out: r.stdout ?? "",
    err: (r.stderr ?? "") + (r.error ? String(r.error) : ""),
  };
}

/** node でスクリプトを実行する。 */
export function runNode(args: string[], cwd: string = ROOT, env: NodeJS.ProcessEnv = process.env): RunResult {
  return run(process.execPath, args, cwd, env);
}

/** node_modules/.bin の道具を実行する。 */
export function runBin(name: string, args: string[], cwd: string = ROOT): RunResult {
  const file = process.platform === "win32" ? `${name}.cmd` : name;
  return run(path.join(cwd, "node_modules", ".bin", file), args, cwd);
}

export function git(args: string[], cwd: string = SRC_ROOT): RunResult {
  return run("git", args, cwd);
}

export function gitOk(cwd: string = SRC_ROOT): boolean {
  return git(["rev-parse", "--is-inside-work-tree"], cwd).code === 0;
}

/** コミットする。名前の設定がなければ仮の名前を使い、IDLE_COMMIT_TRAILER があれば末尾に付ける。 */
export function gitCommit(message: string, cwd: string = SRC_ROOT): RunResult {
  const identity: string[] = [];
  if (git(["config", "user.name"], cwd).out.trim() === "") {
    identity.push("-c", "user.name=idle-game", "-c", "user.email=dev@idle-game.invalid");
  }
  const trailer = process.env["IDLE_COMMIT_TRAILER"];
  const full = trailer && trailer.trim() !== "" ? `${message}\n\n${trailer.trim()}\n` : message;
  return git([...identity, "commit", "-m", full], cwd);
}

/** build-N のタグを番号の小さい順に返す。 */
export function buildTags(cwd: string = SRC_ROOT): number[] {
  const r = git(["tag", "-l", "build-*"], cwd);
  if (r.code !== 0) return [];
  return r.out
    .split("\n")
    .map((t) => /^build-(\d+)$/.exec(t.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

/** 変更のあるファイルの一覧（git status --porcelain の各行）。 */
export function dirtyFiles(cwd: string = SRC_ROOT): string[] {
  const r = git(["status", "--porcelain"], cwd);
  if (r.code !== 0) return [];
  return r.out.split("\n").filter((l) => l.trim() !== "");
}

/** いまのコミットに付けるビルド名。build-N のタグがちょうど付いていればそれ、なければ dev-xxxx。 */
export function currentBuildId(cwd: string = SRC_ROOT): string {
  const fromEnv = process.env["BUILD_ID"];
  if (fromEnv && fromEnv !== "") return fromEnv;
  if (!gitOk(cwd)) return "dev";
  const dirty = dirtyFiles(cwd).length > 0;
  if (!dirty) {
    const tags = git(["tag", "--points-at", "HEAD", "-l", "build-*"], cwd).out.split("\n").map((t) => t.trim()).filter(Boolean);
    const nums = tags.map((t) => Number(t.replace("build-", ""))).filter((n) => Number.isInteger(n)).sort((a, b) => b - a);
    if (nums.length > 0) return `build-${nums[0]}`;
  }
  const sha = git(["rev-parse", "--short", "HEAD"], cwd).out.trim();
  return sha === "" ? "dev" : `dev-${sha}${dirty ? "+" : ""}`;
}

export const STAGES = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_NAMES: Record<Stage, string> = {
  S0: "準備と導通",
  S1: "仕様と契約",
  S2: "最小の核",
  S3: "灰色試作",
  S4: "絵柄決め",
  S5: "縦切り",
  S6: "量産",
  S7: "仕上げ",
};

/** 終わった段階（S0-done などのタグがあるもの）。 */
export function doneStages(cwd: string = SRC_ROOT): Stage[] {
  const tags = new Set(git(["tag", "-l", "S?-done"], cwd).out.split("\n").map((t) => t.trim()));
  return STAGES.filter((s) => tags.has(`${s}-done`));
}

/** いまの段階（まだ終わっていない最初の段階）。全部終わっていれば null。 */
export function currentStage(cwd: string = SRC_ROOT): Stage | null {
  const done = new Set(doneStages(cwd));
  return STAGES.find((s) => !done.has(s)) ?? null;
}
