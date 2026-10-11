// 通し操作テスト（本物のブラウザで、画面を実際に操作する）。
//
//   node tests/e2e/run.ts
//
// iPhone の大きさの画面で、最初の循環（挑戦 → ミッション → 勧誘 → 編成 → 稽古 → 箱 → 負け → 再挑戦 → ボス →
// 相棒 → 日課 → 保存 → 開き直し → 放置報酬 → セーブの書き出しと読み込み）を通しで操作し、途中でエラーが出ないことを確かめる。
// 壊れたセーブ、新しすぎるセーブ、S0 のころのセーブ、第1版（build-4 まで）のセーブで開いた場合と、公開用ビルドも確かめる。
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

const ALL_TABS = ["journey", "members", "party", "companions", "recruit", "missions", "other"];

function num(textValue: string): number {
  // 「1.23万」のような表示も数に直す
  const m = /([\d.]+)(万|億)?/.exec(textValue.replace(/,/g, ""));
  if (!m) return 0;
  return Number(m[1]) * (m[2] === "万" ? 10_000 : m[2] === "億" ? 100_000_000 : 1);
}

async function closeModal(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  await page.locator(tid("modal-close")).click();
  await page.waitForSelector(tid("modal"), { state: "detached" });
}

/** 挑戦のボタンを、押せるときに押し続ける。done が true を返したら終わる。 */
async function challengeUntil(page: Page, done: () => Promise<boolean>, timeoutMs: number, what: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await done()) return;
    const b = page.locator(`${tid("challenge-button")}:not([disabled])`);
    if ((await b.count()) > 0) await b.click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(120);
  }
  throw new Error(`時間内に終わらなかった: ${what}`);
}

async function grant(page: Page, testid: string, times: number): Promise<void> {
  await tab(page, "other");
  for (let i = 0; i < times; i++) await page.locator(tid(testid)).click();
}

