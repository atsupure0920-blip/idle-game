// 通し操作テスト（本物のブラウザで、画面を実際に操作する）。
//
//   node tests/e2e/run.ts
//
// iPhone の大きさの画面で、最初の循環（戦闘 → 勧誘 → 編成 → 稽古 → 負け → 再挑戦 → 保存 → 開き直し →
// 放置報酬 → セーブの書き出しと読み込み）を通しで操作し、途中でエラーが出ないことを確かめる。
// 壊れたセーブ、新しすぎるセーブ、S0 のころのセーブで開いた場合と、公開用ビルドも確かめる。
//
// 終了コード: 0 = 全部通った、1 = 落ちた項目がある、3 = この環境にはブラウザがなく、実行できない
// 結果: reports/e2e.json、reports/e2e/*.png、pipeline/reports/e2e-last.json（ソースの指紋つき）
//
// このファイルは保護対象。変えるときは理由を示して承認を得ること（pipeline/commands/approve.md）。

import { createServer } from "node:http";
import type { Server } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, devices } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { ROOT, SRC_ROOT, runNode } from "../../scripts/lib/env.ts";
import { sourceHash } from "../../scripts/lib/source-hash.ts";

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];
const SHOTS = path.join(ROOT, "reports", "e2e");
/** 確認用の速度（デバッグ機能）。待ち時間を短くするために使う。 */
const SPEED = 20;

function findChromium(): string | null {
  const fromEnv = process.env["CHROMIUM_PATH"];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const base = process.env["PLAYWRIGHT_BROWSERS_PATH"] ?? "/opt/pw-browsers";
  if (existsSync(base)) {
    for (const name of readdirSync(base).sort().reverse()) {
      if (!/^chromium-\d+$/.test(name)) continue;
      for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
        const exe = path.join(base, name, rel);
        if (existsSync(exe)) return exe;
      }
    }
  }
  for (const exe of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (existsSync(exe)) return exe;
  }
  return null;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".map": "application/json",
};

function serve(dir: string): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
      const file = path.join(dir, rel === "/" ? "index.html" : rel);
      if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

const tid = (id: string): string => `[data-testid="${id}"]`;

interface Opened {
  ctx: BrowserContext;
  page: Page;
  errors: string[];
}

async function open(browser: Browser, url: string, seedSave?: string): Promise<Opened> {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  if (seedSave !== undefined) {
    // 最初の1回だけ、指定のセーブを置く（開き直したときに置き直さないように）
    await ctx.addInitScript((t) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("idle-game.save", t);
        sessionStorage.setItem("seeded", "1");
      }
    }, seedSave);
  }
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e)}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(url);
  await page.waitForSelector(tid("hud-stage"));
  return { ctx, page, errors };
}

async function text(page: Page, id: string): Promise<string> {
  return ((await page.locator(tid(id)).first().textContent()) ?? "").trim();
}

async function tab(page: Page, name: string): Promise<void> {
  await page.locator(tid(`tab-${name}`)).click();
}

async function savedGame(page: Page): Promise<Record<string, unknown> | null> {
  return await page.evaluate(() => {
    try {
      const env = JSON.parse(localStorage.getItem("idle-game.save") ?? "") as { state?: { game?: Record<string, unknown> } };
      return env.state?.game ?? null;
    } catch {
      return null;
    }
  });
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function step(name: string, run: () => Promise<string | void>): Promise<boolean> {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: typeof detail === "string" ? detail : undefined });
    return true;
  } catch (e) {
    results.push({ name, ok: false, detail: (e instanceof Error ? e.message : String(e)).split("\n").slice(0, 4).join(" / ") });
    return false;
  }
}

