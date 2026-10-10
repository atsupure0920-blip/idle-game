// 指定した番号のビルドの状態に戻す。
//
//   node scripts/rollback.ts 14      … build-14 の状態に戻す
//
// 履歴は消さない。「戻した」という新しい記録を積むので、戻したこと自体も取り消せる。
// 保存していない作業があれば、先に「退避」として記録してから戻す。
// feedback/ と pipeline/（感想や決定の記録）は戻さない。

import { git, gitCommit, gitOk, dirtyFiles, buildTags } from "./lib/env.ts";

const arg = process.argv[2] ?? "";
const n = Number(arg.replace(/^build-/, ""));

if (!gitOk()) {
  console.error("履歴（git）がまだありません。");
  process.exit(2);
}
if (!Number.isInteger(n) || n < 1) {
  const tags = buildTags();
  console.error("使い方: rollback <ビルド番号>");
  console.error(tags.length > 0 ? `いまあるビルド: ${tags.map((t) => `build-${t}`).join(", ")}` : "まだビルドがありません。");
  process.exit(2);
}
const tag = `build-${n}`;
if (git(["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]).code !== 0) {
  console.error(`${tag} が見つかりません。いまあるビルド: ${buildTags().map((t) => `build-${t}`).join(", ") || "なし"}`);
  process.exit(2);
}

// 1. 保存していない作業を退避する
const dirty = dirtyFiles();
if (dirty.length > 0) {
  git(["add", "-A"]);
  const saved = gitCommit(`退避: ${tag} へ戻す前の作業（${dirty.length}ファイル）`);
  if (saved.code !== 0) {
    console.error("退避に失敗しました:\n" + saved.out + saved.err);
    process.exit(1);
  }
  console.log(`保存していない作業を退避しました（${dirty.length}ファイル）。`);
}

// 2. 記録以外を、そのビルドの状態に合わせる
const restored = git(["restore", `--source=${tag}`, "--staged", "--worktree", "--", ".", ":(exclude)feedback", ":(exclude)pipeline"]);
if (restored.code !== 0) {
  console.error("戻すのに失敗しました:\n" + restored.out + restored.err);
  process.exit(1);
}

// 3. 戻したことを記録する
if (dirtyFiles().length === 0) {
  console.log(`すでに ${tag} と同じ状態です。何も変えていません。`);
  process.exit(0);
}
const committed = gitCommit(`ロールバック: ${tag} の状態へ戻す`);
if (committed.code !== 0) {
  console.error("記録に失敗しました:\n" + committed.out + committed.err);
  process.exit(1);
}
console.log(`${tag} の状態に戻しました。続けて「play」で確かめてください。`);
