// 数値と定義（params/*.json）を読んで、ルールが使う形にまとめる。スクリプトとテストの共通の入口。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildContent } from "../../src/core/params.ts";
import type { Content, ContentData } from "../../src/core/params.ts";

export const CONTENT_FILES = {
  params: "params/base.json",
  members: "params/members.json",
  companions: "params/companions.json",
  missions: "params/missions.json",
  dailies: "params/dailies.json",
} as const;

/** params/*.json の中身を、そのまま読む（画面のビルドにも埋め込む）。 */
export function readContentData(root: string): ContentData {
  const out: Record<string, unknown> = {};
  for (const [key, rel] of Object.entries(CONTENT_FILES)) {
    const file = path.join(root, rel);
    if (!existsSync(file)) throw new Error(`ありません: ${rel}`);
    try {
      out[key] = JSON.parse(readFileSync(file, "utf8")) as unknown;
    } catch {
      throw new Error(`読めません（書式の誤り）: ${rel}`);
    }
  }
  return out as unknown as ContentData;
}

export function loadContent(root: string): Content {
  return buildContent(readContentData(root));
}