function expect(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

async function setSpeed(page: Page, speed: number): Promise<void> {
  await tab(page, "other");
  await page.locator(tid(`dbg-speed-${speed}`)).click();
  await tab(page, "journey");
}

// ---------------------------------------------------------------- 本編

async function mainFlow(browser: Browser, url: string): Promise<void> {
  const { ctx, page, errors } = await open(browser, url);

  await step("開くと 1-1 の戦闘が始まり、団員3人が並ぶ", async () => {
    expect((await text(page, "hud-stage")) === "1-1", `いまの面が ${await text(page, "hud-stage")}`);
    await page.waitForSelector(tid("unit-0-2"));
    expect((await page.locator('.frow[data-side="0"] .unit').count()) === 3, "味方が3人ではない");
    expect((await page.locator('.frow[data-side="1"] .unit').count()) >= 1, "敵がいない");
    expect((await text(page, "status-text")).includes("挑戦中"), "挑戦中と出ていない");
    await shot(page, "01-start");
  });

  await step("画面が横にはみ出さず、押す場所が44px以上ある", async () => {
    const m = await page.evaluate(() => {
      const small: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("button"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 43.5 && !el.classList.contains("dbg-chip") && !el.classList.contains("member-main") && !el.classList.contains("notice")) {
          small.push(`${el.dataset["testid"] ?? el.textContent ?? ""}:${Math.round(r.height)}`);
        }
      }
      const tabs = document.getElementById("tabs")?.getBoundingClientRect();
      return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, innerH: window.innerHeight, tabsBottom: tabs?.bottom ?? -1, small };
    });
    expect(m.scrollW <= m.innerW, `横にはみ出している（${m.scrollW} > ${m.innerW}）`);
    expect(m.tabsBottom <= m.innerH + 0.5, "下のタブが画面の外に出ている");
    expect(m.small.length === 0, `小さいボタンがある: ${m.small.join(", ")}`);
  });

  await step("戦闘に勝つと、おひねりが増えて次の面へ進む", async () => {
    await setSpeed(page, SPEED);
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "") !== "1-1", tid("hud-stage"), { timeout: 30_000 });
    expect(Number((await text(page, "hud-gold")).replace(/[^\d]/g, "")) > 0, "おひねりが増えていない");
  });

  await step("チケットが届き、勧誘すると回復役が来て、編成の空きに入れられる", async () => {
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") >= 1, tid("hud-tickets"), { timeout: 60_000 });
    await tab(page, "recruit");
    await shot(page, "02-recruit");
    await page.locator(tid("recruit-button")).click();
    await page.waitForSelector(tid("recruit-result"));
    expect((await text(page, "modal")).includes("衣装係"), "最初の勧誘が衣装係ではない");
    await shot(page, "03-recruit-result");
    await page.waitForTimeout(500);
    await page.locator(tid("place-empty")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    await tab(page, "party");
    expect(!(await text(page, "slot-3")).includes("空き"), "4つ目の枠が空いたまま");
    await shot(page, "04-party");
  });

  await step("編成: 枠を選んで団員を入れると、入れ替わる", async () => {
    const before0 = await text(page, "slot-0");
    const before1 = await text(page, "slot-1");
    await page.locator(tid("slot-0")).click();
    expect((await text(page, "party-guide")).includes("②"), "枠を選んだ案内が出ていない");
    await page.locator(tid("place-h_star")).click();
    const after0 = await text(page, "slot-0");
    const after1 = await text(page, "slot-1");
    expect(after0.includes("花形役者"), `前列1が ${after0}`);
    expect(after0 === before1 && after1 === before0, "2人が入れ替わっていない");
    // 元に戻す（盾役を前列の先頭へ）
    await page.locator(tid("slot-0")).click();
    await page.locator(tid("place-h_stagehand")).click();
    expect((await text(page, "slot-0")).includes("大道具係"), "元に戻せていない");
  });

  await step("団員: 稽古でレベルが上がり、おひねりが減る", async () => {
    await tab(page, "members");
    await page.waitForSelector(`${tid("levelup-h_star")}:not([disabled])`, { timeout: 60_000 });
    const before = Number(await text(page, "member-level-h_star"));
    await page.locator(tid("levelup-h_star")).click();
    await page.waitForFunction((args) => Number(document.querySelector(args.sel)?.textContent ?? "0") === args.want, { sel: tid("member-level-h_star"), want: before + 1 });
    await page.locator(tid("detail-h_star")).click();
    expect((await text(page, "modal")).includes("強打") || (await text(page, "modal")).includes("ダメージ"), "くわしい能力が出ていない");
    await shot(page, "05-member-detail");
    await page.waitForTimeout(500);
    await page.locator(tid("modal-close")).click();
    await shot(page, "06-members");
  });

  await step("負けると進行が止まり、勝てる見込みと再挑戦が出る", async () => {
    await tab(page, "journey");
    await page.waitForSelector(tid("retry-button"), { timeout: 120_000 });
    await page.waitForFunction((sel) => /\d+%/.test(document.querySelector(sel)?.textContent ?? ""), tid("win-chance"), { timeout: 10_000 });
    expect((await text(page, "status-text")).includes("負けました"), "負けたと出ていない");
    expect((await text(page, "status-text")).includes("稽古が足りない"), "「稽古が足りない」と出ていない");
    expect((await text(page, "hint")) !== "", "次にやることの案内が出ていない");
    await setSpeed(page, 1);
    await shot(page, "07-stopped");
    return `見込み: ${await text(page, "win-chance")}`;
  });

  /** 編成の4人のレベルを、押せるだけ上げる（途中でポップアップが出たら、そこでやめる）。 */
  const train = async (rounds: number): Promise<void> => {
    await tab(page, "members");
    for (let round = 0; round < rounds; round++) {
      for (const id of ["h_stagehand", "h_star", "h_sword", "h_costume"]) {
        if ((await page.locator(tid("modal")).count()) > 0) return;
        const b = page.locator(`${tid(`levelup-${id}`)}:not([disabled])`);
        if ((await b.count()) > 0) await b.click({ timeout: 1500 }).catch(() => undefined);
      }
    }
  };

  await step("育ててから再挑戦すると、また挑む", async () => {
    await tab(page, "other");
    for (let i = 0; i < 2; i++) await page.locator(tid("dbg-gold")).click();
    await train(4);
    await tab(page, "journey");
    await page.waitForFunction((sel) => /\d+%/.test(document.querySelector(sel)?.textContent ?? ""), tid("win-chance"), { timeout: 10_000 });
    const chance = await text(page, "win-chance");
    await page.locator(tid("retry-button")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("挑戦中"), tid("status-text"), { timeout: 5_000 });
    expect((await page.locator(tid("retry-button")).count()) === 0, "挑戦中なのに、再挑戦のボタンが残っている");
    return `育てたあとの${chance}`;
  });

  await step("ボスを倒すと、入団の知らせが出て、編成に入れられる", async () => {
    await tab(page, "other");
    for (let i = 0; i < 12; i++) await page.locator(tid("dbg-gold")).click();
    await train(14);
    if ((await page.locator(tid("modal")).count()) === 0) {
      await setSpeed(page, SPEED);
      // 負けて止まったら再挑戦を押しながら、入団の知らせが出るまで進める
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline && (await page.locator(tid("join-result")).count()) === 0) {
        const retry = page.locator(tid("retry-button"));
        if ((await retry.count()) > 0) await retry.click({ timeout: 1000 }).catch(() => undefined);
        await page.waitForTimeout(250);
      }
    }
    await page.waitForSelector(tid("join-result"), { timeout: 1_000 });
    expect((await text(page, "modal")).includes("もりのくま"), "入団したのが もりのくま ではない");
    await shot(page, "08-join");
    await page.waitForTimeout(500);
    await page.locator(tid("goto-party")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    expect((await page.locator(tid("place-m_bear")).count()) === 1, "入団した魔物が編成の一覧にいない");
    await page.locator(tid("slot-3")).click();
    await page.locator(tid("place-m_bear")).click();
    expect((await text(page, "slot-3")).includes("もりのくま"), "入団した魔物を編成に入れられない");
    expect((await text(page, "slot-3")).includes("Lv 1"), "入団した魔物がレベル1ではない");
    await setSpeed(page, 1);
  });

  let before: Record<string, unknown> | null = null;
  await step("開き直しても、進み具合が残っている", async () => {
    await tab(page, "members");
    const level = await text(page, "member-level-h_star");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(300);
    before = await savedGame(page);
    expect(before !== null, "セーブが保存されていない");
    await page.reload();
    await page.waitForSelector(tid("hud-stage"));
    await tab(page, "members");
    expect((await text(page, "member-level-h_star")) === level, "団員のレベルが残っていない");
    const after = await savedGame(page);
    expect(Number(after?.["highestCleared"]) >= Number(before?.["highestCleared"]), "突破した面が減っている");
    expect((await page.locator(tid("member-row-m_bear")).count()) === 1, "入団した魔物がいなくなっている");
    return `突破 ${String(after?.["highestCleared"])}面、花形役者 Lv${level}`;
  });

  await step("時間がたってから開くと、放置報酬が出て、受け取れる", async () => {
    await tab(page, "other");
    await page.locator(tid("dbg-time-1h")).click();
    await page.waitForSelector(tid("offline-result"), { timeout: 5_000 });
    expect((await text(page, "modal")).includes("1時間"), "離れていた時間が出ていない");
    await shot(page, "09-offline");
    const goldBefore = Number((await savedGame(page))?.["gold"] ?? 0);
    await page.waitForTimeout(500);
    await page.locator(tid("offline-claim")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    await page.waitForTimeout(300);
    const g = await savedGame(page);
    expect(Number(g?.["gold"]) > goldBefore, "受け取っても、おひねりが増えていない");
    expect(Number(g?.["idleGold"]) === 0, "放置報酬が残っている");
  });

  await step("放置報酬は、上限（8時間ぶん）で頭打ちになる", async () => {
    await tab(page, "other");
    await page.locator(tid("dbg-time-10h")).click();
    await page.waitForSelector(tid("offline-result"), { timeout: 5_000 });
    expect((await text(page, "modal")).includes("上限"), "上限まで貯まったことが出ていない");
    await page.waitForTimeout(500);
    await page.locator(tid("offline-claim")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
  });

  await step("セーブの書き出しと読み込みができ、壊れた文字は読み込まない", async () => {
    await tab(page, "other");
    await page.locator(tid("export-button")).click();
    const exported = await page.locator(tid("export-area")).inputValue();
    expect(exported.includes("idle-game-save"), "書き出したセーブが空");
    await page.locator(tid("import-area")).fill("これはセーブではない");
    await page.locator(tid("import-button")).click();
    expect((await text(page, "import-message")).includes("読み込めませんでした"), "壊れた文字を読み込んでしまった");
    await page.locator(tid("import-area")).fill(exported);
    await page.locator(tid("import-button")).click();
    expect((await text(page, "import-message")) === "読み込みました。", `読み込めていない: ${await text(page, "import-message")}`);
    await shot(page, "10-other");
  });

  await step("ログに、プレイの記録が入っている", async () => {
    await page.locator(tid("debug-log-button")).click();
    const report = await page.locator(tid("debug-report")).inputValue();
    for (const word of ["プレイの記録", "遊んだ時間", "操作の内訳", "を突破", "デバッグ機能の使用: あり", "--- エラー (0件) ---"]) {
      expect(report.includes(word), `ログに「${word}」がない`);
    }
    await page.locator(".dbg-sheet button.ghost").click();
  });

  await step("ここまで、エラーが1件も出ていない", async () => {
    expect((await page.locator(tid("debug-error-band")).count()) === 0, "エラーの帯が出ている");
    expect(errors.length === 0, errors.slice(0, 3).join(" | "));
  });

  await ctx.close();
}

// ---------------------------------------------------------------- 特別なセーブで開く

async function specialSaves(browser: Browser, url: string): Promise<void> {
  await step("壊れたセーブ: 退避して、最初から遊べる", async () => {
    const { ctx, page, errors } = await open(browser, url, "{こわれた");
    expect((await text(page, "notice")).includes("退避"), "退避したと伝えていない");
    expect((await text(page, "hud-stage")) === "1-1", "最初から始まっていない");
    const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("backup")).map((k) => localStorage.getItem(k)));
    expect(backups.includes("{こわれた"), "壊れたセーブが退避されていない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("新しすぎる版のセーブ: 上書きしない", async () => {
    const tooNew = JSON.stringify({ format: "idle-game-save", version: 99, savedAtMs: 1, state: {} });
    const { ctx, page, errors } = await open(browser, url, tooNew);
    expect((await text(page, "notice")).includes("新しい版"), "新しい版だと伝えていない");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(400);
    expect((await page.evaluate(() => localStorage.getItem("idle-game.save"))) === tooNew, "新しい版のセーブを上書きしてしまった");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("S0 のころのセーブ: 起動の回数を引き継いで、ゲームが始まる", async () => {
    const old = JSON.stringify({ format: "idle-game-save", version: 1, savedAtMs: 1760100000000, state: { version: 1, createdAtMs: 1760000000000, lastSeenAtMs: 1760100000000, opens: 6, taps: 10, rngState: 12345 } });
    const { ctx, page, errors } = await open(browser, url, old);
    expect((await text(page, "hud-stage")) === "1-1", "1-1 から始まっていない");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => (JSON.parse(localStorage.getItem("idle-game.save") ?? "{}") as { state?: { opens?: number; game?: unknown } }).state);
    expect(state?.opens === 7, `起動の回数が ${String(state?.opens)}`);
    expect(state?.game !== undefined, "ゲームの状態が保存されていない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });
}

// ---------------------------------------------------------------- 公開用ビルド

async function releaseBuild(browser: Browser): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "idle-release-"));
  try {
    await step("公開用ビルド: 確認用の機能が入っておらず、ゲームは動く", async () => {
      const built = runNode(["scripts/build.ts", "--release", "--out", dir]);
      expect(built.code === 0, `公開用ビルドに失敗: ${built.err.slice(0, 200)}`);
      const js = readFileSync(path.join(dir, "app.js"), "utf8");
      expect(!js.includes("dbg-sheet") && !js.includes("debug-log-button"), "公開用ビルドに、ログの機能が入っている");
      const { server, url } = await serve(dir);
      try {
        const { ctx, page, errors } = await open(browser, url);
        await page.waitForSelector(tid("unit-0-0"));
        expect((await page.locator(tid("debug-log-button")).count()) === 0, "ログのボタンが出ている");
        await tab(page, "other");
        expect((await page.locator(tid("debug-panel")).count()) === 0, "確認用の機能が出ている");
        expect(errors.length === 0, errors.join(" | "));
        await ctx.close();
      } finally {
        server.close();
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- 実行

const exe = findChromium();
if (exe === null) {
  console.error("この環境にはブラウザがないので、通し操作テストは実行できません（未実行）。");
  process.exit(3);
}
if (!existsSync(path.join(ROOT, "dist/index.html"))) {
  console.error("dist/ にビルドがありません。先にビルドしてください（node scripts/build.ts）。");
  process.exit(1);
}
const buildInfo = JSON.parse(readFileSync(path.join(ROOT, "dist/build.json"), "utf8")) as { buildId?: string; release?: boolean };
if (buildInfo.release === true) {
  console.error("dist/ が公開用ビルドです。確認用のビルドで実行してください（node scripts/build.ts）。");
  process.exit(1);
}

rmSync(SHOTS, { recursive: true, force: true });
const started = Date.now();
const browser = await chromium.launch({ executablePath: exe });
const { server, url } = await serve(path.join(ROOT, "dist"));
try {
  await mainFlow(browser, url);
  await specialSaves(browser, url);
  await releaseBuild(browser);
} catch (e) {
  results.push({ name: "テストの実行そのもの", ok: false, detail: e instanceof Error ? e.message : String(e) });
} finally {
  server.close();
  await browser.close();
}

const ok = results.length > 0 && results.every((r) => r.ok);
console.log("通し操作テスト（iPhone 13 の大きさ、Chromium）");
for (const r of results) {
  console.log(`${r.ok ? "✔" : "✘"} ${r.name}`);
  if (r.detail && !r.ok) console.log(`    ${r.detail}`);
}
console.log(ok ? `通し操作テスト: ${results.length}件すべて合格` : "通し操作テスト: 落ちた項目があります");

const summary = {
  ok,
  at: new Date().toISOString(),
  buildId: buildInfo.buildId ?? "",
  sourceHash: sourceHash(ROOT),
  seconds: Math.round((Date.now() - started) / 1000),
  steps: results,
};
mkdirSync(path.join(ROOT, "reports"), { recursive: true });
writeFileSync(path.join(ROOT, "reports/e2e.json"), JSON.stringify(summary, null, 2) + "\n");
// 出口の検査が読む記録（履歴に残す）。ブラウザのない環境では実行できないので、結果を記録として持ち運ぶ。
const keep = path.join(SRC_ROOT, "pipeline/reports");
mkdirSync(keep, { recursive: true });
writeFileSync(path.join(keep, "e2e-last.json"), JSON.stringify(summary, null, 2) + "\n");
process.exit(ok ? 0 : 1);
