// デバッグ用の機能。公開用ビルド（--release）には入らない。
//
//   - エラーが起きたら、画面の上に赤い帯を出す。
//   - 「ログ」ボタンから、状況をまとめたテキストを書き出せる。
//     コードを読めなくても、このテキストを渡せば原因を調べられる。

interface LogEntry {
  atMs: number;
  type: string;
  data: Record<string, string | number | boolean>;
}

interface DebugOptions {
  buildId: string;
  getSaveText: () => string;
  /** プレイの記録（遊んだ時間、到達した面、操作の回数、出来事）。 */
  getPlayLines?: () => string[];
  /** 「ログ」ボタンを置く場所。なければ画面の右下に浮かべる。 */
  mount?: HTMLElement;
}

const MAX_ENTRIES = 200;
const events: LogEntry[] = [];
const errors: LogEntry[] = [];
let options: DebugOptions | null = null;

/** 出来事を記録する。デバッグを入れていないビルドでは何もしないのと同じ。 */
export function logEvent(type: string, data: Record<string, string | number | boolean> = {}): void {
  push(events, { atMs: Date.now(), type, data });
}

export function installDebug(opts: DebugOptions): void {
  options = opts;

  window.addEventListener("error", (e) => {
    recordError("error", e.message, e.error instanceof Error ? e.error.stack : undefined, `${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason: unknown = e.reason;
    recordError("promise", reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined);
  });

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = opts.mount ? "dbg-chip" : "dbg-fab";
  fab.dataset["testid"] = "debug-log-button";
  fab.textContent = "ログ";
  fab.addEventListener("click", openSheet);
  (opts.mount ?? document.body).appendChild(fab);
}

/** ログの画面を開く（ほかの場所のボタンからも呼べるように）。 */
export function openLogSheet(): void {
  openSheet();
}

/** いまの状況をまとめたテキストを作る。 */
export function buildReport(): string {
  const lines: string[] = [];
  const nav = navigator as Navigator & { standalone?: boolean };
  lines.push("=== 放置ゲーム ログ ===");
  lines.push(`ビルド: ${options?.buildId ?? "不明"}`);
  lines.push(`書き出した時刻: ${new Date().toISOString()}`);
  lines.push(`URL: ${location.href}`);
  lines.push(`端末: ${navigator.userAgent}`);
  lines.push(`画面: ${window.innerWidth}x${window.innerHeight} (倍率 ${window.devicePixelRatio})`);
  lines.push(`ホーム画面から起動: ${nav.standalone === true ? "はい" : "いいえ"}`);
  lines.push("");
  lines.push("--- プレイの記録 ---");
  try {
    for (const l of options?.getPlayLines?.() ?? []) lines.push(l);
  } catch (e) {
    lines.push(`（記録を作れませんでした: ${String(e)}）`);
  }
  lines.push("");
  lines.push(`--- エラー (${errors.length}件) ---`);
  for (const e of errors) lines.push(formatEntry(e));
  lines.push("");
  lines.push(`--- 出来事 (${events.length}件) ---`);
  for (const e of events) lines.push(formatEntry(e));
  lines.push("");
  lines.push("--- セーブ ---");
  lines.push(options?.getSaveText() ?? "");
  return lines.join("\n");
}

function recordError(kind: string, message: string, stack?: string, where?: string): void {
  push(errors, { atMs: Date.now(), type: kind, data: { message, where: where ?? "", stack: stack ?? "" } });
  showBand();
}

function push(list: LogEntry[], entry: LogEntry): void {
  list.push(entry);
  if (list.length > MAX_ENTRIES) list.shift();
}

function formatEntry(e: LogEntry): string {
  return `${new Date(e.atMs).toISOString()} [${e.type}] ${JSON.stringify(e.data)}`;
}

function showBand(): void {
  let band = document.querySelector<HTMLElement>(".dbg-band");
  if (!band) {
    band = document.createElement("div");
    band.className = "dbg-band";
    band.dataset["testid"] = "debug-error-band";
    const label = document.createElement("span");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "ログを書き出す";
    button.addEventListener("click", openSheet);
    band.append(label, button);
    document.body.appendChild(band);
  }
  const label = band.querySelector("span");
  if (label) label.textContent = `エラーが起きました（${errors.length}件）`;
}

function openSheet(): void {
  if (document.querySelector(".dbg-sheet")) return;
  const report = buildReport();
  const fileName = `idle-game-log-${options?.buildId ?? "dev"}-${Date.now()}.txt`;

  const sheet = document.createElement("div");
  sheet.className = "dbg-sheet";
  sheet.dataset["testid"] = "debug-sheet";
  const panel = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "ログ";
  const hint = document.createElement("span");
  hint.textContent = "「コピー」を押し、iPhoneのClaudeでいつもの会話を開いて、貼り付けて送ってください。";
  hint.style.fontSize = "13px";
  const area = document.createElement("textarea");
  area.readOnly = true;
  area.value = report;
  area.dataset["testid"] = "debug-report";
  const row = document.createElement("div");
  row.className = "row";

  const shareBtn = makeButton("ファイルで送る", async () => {
    const file = new File([report], fileName, { type: "text/plain" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch {
      // 共有を取り消した場合など。下の保存に進む。
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });
  const copyBtn = makeButton("コピー", async () => {
    try {
      await navigator.clipboard.writeText(report);
      copyBtn.textContent = "コピーしました";
    } catch {
      area.focus();
      area.select();
      copyBtn.textContent = "選択しました。長押しでコピー";
    }
  });
  const closeBtn = makeButton("閉じる", () => sheet.remove());
  closeBtn.classList.add("ghost");

  row.append(shareBtn, copyBtn, closeBtn);
  panel.append(title, hint, area, row);
  sheet.appendChild(panel);
  document.body.appendChild(sheet);
}

function makeButton(label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", () => void onClick());
  return b;
}