async function mainFlow(browser: Browser, url: string): Promise<void> {
  const { ctx, page, errors } = await open(browser, url);

  await step("開くと、団員3人と 1-1 の敵が並ぶ。「挑戦」を押すまでは戦わない", async () => {
    expect((await text(page, "hud-stage")) === "1-1", `次の面が ${await text(page, "hud-stage")}`);
    await page.waitForSelector(tid("unit-0-2"));
    expect((await page.locator('.frow[data-side="0"] .unit').count()) === 3, "味方が3人ではない");
    expect((await page.locator('.frow[data-side="1"] .unit').count()) >= 1, "敵がいない");
    expect((await text(page, "challenge-button")).includes("1-1 に挑戦"), "「1-1 に挑戦」のボタンがない");
    await page.waitForTimeout(2500);
    expect((await text(page, "hud-stage")) === "1-1" && (await page.locator(tid("result-win")).count()) === 0, "押していないのに進んだ");
    expect(Number(((await savedGame(page))?.["stats"] as { battles?: number } | undefined)?.battles ?? -1) === 0, "押していないのに戦闘が始まった");
    await shot(page, "01-start");
  });

  await step("どの画面も横にはみ出さず、押す場所が44px以上ある", async () => {
    for (const name of ALL_TABS) {
      await tab(page, name);
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
        const labels = Array.from(document.querySelectorAll<HTMLElement>("#tabs .tab")).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent ?? "");
        return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, innerH: window.innerHeight, tabsBottom: tabs?.bottom ?? -1, small, labels };
      });
      expect(m.scrollW <= m.innerW, `${name}: 横にはみ出している（${m.scrollW} > ${m.innerW}）`);
      expect(m.tabsBottom <= m.innerH + 0.5, `${name}: 下のタブが画面の外に出ている`);
      expect(m.small.length === 0, `${name}: 小さいボタンがある: ${m.small.join(", ")}`);
      expect(m.labels.length === 0, `${name}: タブの文字が切れている: ${m.labels.join(", ")}`);
    }
    await tab(page, "journey");
  });

  await step("挑戦すると戦闘が始まり、勝つと初クリア報酬が入る。自動では次へ進まない", async () => {
    await page.locator(tid("challenge-button")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? "").includes("戦闘中"), tid("status-text"), { timeout: 5_000 });
    expect(await page.locator(tid("challenge-button")).isDisabled(), "戦闘中なのに、挑戦のボタンが押せる");
    await page.waitForTimeout(4000);
    await shot(page, "02-battle");
    await page.waitForSelector(tid("result-win"), { timeout: 90_000 });
    expect((await text(page, "result-win")).includes("1-1 を突破"), "突破したと出ていない");
    expect(num(await text(page, "hud-gold")) > 0, "初クリア報酬のおひねりが入っていない");
    expect((await text(page, "hud-stage")) === "1-2", "次の面が 1-2 になっていない");
    await page.waitForTimeout(3000);
    expect((await text(page, "challenge-button")).includes("次の面（1-2）に挑戦"), "次の面に挑戦するボタンが出ていない");
    expect(Number(((await savedGame(page))?.["stats"] as { battles?: number } | undefined)?.battles ?? -1) === 1, "勝ったあと、勝手に次の戦闘が始まった");
    await shot(page, "03-win");
  });

  await step("ミッションの報酬で勧誘チケットをもらい、勧誘すると回復役が来て、編成の空きに入れられる", async () => {
    expect((await text(page, "goal-mission")).includes("達成"), "旅の画面に、ミッションの達成が出ていない");
    await page.locator(tid("goal-mission")).click();
    await page.waitForSelector(tid("claim-clear-1"));
    await shot(page, "04-missions");
    await page.locator(tid("claim-clear-1")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 1, tid("hud-tickets"), { timeout: 5_000 });
    await tab(page, "recruit");
    await shot(page, "05-recruit");
    await page.locator(tid("recruit-button")).click();
    await page.waitForSelector(tid("recruit-result"));
    expect((await text(page, "modal")).includes("衣装係"), "最初の勧誘が衣装係ではない");
    await shot(page, "06-recruit-result");
    await page.waitForTimeout(500);
    await page.locator(tid("place-empty")).click();
    await page.waitForSelector(tid("modal"), { state: "detached" });
    await tab(page, "party");
    expect(!(await text(page, "slot-3")).includes("空き"), "4つ目の枠が空いたまま");
    expect((await text(page, "slot-companion")).includes("まだいません"), "相棒の枠の案内が出ていない");
    await shot(page, "07-party");
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

  await step("団員: 「稽古」で1つ、「まとめて」と「編成をまとめて稽古」で、上げられるだけ上がる", async () => {
    await tab(page, "members");
    await page.waitForSelector(`${tid("levelup-h_star")}:not([disabled])`, { timeout: 10_000 });
    await page.locator(tid("levelup-h_star")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 2, tid("member-level-h_star"));
    await page.locator(tid("train-party")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") >= 2, tid("member-level-h_costume"));
    expect(await page.locator(tid("train-party")).isDisabled(), "おひねりを使い切ったのに、まだ稽古できる");
    expect(await page.locator(tid("levelmax-h_stagehand")).isDisabled(), "おひねりがないのに、まとめて上げられる");
    // ミッション「勧誘を1回する」の報酬（おひねり）を受け取って、1人をまとめて上げる
    await tab(page, "missions");
    await page.locator(tid("claim-recruit-1")).click();
    await tab(page, "members");
    const level = Number(await text(page, "member-level-h_stagehand"));
    await page.locator(tid("levelmax-h_stagehand")).click();
    await page.waitForFunction((args) => Number(document.querySelector(args.sel)?.textContent ?? "0") >= args.want, { sel: tid("member-level-h_stagehand"), want: level + 2 });
    await page.locator(tid("detail-h_star")).click();
    expect((await text(page, "modal")).includes("ダメージ"), "くわしい能力が出ていない");
    await shot(page, "08-member-detail");
    await closeModal(page);
    await shot(page, "09-members");
  });

  await step("箱: おひねりが時間でたまっていて、受け取れる", async () => {
    await tab(page, "journey");
    await page.waitForFunction((sel) => Number((document.querySelector(sel)?.textContent ?? "0").replace(/[^\d]/g, "")) > 0, tid("idle-gold"), { timeout: 5_000 });
    const a = num(await text(page, "idle-gold"));
    await page.waitForTimeout(2200);
    const b = num(await text(page, "idle-gold"));
    expect(b > a, `開いている間に、箱が増えていない（${a} → ${b}）`);
    const gold = num(await text(page, "hud-gold"));
    await page.locator(tid("idle-claim")).click();
    await page.waitForFunction((args) => Number((document.querySelector(args.sel)?.textContent ?? "0").replace(/[^\d]/g, "")) > args.gold, { sel: tid("hud-gold"), gold }, { timeout: 5_000 });
    expect(Number(((await savedGame(page))?.["counters"] as { idleClaims?: number } | undefined)?.idleClaims ?? 0) === 1, "受け取った回数が記録されていない");
    return `箱: ${a} → ${b}`;
  });

  await step("負けると「稽古が足りない！」と出て、団員の稽古の画面へ行ける。勝てる見込みは出さない", async () => {
    await setSpeed(page, SPEED);
    await challengeUntil(
      page,
      async () => {
        // 育てずに進めて、もしボスまで倒せてしまったら、知らせを閉じて続ける
        if ((await page.locator(tid("companion-result")).count()) > 0) await closeModal(page);
        return (await page.locator(tid("result-defeat")).count()) > 0;
      },
      180_000,
      "育てずに挑み続けて、負ける",
    );
    await setSpeed(page, 1);
    const card = await text(page, "result-defeat");
    expect(card.includes("稽古が足りない！"), "「稽古が足りない！」と出ていない");
    expect((await text(page, "challenge-button")).includes("もう一度"), "もう一度挑戦するボタンが出ていない");
    expect(!(await page.locator("body").innerText()).includes("勝てる見込み"), "勝てる見込みが出ている");
    await shot(page, "10-defeat");
    const stage = await text(page, "hud-stage");
    await page.waitForTimeout(3000);
    expect((await text(page, "hud-stage")) === stage && !(await page.locator(tid("challenge-button")).isDisabled()), "勝手に再挑戦が始まった");
    await page.locator(tid("goto-train")).click();
    await page.waitForSelector(tid("train-party"));
    return `負けた面: ${stage}`;
  });

  await step("稽古してから、もう一度挑むと勝てる", async () => {
    const stage = await text(page, "hud-stage");
    await grant(page, "dbg-gold-big", 2);
    await tab(page, "members");
    await page.locator(tid("train-party")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") >= 20, tid("member-level-h_star"));
    await setSpeed(page, SPEED);
    await page.locator(tid("challenge-button")).click();
    await page.waitForSelector(tid("result-win"), { timeout: 30_000 });
    expect((await text(page, "result-win")).includes(`${stage} を突破`), `${stage} を突破できていない`);
  });

  await step("ボスを倒すと相棒になり、編成に入れると、戦闘の画面に出る", async () => {
    await challengeUntil(page, async () => (await page.locator(tid("companion-result")).count()) > 0 || (await page.locator(tid("companion-row-c_bear")).count()) > 0, 120_000, "1-10 のボスを倒す");
    if ((await page.locator(tid("companion-result")).count()) > 0) {
      expect((await text(page, "modal")).includes("もりのくま"), "相棒になったのが もりのくま ではない");
      await shot(page, "11-companion-join");
      await page.waitForTimeout(500);
      await page.locator(tid("equip-companion")).click();
      await page.waitForSelector(tid("modal"), { state: "detached" });
    } else {
      // 前の手順で、すでに相棒になっていた場合（知らせは閉じてある）
      await tab(page, "companions");
      await page.locator(tid("companion-equip-c_bear")).click();
    }
    await setSpeed(page, 1);
    expect((await text(page, "battle-companion")).includes("もりのくま"), "戦闘の画面に、相棒が出ていない");
    await tab(page, "members");
    expect((await page.locator(tid("member-row-c_bear")).count()) === 0, "相棒が、団員の一覧に入っている");
    await tab(page, "party");
    expect((await text(page, "slot-companion")).includes("もりのくま"), "編成の相棒の枠に入っていない");
    await tab(page, "companions");
    expect((await text(page, "companion-row-c_bear")).includes("編成中"), "相棒の画面で、編成中になっていない");
    expect((await text(page, "companion-total")).includes("体力 +2%"), "底上げの合計が出ていない");
    await shot(page, "12-companions");
  });

  await step("相棒: 専用の素材とおひねりで、レベルが上がり、底上げが伸びる", async () => {
    expect(await page.locator(tid("companion-levelup-c_bear")).isDisabled(), "素材がないのに、レベルを上げられる");
    await grant(page, "dbg-gold-big", 1);
    await grant(page, "dbg-mats", 1);
    await tab(page, "companions");
    await page.locator(tid("companion-levelup-c_bear")).click();
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") === 2, tid("companion-level-c_bear"));
    expect((await text(page, "companion-total")).includes("体力 +4%"), "レベルを上げても、底上げが伸びていない");
    await page.locator(tid("companion-unequip-c_bear")).click();
    await page.waitForSelector(tid("companion-equip-c_bear"));
    expect((await text(page, "companion-total")).includes("体力 +4%"), "編成から外すと、底上げが消えた");
    await page.locator(tid("companion-equip-c_bear")).click();
    await page.waitForSelector(tid("companion-unequip-c_bear"));
  });

  await step("まとめて勧誘すると、結果が一覧で出る", async () => {
    await grant(page, "dbg-ticket", 5);
    await tab(page, "recruit");
    const tickets = Number(await text(page, "recruit-tickets"));
    expect(tickets >= 5, `チケットが ${tickets}枚`);
    await page.locator(tid("recruit-all")).click();
    await page.waitForSelector(tid("recruit-many-result"));
    expect((await page.locator(`${tid("modal")} .rates li`).count()) === Math.min(10, tickets), "結果の行数が、使った枚数と合わない");
    await shot(page, "13-recruit-many");
    await closeModal(page);
    expect(Number(await text(page, "recruit-tickets")) === tickets - Math.min(10, tickets), "チケットが減っていない");
  });

  await step("ミッションと日課: 達成したものを、まとめて受け取れる", async () => {
    await tab(page, "missions");
    await shot(page, "14-missions");
    expect((await text(page, "daily-list")).includes("受け取る"), "達成した日課がない");
    const tickets = Number(await text(page, "hud-tickets"));
    await page.locator(tid("claim-all")).click();
    await page.waitForFunction((sel) => (document.querySelector(sel) as HTMLButtonElement | null)?.disabled === true, tid("claim-all"), { timeout: 5_000 });
    expect(Number(await text(page, "hud-tickets")) > tickets, "報酬の勧誘チケットが入っていない");
    expect((await text(page, "daily-list")).includes("受け取り済み"), "日課が受け取り済みになっていない");
    expect((await page.locator(`${tid("mission-list")} button`).count()) === 0, "受け取れるミッションが残っている");
    await tab(page, "journey");
    await page.waitForTimeout(300);
    await shot(page, "15-journey");
  });

  let before: Record<string, unknown> | null = null;
  await step("開き直しても、進み具合が残っている", async () => {
    await tab(page, "members");
    const level = await text(page, "member-level-h_star");
    before = await savedGame(page);
    expect(before !== null, "セーブが保存されていない");
    await page.reload();
    await page.waitForSelector(tid("hud-stage"));
    await tab(page, "members");
    expect((await text(page, "member-level-h_star")) === level, "団員のレベルが残っていない");
    const after = await savedGame(page);
    expect(Number(after?.["highestCleared"]) === Number(before?.["highestCleared"]), "突破した面が変わっている");
    await tab(page, "companions");
    expect((await text(page, "companion-level-c_bear")) === "2", "相棒のレベルが残っていない");
    expect((await text(page, "companion-row-c_bear")).includes("編成中"), "相棒の編成が残っていない");
    return `突破 ${String(after?.["highestCleared"])}面、花形役者 Lv${level}`;
  });

  await step("時間がたつと、箱におひねりと相棒の素材が貯まり、受け取れる", async () => {
    await tab(page, "journey");
    await page.locator(tid("idle-claim")).click();
    await grant(page, "dbg-time-1h", 1);
    await tab(page, "journey");
    await page.waitForFunction((sel) => Number(document.querySelector(sel)?.textContent ?? "0") >= 6, tid("idle-mats-c_bear"), { timeout: 5_000 });
    expect((await text(page, "idle-box")).includes("はちみつ"), "箱に、相棒の素材の名前が出ていない");
    expect((await page.locator(tid("idle-capped")).count()) === 0, "1時間で、いっぱいになっている");
    await shot(page, "16-box");
    const g0 = await savedGame(page);
    await page.locator(tid("idle-claim")).click();
    await page.waitForTimeout(300);
    const g1 = await savedGame(page);
    expect(Number(g1?.["gold"]) > Number(g0?.["gold"]), "受け取っても、おひねりが増えていない");
    expect(Number((g1?.["materials"] as Record<string, number> | undefined)?.["c_bear"]) >= Number((g0?.["materials"] as Record<string, number> | undefined)?.["c_bear"]) + 6, "受け取っても、相棒の素材が増えていない");
  });

  await step("箱は、上限（8時間ぶん）でいっぱいになる", async () => {
    await grant(page, "dbg-time-10h", 1);
    await tab(page, "journey");
    await page.waitForSelector(tid("idle-capped"), { timeout: 5_000 });
    const a = await text(page, "idle-gold");
    await page.waitForTimeout(2200);
    expect((await text(page, "idle-gold")) === a, "いっぱいなのに、増え続けている");
    expect((await text(page, "idle-mats-c_bear")) === "48", `8時間ぶんの素材は48のはず: ${await text(page, "idle-mats-c_bear")}`);
    await shot(page, "17-box-full");
    await page.locator(tid("idle-claim")).click();
    await page.waitForSelector(tid("idle-capped"), { state: "detached" });
  });

  await step("日付が変わると、日課が入れ替わる", async () => {
    await grant(page, "dbg-time-1d", 1);
    await tab(page, "missions");
    await page.waitForFunction((sel) => !(document.querySelector(sel)?.textContent ?? "").includes("受け取り済み"), tid("daily-list"), { timeout: 5_000 });
    expect((await text(page, "mission-list")) !== "", "ミッションの一覧が消えた");
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
    await shot(page, "18-other");
  });

  await step("ログに、プレイの記録が入っている", async () => {
    await page.locator(tid("debug-log-button")).click();
    const report = await page.locator(tid("debug-report")).inputValue();
    for (const word of ["プレイの記録", "遊んだ時間", "操作の内訳", "を突破", "で負け", "再挑戦:", "箱から受け取り", "ミッション達成", "もりのくま が相棒になる", "デバッグ機能の使用: あり", "--- エラー (0件) ---"]) {
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
    // 箱に少し貯まるのを待ってから受け取る（操作のたびに保存が走るので、それでも上書きしないことを見る）
    await page.waitForTimeout(1500);
    await page.locator(tid("idle-claim")).click();
    await page.waitForTimeout(400);
    expect((await page.evaluate(() => localStorage.getItem("idle-game.save"))) === tooNew, "新しい版のセーブを上書きしてしまった");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("S0 のころのセーブ: 起動の回数を引き継いで、ゲームが始まる", async () => {
    const old = JSON.stringify({ format: "idle-game-save", version: 1, savedAtMs: 1760100000000, state: { version: 1, createdAtMs: 1760000000000, lastSeenAtMs: 1760100000000, opens: 6, taps: 10, rngState: 12345 } });
    const { ctx, page, errors } = await open(browser, url, old);
    expect((await text(page, "hud-stage")) === "1-1", "1-1 から始まっていない");
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => (JSON.parse(localStorage.getItem("idle-game.save") ?? "{}") as { state?: { opens?: number; game?: unknown } }).state);
    expect(state?.opens === 7, `起動の回数が ${String(state?.opens)}`);
    expect(state?.game !== undefined, "ゲームの状態が保存されていない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });

  await step("第1版（build-4 まで）のセーブ: 退避して、最初からになったと伝える", async () => {
    // 2026-10-11 に、ユーザーの iPhone から届いた build-4 のログにあったセーブそのもの
    const v1 = readFileSync(path.join(SRC_ROOT, "tests/fixtures/save-build-4.json"), "utf8").trim();
    const { ctx, page, errors } = await open(browser, url, v1);
    const notice = await text(page, "notice");
    expect(notice.includes("最初から") && notice.includes("退避"), `知らせ: ${notice}`);
    expect((await text(page, "hud-stage")) === "1-1", "最初から始まっていない");
    expect((await text(page, "hud-gold")) === "0", "前の版のおひねりが残っている");
    const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("backup")).map((k) => localStorage.getItem(k)));
    expect(backups.includes(v1), "前の版のセーブが退避されていない");
    await page.waitForTimeout(400);
    const game = await savedGame(page);
    expect(game?.["v"] === 2 && Number(game?.["highestCleared"]) === 0, "新しい作りのゲームとして保存されていない");
    await page.locator(tid("notice")).click();
    expect((await page.locator(tid("notice")).isVisible()) === false, "知らせを閉じられない");
    expect(errors.length === 0, errors.join(" | "));
    await ctx.close();
  });
}

// ---------------------------------------------------------------- 公開用ビルド

async function releaseBuild(browser: Browser): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "idle-release-"));
  try {
    await step("公開用ビルド: 確認用の機能が入っておらず、挑戦して勝てる", async () => {
      const built = runNode(["scripts/build.ts", "--release", "--out", dir]);
      expect(built.code === 0, `公開用ビルドに失敗: ${built.err.slice(0, 200)}`);
      const js = readFileSync(path.join(dir, "app.js"), "utf8");
      expect(!js.includes("dbg-sheet") && !js.includes("debug-log-button") && !js.includes("dbg-gold"), "公開用ビルドに、確認用の機能が入っている");
      const { server, url } = await serve(dir);
      try {
        const { ctx, page, errors } = await open(browser, url);
        await page.waitForSelector(tid("unit-0-0"));
        expect((await page.locator(tid("debug-log-button")).count()) === 0, "ログのボタンが出ている");
        await tab(page, "other");
        expect((await page.locator(tid("debug-panel")).count()) === 0, "確認用の機能が出ている");
        expect((await text(page, "chapters")).includes("第1章"), "旅の記録が出ていない");
        await tab(page, "journey");
        await page.locator(tid("challenge-button")).click();
        await page.waitForSelector(tid("result-win"), { timeout: 90_000 });
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
