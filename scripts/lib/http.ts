// 外への問い合わせ（GET）。
//
// 作業環境からの通信は中継（プロキシ）を通る。Node.js の fetch は中継を使わないので、
// 中継に対応している curl で問い合わせる。届かなかった場合は reached が false になる。

import { spawnSync } from "node:child_process";

export interface HttpResult {
  /** 相手まで届いたか（届かなければ status と body は意味を持たない）。 */
  reached: boolean;
  status: number;
  body: string;
  error: string;
}

export function httpGet(url: string, headers: Record<string, string> = {}, timeoutSec: number = 20): HttpResult {
  // ヘッダー（鍵を含むことがある）は、コマンドの引数に出さず、設定として標準入力から渡す。
  const config = [
    `url = "${url.replaceAll('"', "%22")}"`,
    "silent",
    "show-error",
    "location",
    `max-time = ${timeoutSec}`,
    'write-out = "\\n%{http_code}"',
    ...Object.entries(headers).map(([k, v]) => `header = "${k}: ${v.replaceAll('"', '\\"')}"`),
  ].join("\n");
  const r = spawnSync("curl", ["--config", "-"], { input: config, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.error) return { reached: false, status: 0, body: "", error: String(r.error) };
  const out = r.stdout ?? "";
  const cut = out.lastIndexOf("\n");
  const status = Number(out.slice(cut + 1).trim());
  if (r.status !== 0 || !Number.isInteger(status) || status === 0) {
    return { reached: false, status: 0, body: "", error: (r.stderr ?? "").trim() || `curl が ${r.status} で終わりました` };
  }
  return { reached: true, status, body: out.slice(0, cut), error: "" };
}
