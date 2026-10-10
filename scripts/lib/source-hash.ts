// 画面とルールのソース（src/、params/）の指紋。
// 通し操作テストの結果が「いまのソースで取ったものか」を確かめるのに使う。

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIRS = ["src", "params"];

function walk(base: string, rel: string, out: string[]): void {
  const full = path.join(base, rel);
  if (!existsSync(full)) return;
  for (const name of readdirSync(full).sort()) {
    const child = `${rel}/${name}`;
    if (statSync(path.join(base, child)).isDirectory()) walk(base, child, out);
    else out.push(child);
  }
}

export function sourceHash(root: string): string {
  const files: string[] = [];
  for (const d of DIRS) walk(root, d, files);
  const hash = createHash("sha256");
  for (const f of files) {
    hash.update(f);
    hash.update("\0");
    // 改行の違い（Windows と Linux）で指紋が変わらないようにする
    hash.update(readFileSync(path.join(root, f)).toString("latin1").replace(/\r\n/g, "\n"), "latin1");
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}
